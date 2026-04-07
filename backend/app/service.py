from __future__ import annotations

import asyncio
import math
import secrets
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from .missions import (
    MATCH_MISSION_COUNT,
    MAX_VALIDATION_ATTEMPTS,
    TURN_TIME_LIMIT_SECONDS,
    build_match_mission_ids,
    build_validation_message,
    calculate_turn_points,
    get_mission_hint,
    get_public_mission,
    rank_players,
    validate_flow,
)
from .storage import RoomRepository


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def parse_iso_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None

    return datetime.fromisoformat(value)


class RoomService:
    def __init__(self, repository: RoomRepository) -> None:
        self.repository = repository
        self._lock = asyncio.Lock()

    async def create_room(self, player_name: str) -> tuple[dict[str, Any], dict[str, str]]:
        normalized_name = self._normalize_player_name(player_name)

        async with self._lock:
            room_code = self._generate_room_code()
            admin_player = self._build_player(normalized_name)
            now = utc_now_iso()
            room_state = {
                "code": room_code,
                "status": "lobby",
                "adminId": admin_player["id"],
                "players": [admin_player],
                "activeMissionId": None,
                "missionQueue": [],
                "roundIndex": 0,
                "totalRounds": MATCH_MISSION_COUNT,
                "roundStartedAt": None,
                "playerStates": {},
                "turnHistory": {},
                "createdAt": now,
                "updatedAt": now,
            }
            self.repository.create_room(room_state)

        return room_state, self._session_for(admin_player, room_code)

    async def join_room(
        self,
        room_code: str,
        player_name: str,
    ) -> tuple[dict[str, Any], dict[str, str]]:
        normalized_code = room_code.strip().upper()
        normalized_name = self._normalize_player_name(player_name)

        async with self._lock:
            room_state = self._load_room_or_404(normalized_code)

            if room_state["status"] != "lobby":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="La partida ya empezó. No se puede entrar ahora.",
                )

            if len(room_state["players"]) >= 8:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="La sala ya alcanzó el máximo de jugadores.",
                )

            if any(
                player["name"].casefold() == normalized_name.casefold()
                for player in room_state["players"]
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ese nombre ya está usado en la sala.",
                )

            player = self._build_player(normalized_name)
            room_state["players"].append(player)
            room_state["updatedAt"] = utc_now_iso()
            self.repository.save_room(room_state)

        return room_state, self._session_for(player, normalized_code)

    async def start_room(
        self,
        room_code: str,
        player_id: str,
        token: str,
    ) -> dict[str, Any]:
        async with self._lock:
            room_state = self._load_room_or_404(room_code)
            self._authenticate(room_state, player_id, token)
            self._assert_admin(room_state, player_id)

            if room_state["status"] != "lobby":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="La sala ya está en juego.",
                )

            if len(room_state["players"]) < 2:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Se necesitan al menos 2 jugadores para iniciar.",
                )

            mission_queue = build_match_mission_ids(MATCH_MISSION_COUNT)
            mission_id = mission_queue[0]
            now = utc_now_iso()
            room_state["status"] = "playing"
            room_state["activeMissionId"] = mission_id
            room_state["missionQueue"] = mission_queue
            room_state["roundIndex"] = 0
            room_state["totalRounds"] = MATCH_MISSION_COUNT
            room_state["roundStartedAt"] = now
            room_state["playerStates"] = {
                player["id"]: self._build_player_state(mission_id, now)
                for player in room_state["players"]
            }
            room_state["turnHistory"] = {}
            room_state["updatedAt"] = now
            self.repository.save_room(room_state)

        return room_state

    async def validate_turn(
        self,
        room_code: str,
        player_id: str,
        token: str,
        flow_ids: list[str],
    ) -> dict[str, Any]:
        async with self._lock:
            room_state = self._load_room_or_404(room_code)
            self._authenticate(room_state, player_id, token)

            if room_state["status"] != "playing":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No hay una ronda activa para validar.",
                )

            player_state = self._get_player_state(room_state, player_id)
            submitted_started_at = player_state["startedAt"]
            if player_state["isFinished"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya terminaste tu misión en esta ronda.",
                )

            changed = self._expire_overdue_players(room_state)
            if changed:
                self.repository.save_room(room_state)
                refreshed_state = self._get_player_state(room_state, player_id)
                if (
                    refreshed_state["isFinished"]
                    or refreshed_state["startedAt"] != submitted_started_at
                ):
                    return room_state

            player_state = self._get_player_state(room_state, player_id)
            if (
                self._elapsed_seconds_uncapped(player_state["startedAt"])
                > TURN_TIME_LIMIT_SECONDS
            ):
                player_state["attemptsUsed"] = MAX_VALIDATION_ATTEMPTS
                self._finalize_player_result(
                    room_state=room_state,
                    player_id=player_id,
                    flow_ids=[],
                    validation=validate_flow([], player_state["missionId"]),
                    is_correct=False,
                    feedback="Tiempo agotado: la ronda se cerró al llegar al minuto.",
                )
                self.repository.save_room(room_state)
                return room_state

            mission_id = player_state["missionId"]
            validation = validate_flow(flow_ids, mission_id)
            player_state["attemptsUsed"] += 1

            if validation["isCorrect"]:
                self._finalize_player_result(
                    room_state=room_state,
                    player_id=player_id,
                    flow_ids=flow_ids,
                    validation=validation,
                    is_correct=True,
                )
                self.repository.save_room(room_state)
                return room_state

            message = build_validation_message(validation, player_state["attemptsUsed"])

            if player_state["attemptsUsed"] < MAX_VALIDATION_ATTEMPTS:
                player_state["feedback"] = message
                room_state["updatedAt"] = utc_now_iso()
                self.repository.save_room(room_state)
                return room_state

            self._finalize_player_result(
                room_state=room_state,
                player_id=player_id,
                flow_ids=flow_ids,
                validation=validation,
                is_correct=False,
                feedback=f"Intentos agotados: {message}",
            )
            self.repository.save_room(room_state)
            return room_state

    async def use_hint(
        self,
        room_code: str,
        player_id: str,
        token: str,
    ) -> dict[str, Any]:
        async with self._lock:
            room_state = self._load_room_or_404(room_code)
            player = self._authenticate(room_state, player_id, token)

            if room_state["status"] != "playing":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No hay una ronda activa para pedir pista.",
                )

            player_state = self._get_player_state(room_state, player_id)
            requested_started_at = player_state["startedAt"]
            changed = self._expire_overdue_players(room_state)
            player_state = self._get_player_state(room_state, player_id)
            if changed and player_state["startedAt"] != requested_started_at:
                self.repository.save_room(room_state)
                return room_state
            if player_state["isFinished"]:
                if changed:
                    self.repository.save_room(room_state)
                    return room_state
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya terminaste tu misión en esta ronda.",
                )

            if not player_state["hintUsed"]:
                player_state["hintUsed"] = True
                player_state["hintText"] = get_mission_hint(player_state["missionId"])
                player["hintsUsed"] += 1
                room_state["updatedAt"] = utc_now_iso()
                changed = True

            if changed:
                self.repository.save_room(room_state)

            return room_state

    async def restart_room(
        self,
        room_code: str,
        player_id: str,
        token: str,
    ) -> dict[str, Any]:
        async with self._lock:
            room_state = self._load_room_or_404(room_code)
            self._authenticate(room_state, player_id, token)
            self._assert_admin(room_state, player_id)

            for player in room_state["players"]:
                player["score"] = 0
                player["totalTime"] = 0
                player["turnsCompleted"] = 0
                player["solvedMissions"] = 0
                player["hintsUsed"] = 0

            room_state["status"] = "lobby"
            room_state["activeMissionId"] = None
            room_state["missionQueue"] = []
            room_state["roundIndex"] = 0
            room_state["totalRounds"] = MATCH_MISSION_COUNT
            room_state["roundStartedAt"] = None
            room_state["playerStates"] = {}
            room_state["turnHistory"] = {}
            room_state["updatedAt"] = utc_now_iso()
            self.repository.save_room(room_state)

        return room_state

    async def sync_room_progress(self, room_code: str) -> dict[str, Any] | None:
        async with self._lock:
            room_state = self._load_room_or_404(room_code)
            if not self._expire_overdue_players(room_state):
                return None

            self.repository.save_room(room_state)
            return room_state

    def get_room_state(self, room_code: str) -> dict[str, Any] | None:
        room_state = self.repository.get_room(room_code.strip().upper())
        if room_state is None:
            return None

        normalized_state = self._normalize_room_state(room_state)
        if normalized_state != room_state:
            self.repository.save_room(normalized_state)

        return normalized_state

    def get_snapshot(
        self,
        room_code: str,
        player_id: str,
        token: str,
        online_ids: set[str],
    ) -> dict[str, Any]:
        room_state = self._load_room_or_404(room_code)
        self._authenticate(room_state, player_id, token)
        return self.build_snapshot(room_state, player_id, online_ids)

    def build_snapshot(
        self,
        room_state: dict[str, Any],
        viewer_id: str,
        online_ids: set[str],
    ) -> dict[str, Any]:
        viewer = self._get_player(room_state, viewer_id)
        player_states: dict[str, dict[str, Any]] = room_state.get("playerStates", {})
        viewer_state = player_states.get(viewer_id)
        ranked_players = rank_players(room_state["players"])

        completed_players = sum(
            1 for state in player_states.values() if state.get("isFinished")
        )
        total_players = len(room_state["players"])

        round_snapshot = None
        if room_state["status"] in {"playing", "finished"}:
            round_snapshot = {
                "startedAt": room_state["roundStartedAt"],
                "totalPlayers": total_players,
                "completedPlayers": completed_players,
                "remainingPlayers": max(0, total_players - completed_players),
                "roundNumber": min(
                    room_state.get("roundIndex", 0) + 1,
                    room_state.get("totalRounds", MATCH_MISSION_COUNT),
                ),
                "totalRounds": room_state.get("totalRounds", MATCH_MISSION_COUNT),
                "timeLimitSeconds": TURN_TIME_LIMIT_SECONDS,
            }

        mission = None
        my_state = None
        my_result = None

        if viewer_state is not None:
            my_state = {
                "startedAt": viewer_state["startedAt"],
                "attemptsUsed": viewer_state["attemptsUsed"],
                "attemptsRemaining": max(
                    0, MAX_VALIDATION_ATTEMPTS - viewer_state["attemptsUsed"]
                ),
                "isFinished": viewer_state["isFinished"],
                "feedback": viewer_state["feedback"],
                "hintUsed": viewer_state.get("hintUsed", False),
                "hintText": viewer_state.get("hintText"),
            }
            my_result = viewer_state["result"]

            if (
                room_state["status"] == "playing"
                and not viewer_state["isFinished"]
                and viewer_state["missionId"] is not None
            ):
                mission = get_public_mission(viewer_state["missionId"])

        players_snapshot = [
            {
                "id": player["id"],
                "name": player["name"],
                "score": player["score"],
                "totalTime": player["totalTime"],
                "turnsCompleted": player["turnsCompleted"],
                "solvedMissions": player["solvedMissions"],
                "hintsUsed": player.get("hintsUsed", 0),
                "isAdmin": player["id"] == room_state["adminId"],
                "isOnline": player["id"] in online_ids,
                "isFinished": player_states.get(player["id"], {}).get("isFinished", False),
            }
            for player in ranked_players
        ]

        me_snapshot = next(
            player for player in players_snapshot if player["id"] == viewer["id"]
        )
        winner_id = players_snapshot[0]["id"] if room_state["status"] == "finished" else None

        return {
            "roomCode": room_state["code"],
            "status": room_state["status"],
            "isAdmin": viewer_id == room_state["adminId"],
            "canStart": (
                room_state["status"] == "lobby"
                and viewer_id == room_state["adminId"]
                and len(room_state["players"]) >= 2
            ),
            "canRestart": viewer_id == room_state["adminId"],
            "me": me_snapshot,
            "players": players_snapshot,
            "playerCount": len(players_snapshot),
            "round": round_snapshot,
            "mission": mission,
            "myState": my_state,
            "myResult": my_result,
            "winnerId": winner_id,
        }

    def _build_player(self, name: str) -> dict[str, Any]:
        return {
            "id": f"player_{secrets.token_hex(6)}",
            "token": secrets.token_urlsafe(24),
            "name": name,
            "score": 0,
            "totalTime": 0,
            "turnsCompleted": 0,
            "solvedMissions": 0,
            "hintsUsed": 0,
            "joinedAt": utc_now_iso(),
        }

    def _build_player_state(self, mission_id: str, started_at: str) -> dict[str, Any]:
        return {
            "missionId": mission_id,
            "startedAt": started_at,
            "attemptsUsed": 0,
            "feedback": "",
            "hintUsed": False,
            "hintText": None,
            "result": None,
            "isFinished": False,
            "completedAt": None,
        }

    def _session_for(self, player: dict[str, Any], room_code: str) -> dict[str, str]:
        return {
            "roomCode": room_code,
            "playerId": player["id"],
            "token": player["token"],
        }

    def _generate_room_code(self) -> str:
        alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

        while True:
            room_code = "".join(secrets.choice(alphabet) for _ in range(6))
            if self.repository.get_room(room_code) is None:
                return room_code

    def _load_room_or_404(self, room_code: str) -> dict[str, Any]:
        normalized_code = room_code.strip().upper()
        room_state = self.repository.get_room(normalized_code)

        if room_state is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La sala no existe.",
            )

        normalized_state = self._normalize_room_state(room_state)
        if normalized_state != room_state:
            self.repository.save_room(normalized_state)

        return normalized_state

    def _normalize_room_state(self, room_state: dict[str, Any]) -> dict[str, Any]:
        normalized_players = [
            {
                **player,
                "hintsUsed": player.get("hintsUsed", 0),
            }
            for player in room_state["players"]
        ]

        if (
            "activeMissionId" in room_state
            and "missionQueue" in room_state
            and "roundIndex" in room_state
            and "totalRounds" in room_state
            and "roundStartedAt" in room_state
            and "playerStates" in room_state
        ):
            normalized_player_states = {
                player_id: {
                    **player_state,
                    "hintUsed": player_state.get("hintUsed", False),
                    "hintText": player_state.get("hintText"),
                }
                for player_id, player_state in room_state["playerStates"].items()
            }

            return {
                **room_state,
                "players": normalized_players,
                "playerStates": normalized_player_states,
                "totalRounds": room_state.get("totalRounds", MATCH_MISSION_COUNT),
            }

        # Migrates rooms from the older sequential-turn schema to a safe lobby state.
        return {
            "code": room_state["code"],
            "status": "lobby",
            "adminId": room_state["adminId"],
            "players": normalized_players,
            "activeMissionId": None,
            "missionQueue": [],
            "roundIndex": 0,
            "totalRounds": MATCH_MISSION_COUNT,
            "roundStartedAt": None,
            "playerStates": {},
            "turnHistory": {},
            "createdAt": room_state.get("createdAt", utc_now_iso()),
            "updatedAt": utc_now_iso(),
        }

    def _authenticate(
        self,
        room_state: dict[str, Any],
        player_id: str,
        token: str,
    ) -> dict[str, Any]:
        player = self._get_player(room_state, player_id)
        if player["token"] != token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sesión inválida para esta sala.",
            )

        return player

    def _assert_admin(self, room_state: dict[str, Any], player_id: str) -> None:
        if room_state["adminId"] != player_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el admin puede hacer eso.",
            )

    def _elapsed_seconds(self, started_at: str | None) -> int:
        started_at_dt = parse_iso_datetime(started_at)
        if started_at_dt is None:
            return 1

        elapsed = math.ceil((datetime.now(UTC) - started_at_dt).total_seconds())
        return max(1, min(TURN_TIME_LIMIT_SECONDS, elapsed))

    def _expire_overdue_players(self, room_state: dict[str, Any]) -> bool:
        if room_state["status"] != "playing":
            return False

        active_mission_id = room_state["activeMissionId"]
        expired_player_ids = [
            player_id
            for player_id, player_state in room_state["playerStates"].items()
            if (
                not player_state.get("isFinished")
                and self._elapsed_seconds_uncapped(player_state["startedAt"])
                > TURN_TIME_LIMIT_SECONDS
            )
        ]

        changed = False
        for expired_player_id in expired_player_ids:
            player_state = room_state["playerStates"].get(expired_player_id)
            if player_state is None or player_state.get("isFinished"):
                continue

            player_state["attemptsUsed"] = MAX_VALIDATION_ATTEMPTS
            self._finalize_player_result(
                room_state=room_state,
                player_id=expired_player_id,
                flow_ids=[],
                validation=validate_flow([], player_state["missionId"]),
                is_correct=False,
                feedback="Tiempo agotado: no se registró una respuesta válida antes del minuto.",
            )
            changed = True

            if (
                room_state["status"] != "playing"
                or room_state["activeMissionId"] != active_mission_id
            ):
                break

        return changed

    def _elapsed_seconds_uncapped(self, started_at: str | None) -> int:
        started_at_dt = parse_iso_datetime(started_at)
        if started_at_dt is None:
            return 1

        elapsed = math.ceil((datetime.now(UTC) - started_at_dt).total_seconds())
        return max(1, elapsed)

    def _advance_round_if_needed(self, room_state: dict[str, Any]) -> None:
        if not all(state.get("isFinished") for state in room_state["playerStates"].values()):
            return

        next_round_index = room_state.get("roundIndex", 0) + 1
        total_rounds = room_state.get("totalRounds", MATCH_MISSION_COUNT)

        if next_round_index < total_rounds:
            next_mission_id = room_state["missionQueue"][next_round_index]
            now = utc_now_iso()
            room_state["roundIndex"] = next_round_index
            room_state["activeMissionId"] = next_mission_id
            room_state["roundStartedAt"] = now
            room_state["playerStates"] = {
                player["id"]: self._build_player_state(next_mission_id, now)
                for player in room_state["players"]
            }
            room_state["updatedAt"] = now
            return

        room_state["status"] = "finished"
        room_state["updatedAt"] = utc_now_iso()

    def _get_player(self, room_state: dict[str, Any], player_id: str) -> dict[str, Any]:
        for player in room_state["players"]:
            if player["id"] == player_id:
                return player

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jugador no encontrado dentro de la sala.",
        )

    def _get_player_state(
        self,
        room_state: dict[str, Any],
        player_id: str,
    ) -> dict[str, Any]:
        player_state = room_state.get("playerStates", {}).get(player_id)
        if player_state is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La ronda activa no tiene progreso para este jugador.",
            )

        return player_state

    def _normalize_player_name(self, name: str) -> str:
        normalized = " ".join(name.strip().split())
        if not normalized:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El nombre del jugador es obligatorio.",
            )

        if len(normalized) > 24:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El nombre debe tener máximo 24 caracteres.",
            )

        return normalized

    def _finalize_player_result(
        self,
        *,
        room_state: dict[str, Any],
        player_id: str,
        flow_ids: list[str],
        validation: dict[str, Any],
        is_correct: bool,
        feedback: str | None = None,
    ) -> None:
        player = self._get_player(room_state, player_id)
        player_state = self._get_player_state(room_state, player_id)
        elapsed_seconds = self._elapsed_seconds(player_state["startedAt"])

        attempts_used = player_state["attemptsUsed"]
        points_earned = calculate_turn_points(
            is_correct=is_correct,
            time_used=elapsed_seconds,
            attempts_used=attempts_used,
            validation=validation,
        )

        player["score"] += points_earned
        player["totalTime"] += elapsed_seconds
        player["turnsCompleted"] += 1
        if is_correct:
            player["solvedMissions"] += 1

        result = {
            "playerId": player["id"],
            "playerName": player["name"],
            "missionId": player_state["missionId"],
            "missionTitle": get_public_mission(player_state["missionId"])["title"],
            "isCorrect": is_correct,
            "pointsEarned": points_earned,
            "timeUsed": elapsed_seconds,
            "attemptsUsed": attempts_used,
            "feedback": feedback
            or (
                "Flujo validado sin errores. Bonus de rapidez aplicado."
                if is_correct and attempts_used == 1
                else (
                    "Flujo corregido y validado. Se aplicó penalización por reintento."
                    if is_correct
                    else "La ronda terminó con un flujo incorrecto."
                )
            ),
            "finalSequence": flow_ids,
            "accumulatedScore": player["score"],
        }

        player_state["feedback"] = ""
        player_state["result"] = result
        player_state["isFinished"] = True
        player_state["completedAt"] = utc_now_iso()

        room_state["turnHistory"].setdefault(player_id, []).append(result)
        room_state["updatedAt"] = utc_now_iso()
        self._advance_round_if_needed(room_state)

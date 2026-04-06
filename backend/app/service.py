from __future__ import annotations

import asyncio
import math
import secrets
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from .missions import (
    MAX_VALIDATION_ATTEMPTS,
    build_validation_message,
    calculate_turn_points,
    choose_random_mission_id,
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

            mission_id = choose_random_mission_id()
            now = utc_now_iso()
            room_state["status"] = "playing"
            room_state["activeMissionId"] = mission_id
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
            if player_state["isFinished"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya terminaste tu misión en esta ronda.",
                )

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

            room_state["status"] = "lobby"
            room_state["activeMissionId"] = None
            room_state["roundStartedAt"] = None
            room_state["playerStates"] = {}
            room_state["turnHistory"] = {}
            room_state["updatedAt"] = utc_now_iso()
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
            "joinedAt": utc_now_iso(),
        }

    def _build_player_state(self, mission_id: str, started_at: str) -> dict[str, Any]:
        return {
            "missionId": mission_id,
            "startedAt": started_at,
            "attemptsUsed": 0,
            "feedback": "",
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
        if (
            "activeMissionId" in room_state
            and "roundStartedAt" in room_state
            and "playerStates" in room_state
        ):
            return room_state

        # Migrates rooms from the older sequential-turn schema to a safe lobby state.
        return {
            "code": room_state["code"],
            "status": "lobby",
            "adminId": room_state["adminId"],
            "players": room_state["players"],
            "activeMissionId": None,
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
        started_at = parse_iso_datetime(player_state["startedAt"])
        now = datetime.now(UTC)
        elapsed_seconds = 1

        if started_at is not None:
            elapsed_seconds = max(1, math.ceil((now - started_at).total_seconds()))

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

        if all(state.get("isFinished") for state in room_state["playerStates"].values()):
            room_state["status"] = "finished"

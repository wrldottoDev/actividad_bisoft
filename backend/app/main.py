from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .service import RoomService
from .storage import RoomRepository
from .ws_manager import ConnectionManager

app = FastAPI(title="Endpoint Heist API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

repository = RoomRepository(Path("backend/data/endpoint_heist.db"))
room_service = RoomService(repository)
connection_manager = ConnectionManager()


class CreateRoomRequest(BaseModel):
    name: str = Field(min_length=1, max_length=24)


class JoinRoomRequest(BaseModel):
    roomCode: str = Field(min_length=4, max_length=12)
    name: str = Field(min_length=1, max_length=24)


class AuthRequest(BaseModel):
    playerId: str = Field(min_length=1)
    token: str = Field(min_length=1)


class ValidateTurnRequest(AuthRequest):
    flowIds: list[str] = Field(default_factory=list, max_length=10)


async def broadcast_room(room_state: dict) -> None:
    room_code = room_state["code"]
    await connection_manager.broadcast_room(
        room_state,
        lambda viewer_id: room_service.build_snapshot(
            room_state,
            viewer_id,
            connection_manager.online_ids(room_code),
        ),
    )


@app.get("/api/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/rooms")
async def create_room(payload: CreateRoomRequest) -> dict:
    room_state, session = await room_service.create_room(payload.name)
    room = room_service.build_snapshot(
        room_state,
        session["playerId"],
        {session["playerId"]},
    )
    return {"session": session, "room": room}


@app.post("/api/rooms/join")
async def join_room(payload: JoinRoomRequest) -> dict:
    room_state, session = await room_service.join_room(payload.roomCode, payload.name)
    room = room_service.build_snapshot(
        room_state,
        session["playerId"],
        connection_manager.online_ids(room_state["code"]) | {session["playerId"]},
    )
    await broadcast_room(room_state)
    return {"session": session, "room": room}


@app.get("/api/rooms/{room_code}")
async def get_room(
    room_code: str,
    player_id: str = Query(alias="playerId"),
    token: str = Query(),
) -> dict:
    room = room_service.get_snapshot(
        room_code,
        player_id,
        token,
        connection_manager.online_ids(room_code.strip().upper()) | {player_id},
    )
    return {"room": room}


@app.post("/api/rooms/{room_code}/start")
async def start_room(room_code: str, payload: AuthRequest) -> dict:
    room_state = await room_service.start_room(room_code, payload.playerId, payload.token)
    await broadcast_room(room_state)
    room = room_service.build_snapshot(
        room_state,
        payload.playerId,
        connection_manager.online_ids(room_state["code"]) | {payload.playerId},
    )
    return {"room": room}


@app.post("/api/rooms/{room_code}/validate")
async def validate_turn(room_code: str, payload: ValidateTurnRequest) -> dict:
    room_state = await room_service.validate_turn(
        room_code,
        payload.playerId,
        payload.token,
        payload.flowIds,
    )
    await broadcast_room(room_state)
    room = room_service.build_snapshot(
        room_state,
        payload.playerId,
        connection_manager.online_ids(room_state["code"]) | {payload.playerId},
    )
    return {"room": room}


@app.post("/api/rooms/{room_code}/hint")
async def use_hint(room_code: str, payload: AuthRequest) -> dict:
    room_state = await room_service.use_hint(room_code, payload.playerId, payload.token)
    await broadcast_room(room_state)
    room = room_service.build_snapshot(
        room_state,
        payload.playerId,
        connection_manager.online_ids(room_state["code"]) | {payload.playerId},
    )
    return {"room": room}


@app.post("/api/rooms/{room_code}/restart")
async def restart_room(room_code: str, payload: AuthRequest) -> dict:
    room_state = await room_service.restart_room(room_code, payload.playerId, payload.token)
    await broadcast_room(room_state)
    room = room_service.build_snapshot(
        room_state,
        payload.playerId,
        connection_manager.online_ids(room_state["code"]) | {payload.playerId},
    )
    return {"room": room}


@app.websocket("/ws/rooms/{room_code}")
async def room_websocket(
    websocket: WebSocket,
    room_code: str,
    player_id: str = Query(alias="playerId"),
    token: str = Query(),
) -> None:
    normalized_code = room_code.strip().upper()

    try:
        room_state = room_service.get_room_state(normalized_code)
        if room_state is None:
            await websocket.close(code=4404)
            return

        room_service.get_snapshot(
            normalized_code,
            player_id,
            token,
            connection_manager.online_ids(normalized_code) | {player_id},
        )
    except Exception:
        await websocket.close(code=4403)
        return

    await connection_manager.connect(normalized_code, player_id, websocket)

    latest_room = room_service.get_room_state(normalized_code)
    if latest_room is not None:
        await connection_manager.send_room(
            normalized_code,
            player_id,
            {
                "type": "room.updated",
                "room": room_service.build_snapshot(
                    latest_room,
                    player_id,
                    connection_manager.online_ids(normalized_code),
                ),
            },
        )
        await broadcast_room(latest_room)

    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                payload = json.loads(raw_message)
            except json.JSONDecodeError:
                continue

            if payload.get("type") == "ping":
                room_state = await room_service.sync_room_progress(normalized_code)
                if room_state is not None:
                    await broadcast_room(room_state)
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        connection_manager.disconnect(normalized_code, player_id)
        room_state = room_service.get_room_state(normalized_code)
        if room_state is not None:
            await broadcast_room(room_state)

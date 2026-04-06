from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[str, dict[str, WebSocket]] = defaultdict(dict)

    async def connect(self, room_code: str, player_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms[room_code][player_id] = websocket

    def disconnect(self, room_code: str, player_id: str) -> None:
        room_connections = self._rooms.get(room_code)
        if room_connections is None:
            return

        room_connections.pop(player_id, None)
        if not room_connections:
            self._rooms.pop(room_code, None)

    def online_ids(self, room_code: str) -> set[str]:
        return set(self._rooms.get(room_code, {}).keys())

    async def send_room(
        self,
        room_code: str,
        player_id: str,
        payload: dict[str, Any],
    ) -> None:
        websocket = self._rooms.get(room_code, {}).get(player_id)
        if websocket is None:
            return

        await websocket.send_json(payload)

    async def broadcast_room(
        self,
        room_state: dict[str, Any],
        snapshot_builder: Callable[[str], dict[str, Any]],
    ) -> None:
        room_code = room_state["code"]
        room_connections = self._rooms.get(room_code, {})
        stale_player_ids: list[str] = []

        for player_id, websocket in list(room_connections.items()):
            try:
                await websocket.send_json(
                    {
                        "type": "room.updated",
                        "room": snapshot_builder(player_id),
                    }
                )
            except Exception:
                stale_player_ids.append(player_id)

        for player_id in stale_player_ids:
            self.disconnect(room_code, player_id)

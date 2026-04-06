from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


class RoomRepository:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS rooms (
                    code TEXT PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def create_room(self, room_state: dict[str, Any]) -> None:
        serialized = json.dumps(room_state)

        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO rooms (code, state_json, updated_at)
                VALUES (?, ?, ?)
                """,
                (room_state["code"], serialized, room_state["updatedAt"]),
            )

    def get_room(self, room_code: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT state_json FROM rooms WHERE code = ?",
                (room_code,),
            ).fetchone()

        if row is None:
            return None

        return json.loads(row["state_json"])

    def save_room(self, room_state: dict[str, Any]) -> None:
        serialized = json.dumps(room_state)

        with self._connect() as connection:
            connection.execute(
                """
                UPDATE rooms
                SET state_json = ?, updated_at = ?
                WHERE code = ?
                """,
                (serialized, room_state["updatedAt"], room_state["code"]),
            )

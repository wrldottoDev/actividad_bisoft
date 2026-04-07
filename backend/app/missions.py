from __future__ import annotations

import random
from copy import deepcopy
from typing import Any

MAX_VALIDATION_ATTEMPTS = 2
BASE_POINTS = 100
SECOND_ATTEMPT_PENALTY = 20
INVALID_FLOW_PENALTY = 20
MAX_SPEED_BONUS = 40
MATCH_MISSION_COUNT = 3
TURN_TIME_LIMIT_SECONDS = 60

BLOCK_CATALOG: dict[str, dict[str, str]] = {
    "getMe": {"id": "get-me", "type": "GET", "label": "GET /me"},
    "getProducts": {
        "id": "get-products",
        "type": "GET",
        "label": "GET /products",
    },
    "postLogin": {"id": "post-login", "type": "POST", "label": "POST /login"},
    "postUsers": {"id": "post-users", "type": "POST", "label": "POST /users"},
    "postOrders": {
        "id": "post-orders",
        "type": "POST",
        "label": "POST /orders",
    },
    "putUsers": {"id": "put-users", "type": "PUT", "label": "PUT /users/:id"},
    "deleteProducts": {
        "id": "delete-products",
        "type": "DELETE",
        "label": "DELETE /products/:id",
    },
    "jwt": {"id": "jwt", "type": "JWT", "label": "JWT"},
    "headers": {"id": "headers", "type": "HEADERS", "label": "Headers"},
    "body": {"id": "body-json", "type": "BODY", "label": "Body JSON"},
}


def _pick_blocks(*keys: str) -> list[dict[str, str]]:
    return [deepcopy(BLOCK_CATALOG[key]) for key in keys]


MISSIONS: list[dict[str, Any]] = [
    {
        "id": "mission-login-profile",
        "title": "Login y perfil",
        "description": "Obtén acceso y consulta el perfil del usuario.",
        "hint": "Primero necesitas autenticarte, luego usar el token y al final consultar el perfil.",
        "difficulty": "Quick",
        "correctSequence": ["post-login", "jwt", "get-me"],
        "availableBlocks": _pick_blocks(
            "postLogin",
            "jwt",
            "getMe",
            "getProducts",
            "headers",
        ),
    },
    {
        "id": "mission-products-order",
        "title": "Productos y orden",
        "description": "Explora el catálogo y crea una orden válida.",
        "hint": "Antes de crear la orden debes revisar el catálogo, y la creación requiere payload.",
        "difficulty": "Quick",
        "correctSequence": ["get-products", "post-orders", "body-json"],
        "availableBlocks": _pick_blocks(
            "getProducts",
            "postOrders",
            "body",
            "postLogin",
            "jwt",
        ),
    },
    {
        "id": "mission-register-login-profile",
        "title": "Registro completo",
        "description": "Registra al usuario, inicia sesión y consulta su perfil.",
        "hint": "Empieza creando el usuario, después autentica la sesión y termina consultando el perfil.",
        "difficulty": "Tactical",
        "correctSequence": ["post-users", "post-login", "jwt", "get-me"],
        "availableBlocks": _pick_blocks(
            "postUsers",
            "postLogin",
            "jwt",
            "getMe",
            "getProducts",
            "body",
        ),
    },
    {
        "id": "mission-update-user",
        "title": "Actualizar usuario",
        "description": "Autentica la sesión y actualiza los datos del usuario.",
        "hint": "La actualización necesita sesión válida y, además del endpoint, debes enviar metadatos y contenido.",
        "difficulty": "Tactical",
        "correctSequence": [
            "post-login",
            "jwt",
            "put-users",
            "headers",
            "body-json",
        ],
        "availableBlocks": _pick_blocks(
            "postLogin",
            "jwt",
            "putUsers",
            "headers",
            "body",
            "getMe",
        ),
    },
    {
        "id": "mission-secure-order",
        "title": "Orden autenticada",
        "description": "Inicia sesión y crea una orden enviando el payload correcto.",
        "hint": "La orden es protegida: autentica primero y luego envía tanto headers como body.",
        "difficulty": "Tactical",
        "correctSequence": [
            "post-login",
            "jwt",
            "post-orders",
            "headers",
            "body-json",
        ],
        "availableBlocks": _pick_blocks(
            "postLogin",
            "jwt",
            "postOrders",
            "headers",
            "body",
            "deleteProducts",
        ),
    },
]

MISSIONS_BY_ID = {mission["id"]: mission for mission in MISSIONS}


def build_mission_queue(player_count: int) -> list[str]:
    queue: list[str] = []
    available = random.sample(MISSIONS, k=len(MISSIONS))

    while len(queue) < player_count:
        if not available:
            available = random.sample(MISSIONS, k=len(MISSIONS))

        queue.append(available.pop(0)["id"])

    return queue


def get_public_mission(mission_id: str) -> dict[str, Any]:
    mission = MISSIONS_BY_ID[mission_id]

    return {
        "id": mission["id"],
        "title": mission["title"],
        "description": mission["description"],
        "difficulty": mission["difficulty"],
        "availableBlocks": deepcopy(mission["availableBlocks"]),
    }


def validate_flow(flow_ids: list[str], mission_id: str) -> dict[str, Any]:
    required = MISSIONS_BY_ID[mission_id]["correctSequence"]
    missing_count = sum(1 for block_id in required if block_id not in flow_ids)
    extra_count = sum(1 for block_id in flow_ids if block_id not in required)

    misplaced_count = 0
    for index in range(min(len(flow_ids), len(required))):
        if flow_ids[index] != required[index]:
            misplaced_count += 1

    return {
        "isCorrect": (
            len(flow_ids) == len(required)
            and missing_count == 0
            and extra_count == 0
            and misplaced_count == 0
        ),
        "missingCount": missing_count,
        "extraCount": extra_count,
        "misplacedCount": misplaced_count,
        "requiredLength": len(required),
        "currentLength": len(flow_ids),
    }


def _join_issues(parts: list[str]) -> str:
    if len(parts) == 1:
        return parts[0]

    if len(parts) == 2:
        return f"{parts[0]} y {parts[1]}"

    return f"{', '.join(parts[:-1])} y {parts[-1]}"


def build_validation_message(validation: dict[str, Any], attempts_used: int) -> str:
    if validation["currentLength"] == 0:
        return "Arrastra al menos un bloque al flujo."

    issues: list[str] = []

    if validation["missingCount"] > 0:
        suffix = "" if validation["missingCount"] == 1 else "s"
        issues.append(f"faltan {validation['missingCount']} bloque{suffix}")

    if validation["extraCount"] > 0:
        suffix = "" if validation["extraCount"] == 1 else "s"
        issues.append(f"sobran {validation['extraCount']} bloque{suffix}")

    if validation["misplacedCount"] > 0:
        issues.append("el orden no coincide")

    remaining_attempts = MAX_VALIDATION_ATTEMPTS - attempts_used
    summary = _join_issues(issues) if issues else "el flujo no coincide"

    if remaining_attempts > 0:
        suffix = "" if remaining_attempts == 1 else "s"
        return f"{summary}. Te queda {remaining_attempts} intento{suffix}."

    return f"{summary}."


def calculate_turn_points(
    *,
    is_correct: bool,
    time_used: int,
    attempts_used: int,
    validation: dict[str, Any],
) -> int:
    if is_correct:
        speed_bonus = max(0, MAX_SPEED_BONUS - min(time_used, MAX_SPEED_BONUS))
        retry_penalty = max(0, attempts_used - 1) * SECOND_ATTEMPT_PENALTY
        return BASE_POINTS + speed_bonus - retry_penalty

    error_penalty = (
        validation["missingCount"] * 12
        + validation["extraCount"] * 10
        + validation["misplacedCount"] * 8
    )
    return -(INVALID_FLOW_PENALTY + error_penalty)


def rank_players(players: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        players,
        key=lambda player: (
            -player["score"],
            player["totalTime"],
            -player["solvedMissions"],
            player["name"].casefold(),
        ),
    )


def choose_random_mission_id() -> str:
    return random.choice(MISSIONS)["id"]


def build_match_mission_ids(round_count: int) -> list[str]:
    if round_count <= len(MISSIONS):
        sampled = random.sample(MISSIONS, k=round_count)
        return [mission["id"] for mission in sampled]

    queue: list[str] = []
    while len(queue) < round_count:
        queue.extend(mission["id"] for mission in random.sample(MISSIONS, k=len(MISSIONS)))

    return queue[:round_count]


def get_mission_hint(mission_id: str) -> str:
    return MISSIONS_BY_ID[mission_id]["hint"]

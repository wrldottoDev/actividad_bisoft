# Endpoint Heist

Juego web multijugador por turnos con:

- Frontend: React + TypeScript + Tailwind + Vite
- Backend: FastAPI + WebSocket + SQLite
- Acceso: el admin crea una sala y comparte un código

## Qué hace

- El admin crea una sala.
- Los jugadores entran con su nombre y el código.
- Todos ven el lobby en tiempo real.
- El admin inicia la partida.
- Cada turno lo juega un solo participante desde su dispositivo.
- El servidor valida el flujo, calcula puntos y mantiene el ranking.
- Al final se muestra el ganador y el ranking completo.

## Estructura

```text
backend/
  app/
    main.py
    missions.py
    service.py
    storage.py
    ws_manager.py
  requirements.txt

src/
  components/
  hooks/
  lib/
  screens/
  types/
  utils/
```

## Desarrollo local

### 1. Frontend

```bash
npm install
npm run dev:client
```

El frontend queda normalmente en `http://localhost:5173`.

### 2. Backend

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m uvicorn backend.app.main:app --reload
```

El backend queda en `http://127.0.0.1:8000`.

Vite ya incluye proxy para:

- `/api` -> `http://127.0.0.1:8000`
- `/ws` -> `ws://127.0.0.1:8000`

No hace falta configurar variables extra para desarrollo local.

## Scripts útiles

```bash
npm run dev:client
npm run dev:api
npm run lint
npm run build
npm run check:api
```

`npm run dev:api` usa el Python global:

```bash
python3 -m uvicorn backend.app.main:app --reload
```

Si prefieres el `venv`, usa directamente `.venv/bin/python`.

## Producción en VPS

Opciones recomendadas:

1. Servir el frontend compilado detrás de Nginx.
2. Ejecutar FastAPI con `uvicorn` o `gunicorn` + `uvicorn worker`.
3. Proxyar `/api` y `/ws` desde Nginx hacia el backend Python.

Comandos base:

```bash
npm run build
.venv/bin/python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

## Verificación hecha

Se verificó lo siguiente en este proyecto:

- `npm run lint`
- `npm run build`
- `python3 -m compileall backend`
- `.venv/bin/python -c "from backend.app.main import app; print(app.title)"`

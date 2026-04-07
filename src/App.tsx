import { useEffect, useState } from "react";
import { useRoomGame } from "./hooks/useRoomGame";
import { HomeScreen } from "./screens/HomeScreen";
import { LobbyScreen } from "./screens/LobbyScreen";
import { FinalRankingScreen } from "./screens/FinalRankingScreen";
import { TurnScreen } from "./screens/TurnScreen";
import { WaitingScreen } from "./screens/WaitingScreen";
import { formatConnectionStatus } from "./utils/game";

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const {
    room,
    error,
    session,
    connectionStatus,
    isBusy,
    createRoom,
    joinRoom,
    startGame,
    validateFlow,
    requestHint,
    restartMatch,
    clearLocalSession,
  } = useRoomGame();
  const isAdminEntry = pathname === "/admin";

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);

    return () => {
      window.removeEventListener("popstate", syncPath);
    };
  }, []);

  const copyRoomCode = async () => {
    if (!room) {
      return;
    }

    try {
      await navigator.clipboard.writeText(room.roomCode);
    } catch {
      // Clipboard access can fail on unsupported contexts; ignore silently.
    }
  };

  const renderMainContent = () => {
    if (!session || !room) {
      return (
        <HomeScreen
          mode={isAdminEntry ? "admin" : "join"}
          busy={isBusy}
          error={error}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
        />
      );
    }

    if (room.status === "lobby") {
      return (
        <LobbyScreen
          room={room}
          connectionStatus={connectionStatus}
          isBusy={isBusy}
          onStartGame={() => {
            void startGame();
          }}
          onCopyCode={() => {
            void copyRoomCode();
          }}
        />
      );
    }

    if (room.status === "playing") {
      if (room.mission && room.myState && !room.myState.isFinished) {
        return (
          <TurnScreen
            key={`${room.roomCode}-${room.mission.id}-${room.me.id}`}
            player={room.me}
            mission={room.mission}
            ranking={room.players}
            roundNumber={room.round?.roundNumber ?? 1}
            totalRounds={room.round?.totalRounds ?? 3}
            totalPlayers={room.round?.totalPlayers ?? room.playerCount}
            completedPlayers={room.round?.completedPlayers ?? 0}
            startedAt={room.myState.startedAt}
            attemptsRemaining={room.myState.attemptsRemaining}
            feedback={room.myState.feedback}
            hintUsed={room.myState.hintUsed}
            hintText={room.myState.hintText}
            timeLimitSeconds={room.round?.timeLimitSeconds ?? 60}
            isSubmitting={isBusy}
            onValidateFlow={(flowIds) => {
              void validateFlow(flowIds);
            }}
            onUseHint={() => {
              void requestHint();
            }}
          />
        );
      }

      return <WaitingScreen room={room} connectionStatus={connectionStatus} />;
    }

    if (room.status === "finished") {
      return (
        <FinalRankingScreen
          players={room.players}
          winnerId={room.winnerId}
          isAdmin={room.isAdmin}
          onRestart={() => {
            void restartMatch();
          }}
        />
      );
    }

    return (
      <div className="panel p-6 sm:p-8">
        <p className="eyebrow">Sincronización</p>
        <h2 className="section-title">Esperando estado de sala</h2>
        <p className="mt-3 text-sm text-slate-600">
          La interfaz está reconectando con el backend.
        </p>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_55%)]" />
        <div className="absolute right-[-8rem] top-20 h-72 w-72 rounded-full bg-slate-300/20 blur-3xl" />
        <div className="absolute left-[-6rem] bottom-0 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Endpoint Heist</p>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">
              Actividad endpoints
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {room ? (
              <span className="soft-pill">Sala {room.roomCode}</span>
            ) : null}
            {session ? (
              <button
                className="btn-secondary !px-4 !py-2"
                onClick={clearLocalSession}
              >
                Salir local
              </button>
            ) : null}
          </div>
        </header>

        {session ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="panel-muted px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Jugador
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {room?.me.name ?? "Reconectando"}
              </p>
            </div>
            <div className="panel-muted px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Conexión
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {formatConnectionStatus(connectionStatus)}
              </p>
            </div>
            <div className="panel-muted px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Estado
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {room?.status === "finished"
                  ? "Finalizada"
                  : room?.status === "playing"
                    ? "En partida"
                    : "Lobby"}
              </p>
            </div>
          </div>
        ) : null}

        <main className="flex-1">{renderMainContent()}</main>
      </div>
    </div>
  );
}

export default App;

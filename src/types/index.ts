export type BlockType =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'JWT'
  | 'HEADERS'
  | 'BODY';

export interface BlockDefinition {
  id: string;
  type: BlockType;
  label: string;
}

export interface MissionPayload {
  id: string;
  title: string;
  description: string;
  objective: string;
  difficulty: 'Quick' | 'Tactical';
  availableBlocks: BlockDefinition[];
}

export interface RoomPlayer {
  id: string;
  name: string;
  score: number;
  totalTime: number;
  turnsCompleted: number;
  solvedMissions: number;
  isAdmin: boolean;
  isOnline: boolean;
  isFinished: boolean;
}

export interface RoomRound {
  startedAt: string | null;
  totalPlayers: number;
  completedPlayers: number;
  remainingPlayers: number;
}

export interface PlayerRoundState {
  startedAt: string | null;
  attemptsUsed: number;
  attemptsRemaining: number;
  isFinished: boolean;
  feedback: string;
}

export interface TurnResult {
  playerId: string;
  playerName: string;
  missionId: string;
  missionTitle: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeUsed: number;
  attemptsUsed: number;
  feedback: string;
  finalSequence: string[];
  accumulatedScore: number;
}

export interface RoomSnapshot {
  roomCode: string;
  status: 'lobby' | 'playing' | 'finished';
  isAdmin: boolean;
  canStart: boolean;
  canRestart: boolean;
  me: RoomPlayer;
  players: RoomPlayer[];
  playerCount: number;
  round: RoomRound | null;
  mission: MissionPayload | null;
  myState: PlayerRoundState | null;
  myResult: TurnResult | null;
  winnerId: string | null;
}

export interface PlayerSession {
  roomCode: string;
  playerId: string;
  token: string;
}

export interface SessionResponse {
  session: PlayerSession;
  room: RoomSnapshot;
}

export type ConnectionStatus = 'offline' | 'connecting' | 'live';

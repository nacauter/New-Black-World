
export type GamePhase = 'Lobby' | 'Playing' | 'GameOver';

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
  x: number;
  y: number;
  radius: number;
  color: string;
  isAlive: boolean;
  score: number;
  debuffs: {
    type: 'Panic' | 'Concussed' | 'Stunned' | 'Broken';
    endTime: number;
  }[];
}

export interface Monster {
  id: string;
  type: 'Hunter' | 'Screamer' | 'Mimic' | 'Patroller';
  x: number;
  y: number;
  phase: string;
  phaseEndTime: number;
  isAggressive: boolean;
}

export interface Mine {
  id: string;
  x: number;
  y: number;
  isExploded: boolean;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  monsters: Monster[];
  mines: Mine[];
  keyPosition: { x: number; y: number } | null;
  exitPosition: { x: number; y: number } | null;
  exitDoorOpen: boolean;
  map: number[][]; // 0: empty, 1: wall, 2: door
  seed: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'GOD';
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

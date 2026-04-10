
export type GamePhase = 'Lobby' | 'Playing' | 'GameOver';
export type DebuffType = 'Panic' | 'Concussed' | 'Stunned' | 'Broken';
export type MonsterType = 'Hunter' | 'Screamer' | 'Mimic' | 'Patroller';

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
  classification: string;
  isMoving: boolean;
  hasKey: boolean;
  debuffs: {
    type: DebuffType;
    endTime: number;
  }[];
  stats: {
    escapedHunter: number;
    escapedScreamer: number;
    minesActivated: number;
    mimicsExposed: number;
    keysPicked: number;
    deaths: number;
    survivedDebuff: number;
    survivedBroken: number;
  };
}

export interface Monster {
  id: string;
  type: MonsterType;
  x: number;
  y: number;
  phase: 'Search' | 'Hunt' | 'Rest' | 'Ambush' | 'Sleep' | 'Patrol' | 'Stunned';
  phaseEndTime: number;
  targetId: string | null;
  lastMarkedX?: number;
  lastMarkedY?: number;
  mimicForm?: string; // Player name if mimicking
}

export interface Mine {
  id: string;
  x: number;
  y: number;
  isExploded: boolean;
  explosionTime?: number;
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
  map: number[][];
  seed: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'GOD';
  lang: 'RU' | 'EN';
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

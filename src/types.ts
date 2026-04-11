
export type GamePhase = 'Lobby' | 'Playing' | 'GameOver';
export type DebuffType = 'Panic' | 'Concussed' | 'Stunned' | 'Broken';
export type MonsterType = 'Hunter' | 'Screamer' | 'Mimic' | 'Patroller';

export interface Player {
  id: string;
  name: string;
  isBot?: boolean;
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
    diedUnderDebuff: number;
    diedUnderBroken: number;
    killedByPatroller: number;
    killedByHunter: number;
    killedByScreamer: number;
    killedByMimic: number;
  };
}

export interface Monster {
  id: string;
  type: MonsterType;
  x: number;
  y: number;
  phase: 'Search' | 'Hunt' | 'Rest' | 'Ambush' | 'Sleep' | 'Patrol' | 'Stunned' | 'StealingKey';
  phaseEndTime: number;
  targetId: string | null;
  lastMarkedX?: number;
  lastMarkedY?: number;
  mimicForm?: string; // Player name if mimicking
  lastRayTime?: number;
  lastKnownPlayerPos?: { x: number; y: number } | null;
  stepCounter?: number;
}

export interface Mine {
  id: string;
  x: number;
  y: number;
  isExploded: boolean;
  explosionTime?: number;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'GOD';
export type BranchDensity = 'None' | 'Low' | 'Medium' | 'High';

export interface GameSettings {
  difficulty: Difficulty;
  seed: string;
  mapSize: number; // 40, 60, 80 etc
  branchDensity: BranchDensity;
  password?: string;
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
  settings: GameSettings;
  lang: 'RU' | 'EN';
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

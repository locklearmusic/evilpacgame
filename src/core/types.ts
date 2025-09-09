import type { GhostID } from "./const";

export interface GhostConfig {
  id: GhostID;
  speed: number;
  scatterTarget: { x: number; y: number };
}

export interface LevelConfig {
  id: string;
  mapKey: string;
  tilesetKey: string;
  pacStart: { x: number; y: number };
  ghostStarts: Record<GhostID, { x: number; y: number }>;
}

export interface PlayerOptions {
  soundVolume: number;
  musicVolume: number;
  captionsEnabled: boolean;
}

export interface RunState {
  runId: string;
  ghostsAlive: GhostID[];
  cutsceneIndexByGhost: Record<GhostID, number>;
  levelNumber: number;
  score: number;
}

export const DEFAULT_PLAYER_OPTIONS: PlayerOptions = {
  soundVolume: 0.8,
  musicVolume: 0.6,
  captionsEnabled: false,
};

export const DEFAULT_RUN_STATE: RunState = {
  runId: "",
  ghostsAlive: [],
  cutsceneIndexByGhost: {},
  levelNumber: 1,
  score: 0,
};






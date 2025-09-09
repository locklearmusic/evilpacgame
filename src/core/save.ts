import { GhostIDs } from "./const";
import type { PlayerOptions, RunState } from "./types";
import { DEFAULT_PLAYER_OPTIONS, DEFAULT_RUN_STATE } from "./types";
import type { GhostID } from "./const";

const STORAGE_KEYS = {
  PLAYER_OPTIONS: "evilpac_player_options",
  RUN_STATE: "evilpac_run_state",
} as const;

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all available ghost IDs
 */
function getAllGhostIds(): GhostID[] {
  return Object.values(GhostIDs);
}

/**
 * Save player options to localStorage
 */
export function saveOptions(options: PlayerOptions): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYER_OPTIONS, JSON.stringify(options));
  } catch (error) {
    console.warn("Failed to save player options:", error);
  }
}

/**
 * Load player options from localStorage
 */
export function loadOptions(): PlayerOptions {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAYER_OPTIONS);
    if (!stored) return { ...DEFAULT_PLAYER_OPTIONS };
    
    const parsed = JSON.parse(stored) as Partial<PlayerOptions>;
    return {
      soundVolume: parsed.soundVolume ?? DEFAULT_PLAYER_OPTIONS.soundVolume,
      musicVolume: parsed.musicVolume ?? DEFAULT_PLAYER_OPTIONS.musicVolume,
      captionsEnabled: parsed.captionsEnabled ?? DEFAULT_PLAYER_OPTIONS.captionsEnabled,
    };
  } catch (error) {
    console.warn("Failed to load player options, using defaults:", error);
    return { ...DEFAULT_PLAYER_OPTIONS };
  }
}

/**
 * Create a new run with fresh state
 */
export function newRun(): RunState {
  const runId = generateRunId();
  const ghostsAlive = getAllGhostIds();
  const cutsceneIndexByGhost: Record<GhostID, number> = {};
  
  // Initialize cutscene indices to 0 for all ghosts
  ghostsAlive.forEach(ghostId => {
    cutsceneIndexByGhost[ghostId] = 0;
  });
  
  const newState: RunState = {
    runId,
    ghostsAlive,
    cutsceneIndexByGhost,
    levelNumber: 1,
  };
  
  saveRunState(newState);
  return newState;
}

/**
 * Save current run state to localStorage
 */
export function saveRunState(runState: RunState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RUN_STATE, JSON.stringify(runState));
  } catch (error) {
    console.warn("Failed to save run state:", error);
  }
}

/**
 * Load current run state from localStorage
 */
export function loadRunState(): RunState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RUN_STATE);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as Partial<RunState>;
    
    // Validate required fields
    if (!parsed.runId || !Array.isArray(parsed.ghostsAlive)) {
      return null;
    }
    
    return {
      runId: parsed.runId,
      ghostsAlive: parsed.ghostsAlive,
      cutsceneIndexByGhost: parsed.cutsceneIndexByGhost ?? {},
      levelNumber: parsed.levelNumber ?? 1,
    };
  } catch (error) {
    console.warn("Failed to load run state:", error);
    return null;
  }
}

/**
 * Clear all saved data (useful for testing or reset)
 */
export function clearAllData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_OPTIONS);
    localStorage.removeItem(STORAGE_KEYS.RUN_STATE);
  } catch (error) {
    console.warn("Failed to clear saved data:", error);
  }
}






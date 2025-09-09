// Event constants - Phaser EventEmitter will be created in game initialization
export const GameEvents = {
  PlayerDied: "player:died",
  PowerupPicked: "powerup:picked",
  LevelComplete: "level:complete",
} as const;

export type GameEventKey = typeof GameEvents[keyof typeof GameEvents];

// This will be initialized in main.ts to avoid Phaser import issues in tests
export let events: any = null;

export function initializeEvents(phaserEvents: any) {
  events = phaserEvents;
}

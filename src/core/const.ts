export const SceneKeys = {
  Boot: "BootScene",
  Title: "TitleScene",
  Tutorial: "TutorialScene",
  SelectGhost: "SelectGhostScene",
  Game: "GameScene",
  Cutscene: "CutsceneScene",
  Results: "ResultsScene",
  Pause: "PauseScene",
} as const;

export const GhostIDs = {
  Blinky: "blinky",
  Pinky: "pinky",
  Inky: "inky",
  Clyde: "clyde",
} as const;

export const UIKeys = {
  HUD: "HUD",
  Pause: "Pause",
} as const;

export type SceneKey = typeof SceneKeys[keyof typeof SceneKeys];
export type GhostID = typeof GhostIDs[keyof typeof GhostIDs];
export type UIKey = typeof UIKeys[keyof typeof UIKeys];



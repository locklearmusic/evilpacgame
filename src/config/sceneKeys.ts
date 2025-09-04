export const SceneKeys = {
  Boot: "BootScene",
  Title: "TitleScene",
  Tutorial: "TutorialScene",
} as const;

export type SceneKey = typeof SceneKeys[keyof typeof SceneKeys];



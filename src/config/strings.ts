export const Strings = {
  TitleText: "Evil Pac",
  StartPrompt: "Press Enter",
  TutorialLabel: "Tutorial Scene",
  TutorialTitle: "Tutorial",
  TutorialComplete: "Tutorial Complete!",
  ContinuePrompt: "Press ENTER to continue",
  SkipPrompt: "Press ESC to skip",
} as const;

export type GameStringKey = keyof typeof Strings;



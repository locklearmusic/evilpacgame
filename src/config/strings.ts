export const Strings = {
  TitleText: "Evil Pac",
  StartPrompt: "Press Enter",
  TutorialLabel: "Tutorial Scene",
} as const;

export type GameStringKey = keyof typeof Strings;



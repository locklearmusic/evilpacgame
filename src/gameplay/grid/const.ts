export const TILE_SIZE = 24; // px
export const TURN_WINDOW = 0.35; // tiles from center where turns are allowed

// Speeds (tiles per second)
export const SPEEDS = {
  pac: 6.5,
  ghost: 6.0,
  frightenedGhost: 5.0,
  tunnelPac: 6.0,
  tunnelGhost: 5.0,
} as const;

// Collision radii (tiles)
export const RADII = {
  pac: 0.4,
  ghost: 0.4,
};

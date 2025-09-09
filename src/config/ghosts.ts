import { GhostIDs } from "../core/const";
import type { GhostID } from "../core/const";

export interface BlinkyConfig {
  losRampSec: number;
  lockOnBurst: { speedMult: number; duration: number; cooldown: number };
  turnSharpness: number;
}

export interface PinkyConfig {
  ambushAheadTiles: number;
  trap: { slowMult: number; radius: number; duration: number; cooldown: number };
}

export interface InkyConfig {
  teleport: { range: number; bias: number; vulnSec: number; cooldown: number };
}

export interface ClydeConfig {
  decoys: { count: number; spreadDeg: number; lifeSec: number; cooldown: number };
  wanderNoise: number;
}

export type GhostMeta = {
  id: GhostID;
  name: string;
  strength: string;
  weakness: string;
  abilityHint: string;
};

export const GhostsMeta: Record<GhostID, GhostMeta> = {
  [GhostIDs.Blinky]: {
    id: GhostIDs.Blinky,
    name: "Blinky",
    strength: "Builds speed with line of sight",
    weakness: "Poor cornering",
    abilityHint: "Lock-On burst after sustained LoS",
  },
  [GhostIDs.Pinky]: {
    id: GhostIDs.Pinky,
    name: "Pinky",
    strength: "Ambushes 4 tiles ahead",
    weakness: "Struggles in open areas",
    abilityHint: "Deploy Predictive Net to slow Evil Pac",
  },
  [GhostIDs.Inky]: {
    id: GhostIDs.Inky,
    name: "Inky",
    strength: "Unpredictable short teleports",
    weakness: "Vulnerable after teleport",
    abilityHint: "Glitch Step toward biased target",
  },
  [GhostIDs.Clyde]: {
    id: GhostIDs.Clyde,
    name: "Clyde",
    strength: "Creates convincing decoy pellets",
    weakness: "Lowest top speed",
    abilityHint: "Scatter Bait to lure Evil Pac",
  },
};

export const BlinkyDefaults: BlinkyConfig = {
  losRampSec: 2.5,
  lockOnBurst: { speedMult: 1.35, duration: 1200, cooldown: 3500 },
  turnSharpness: 0.8,
};

export const PinkyDefaults: PinkyConfig = {
  ambushAheadTiles: 4,
  trap: { slowMult: 0.6, radius: 2.0, duration: 2000, cooldown: 5000 },
};

export const InkyDefaults: InkyConfig = {
  teleport: { range: 6, bias: 0.6, vulnSec: 1200, cooldown: 4500 },
};

export const ClydeDefaults: ClydeConfig = {
  decoys: { count: 5, spreadDeg: 50, lifeSec: 6000, cooldown: 6000 },
  wanderNoise: 0.12,
};


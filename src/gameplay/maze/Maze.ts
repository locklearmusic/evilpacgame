import { bfsPath, key, pathToNearest, type GridPos } from "./nav";

export interface MazeConfig {
  width: number;
  height: number;
  walls: Set<string>; // keyed by "x,y"
  warps: Map<string, string>; // entry -> exit keyed by "x,y"
}

export class Maze {
  readonly width: number;
  readonly height: number;
  private walls: Set<string>;
  private warps: Map<string, string>;
  private warpPoints: { left: string; right: string; top: string; bottom: string };
  private arrowDir: Map<string, "left" | "right" | "up" | "down"> = new Map();
  private pellets: Set<string>;

  constructor(cfg?: Partial<MazeConfig>) {
    const def = defaultConfig();
    this.width = cfg?.width ?? def.width;
    this.height = cfg?.height ?? def.height;
    this.walls = cfg?.walls ?? def.walls;
    this.warps = cfg?.warps ?? def.warps;
    // Precompute canonical warp point keys based on dimensions
    const midY = Math.floor(this.height / 2);
    const midX = Math.floor(this.width / 2);
    this.warpPoints = {
      left: `0,${midY}`,
      right: `${this.width - 1},${midY}`,
      top: `${midX},0`,
      bottom: `${midX},${this.height - 1}`,
    };
    this.pellets = new Set<string>();
    // Fill pellets on all walkable cells not walls or warp endpoints
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const k = `${x},${y}`;
        if (!this.walls.has(k)) this.pellets.add(k);
      }
    }
    for (const k of this.warps.keys()) this.pellets.delete(k);
    for (const v of this.warps.values()) this.pellets.delete(v);
  }

  isWall(p: GridPos): boolean {
    return this.walls.has(key(p));
  }

  isInside(p: GridPos): boolean {
    return p.x >= 0 && p.y >= 0 && p.x < this.width && p.y < this.height;
  }

  isPassable = (p: GridPos): boolean => {
    if (!this.isInside(p)) return false;
    return !this.isWall(p);
  };

  warpAt(p: GridPos): GridPos | null {
    const k = key(p);
    // If dynamic arrow directions are set, route based on arrow
    const dir = this.arrowDir.get(k);
    if (dir) {
      const wp = this.warpPoints;
      let destKey: string | null = null;
      if (dir === "left") destKey = wp.left;
      else if (dir === "right") destKey = wp.right;
      else if (dir === "up") destKey = wp.top;
      else if (dir === "down") destKey = wp.bottom;
      if (destKey) {
        // If the computed destination equals the source (e.g., left arrow at left warp), wrap to the opposite warp on that axis
        if (destKey === k) {
          if (dir === "left" || dir === "right") destKey = destKey === wp.left ? wp.right : wp.left;
          else destKey = destKey === wp.top ? wp.bottom : wp.top;
        }
        const [dx, dy] = destKey.split(",").map(Number);
        return { x: dx, y: dy };
      }
    }
    // Fallback to static mapping
    const dest = this.warps.get(k);
    if (!dest) return null;
    const [x, y] = dest.split(",").map(Number);
    return { x, y };
  }

  findPath(start: GridPos, end: GridPos) {
    return bfsPath(start, end, this.isPassable);
  }

  pelletCount(): number {
    return this.pellets.size;
  }

  hasPellet(p: GridPos): boolean {
    return this.pellets.has(key(p));
  }

  consumePellet(p: GridPos): boolean {
    return this.pellets.delete(key(p));
  }

  pelletPositions(): GridPos[] {
    const res: GridPos[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isPassable({ x, y }) && this.hasPellet({ x, y })) res.push({ x, y });
      }
    }
    return res;
  }

  /** Returns path to nearest pellet from a position, or null if none. */
  pathToNearestPellet(from: GridPos) {
    return pathToNearest(from, this.pellets, this.isPassable);
  }

  /** Return canonical warp point keys for rendering arrows */
  getWarpPoints() {
    return { ...this.warpPoints };
  }

  /** Set directional arrow for each warp tile by key: affects runtime warp routing. */
  setWarpArrows(map: Partial<Record<"left" | "right" | "top" | "bottom", "left" | "right" | "up" | "down">>) {
    // Clear prior
    this.arrowDir.clear();
    const wp = this.warpPoints;
    if (map.left) this.arrowDir.set(wp.left, map.left);
    if (map.right) this.arrowDir.set(wp.right, map.right);
    if (map.top) this.arrowDir.set(wp.top, map.top);
    if (map.bottom) this.arrowDir.set(wp.bottom, map.bottom);
  }
}

export function defaultConfig(): MazeConfig {
  // Baseline config (also used by level 1)
  return Maze.configForLevel(1);
}

/**
 * Generate a left/right symmetrical maze configuration for a given level (1..12).
 * Hardness scales with level by adding more pillars and reducing gaps.
 */
export function makeSymmetricWalls(width: number, height: number, level: number) {
  // Ensure odd dimensions for clean 1-tile corridors and walls
  if (width % 2 === 0) width -= 1;
  if (height % 2 === 0) height -= 1;

  const W = width;
  const H = height;
  const walls = new Set<string>();
  const add = (x: number, y: number) => walls.add(`${x},${y}`);

  // Fill all tiles as walls initially
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) add(x, y);
  }

  // Simple seeded RNG for deterministic variety per level
  let seed = (level * 1103515245 + 12345) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const shuffle = <T,>(arr: T[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Cell space (odd tile coordinates are cells, even are walls between)
  const CW = Math.floor((W - 1) / 2);
  const CH = Math.floor((H - 1) / 2);
  const visited: boolean[][] = Array.from({ length: CH }, () => Array(CW).fill(false));

  // Convert cell to tile center
  const cx2x = (cx: number) => 2 * cx + 1;
  const cy2y = (cy: number) => 2 * cy + 1;

  // Carve at cell
  const carveCell = (cx: number, cy: number) => {
    const x = cx2x(cx);
    const y = cy2y(cy);
    walls.delete(`${x},${y}`);
  };
  const carveBetween = (ax: number, ay: number, bx: number, by: number) => {
    const x = (cx2x(ax) + cx2x(bx)) >> 1;
    const y = (cy2y(ay) + cy2y(by)) >> 1;
    walls.delete(`${x},${y}`);
  };

  // Mirror helpers in cell space across vertical center
  const mx = (cx: number) => CW - 1 - cx;
  const my = (cy: number) => cy; // horizontal mirror only

  // DFS using cell pairs that mirror across center for symmetry
  const startCX = Math.max(0, Math.floor((CW - 1) / 4));
  const startCY = Math.floor(CH / 2);
  const stack: Array<[number, number]> = [[startCX, startCY]];

  const inBounds = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < CW && cy < CH;

  const markVisitedSym = (cx: number, cy: number) => {
    visited[cy][cx] = true;
    visited[my(cy)][mx(cx)] = true;
  };
  const isVisited = (cx: number, cy: number) => visited[cy][cx];

  // Carve the start and its mirror
  carveCell(startCX, startCY);
  carveCell(mx(startCX), my(startCY));
  markVisitedSym(startCX, startCY);

  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const dirs: Array<[number, number]> = shuffle([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]);
    let moved = false;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nxm = mx(nx);
      const nym = my(ny);
      if (!inBounds(nx, ny) || isVisited(nx, ny) || !inBounds(nxm, nym) || isVisited(nxm, nym)) continue;
      // Carve corridor to neighbor and mirrored neighbor
      carveCell(nx, ny);
      carveBetween(cx, cy, nx, ny);
      carveCell(mx(cx), my(cy));
      carveBetween(mx(cx), my(cy), nxm, nym);
      carveCell(nxm, nym);
      markVisitedSym(nx, ny);
      stack.push([nx, ny]);
      moved = true;
      break;
    }
    if (!moved) stack.pop();
  }

  // Post-process: braid the maze (remove dead ends) while keeping symmetry and 1-tile lanes
  const isOpen = (x: number, y: number) => !walls.has(`${x},${y}`);
  const neighbors = (x: number, y: number) => {
    const res: Array<{ x: number; y: number } & { dir: [number, number] }> = [];
    const ds: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of ds) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx <= 0 || ny <= 0 || nx >= W - 1 || ny >= H - 1) continue;
      if (isOpen(nx, ny)) res.push({ x: nx, y: ny, dir: [dx, dy] });
    }
    return res;
  };
  // Iterate only left half to preserve symmetry; mirror any break-through
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < Math.floor(W / 2); x++) {
      if (!isOpen(x, y)) continue;
      const n = neighbors(x, y).length;
      if (n <= 1) {
        // Choose a random direction that is currently blocked and carve through one wall tile to the next cell
        const ds: Array<[number, number]> = shuffle([
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]);
        for (const [dx, dy] of ds) {
          const wx = x + dx; // wall tile between cells
          const wy = y + dy;
          const cx2 = x + 2 * dx; // next cell center
          const cy2 = y + 2 * dy;
          if (cx2 <= 0 || cy2 <= 0 || cx2 >= W - 1 || cy2 >= H - 1) continue;
          if (!isOpen(wx, wy)) {
            // Carve this wall and its mirror; also carve opposite cell to ensure connection
            walls.delete(`${wx},${wy}`);
            walls.delete(`${W - 1 - wx},${wy}`);
            walls.delete(`${cx2},${cy2}`);
            walls.delete(`${W - 1 - cx2},${cy2}`);
            break;
          }
        }
      }
    }
  }

  // Ensure outer borders remain walls but open warp entrances as openings in outer walls
  for (let x = 0; x < W; x++) {
    add(x, 0);
    add(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    add(0, y);
    add(W - 1, y);
  }
  // Open warp tiles on border (outside the main maze area)
  const midY = Math.floor(H / 2);
  walls.delete(`0,${midY}`);
  walls.delete(`${W - 1},${midY}`);
  const midX = Math.floor(W / 2);
  walls.delete(`${midX},0`);
  walls.delete(`${midX},${H - 1}`);
  // Ensure interior tiles adjacent to warp openings are open to allow entry/exit
  walls.delete(`1,${midY}`);
  walls.delete(`${W - 2},${midY}`);
  walls.delete(`${midX},1`);
  walls.delete(`${midX},${H - 2}`);

  return walls;
}

export function makeWarps(width: number, height: number): Map<string, string> {
  const warps = new Map<string, string>();
  const midY = Math.floor(height / 2);
  const midX = Math.floor(width / 2);
  // Horizontal (left <-> right) on outer border tiles
  warps.set(`0,${midY}`, `${width - 1},${midY}`);
  warps.set(`${width - 1},${midY}`, `0,${midY}`);
  // Vertical (top <-> bottom) on outer border tiles
  warps.set(`${midX},0`, `${midX},${height - 1}`);
  warps.set(`${midX},${height - 1}`, `${midX},0`);
  return warps;
}

export function configForLevel(level: number): MazeConfig {
  // Slightly increase size with level: width grows every 2 levels, height every 3 levels
  const baseW = 19, baseH = 15;
  const incW = Math.floor((level - 1) / 2) * 2; // +2 at L3,5,7,9,11 -> up to +10
  const incH = Math.floor((level - 1) / 3) * 2; // +2 at L4,7,10 -> up to +6
  const width = baseW + incW;
  const height = baseH + incH;
  const lvl = Math.max(1, Math.min(12, Math.floor(level)));
  const walls = makeSymmetricWalls(width, height, lvl);
  const warps = makeWarps(width, height);
  return { width, height, walls, warps };
}

// Expose as a static helper on Maze as well
(Maze as any).configForLevel = configForLevel;

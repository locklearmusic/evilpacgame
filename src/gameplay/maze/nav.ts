export type GridPos = { x: number; y: number };

export function key(p: GridPos): string {
  return `${p.x},${p.y}`;
}

export function neighbors(p: GridPos): GridPos[] {
  return [
    { x: p.x + 1, y: p.y },
    { x: p.x - 1, y: p.y },
    { x: p.x, y: p.y + 1 },
    { x: p.x, y: p.y - 1 },
  ];
}

/** Simple BFS shortest path on a grid using a passable predicate. */
export function bfsPath(
  start: GridPos,
  goal: GridPos,
  passable: (p: GridPos) => boolean
): GridPos[] | null {
  const startKey = key(start);
  const goalKey = key(goal);
  if (startKey === goalKey) return [start];

  const q: GridPos[] = [start];
  const came = new Map<string, string | null>();
  came.set(startKey, null);

  while (q.length) {
    const cur = q.shift()!;
    for (const nb of neighbors(cur)) {
      const k = key(nb);
      if (!came.has(k) && passable(nb)) {
        came.set(k, key(cur));
        if (k === goalKey) {
          // reconstruct
          const path: GridPos[] = [goal];
          let ck: string | null = key(cur);
          while (ck) {
            const [x, y] = ck.split(",").map(Number);
            path.push({ x, y });
            ck = came.get(ck) ?? null;
          }
          path.reverse();
          return path;
        }
        q.push(nb);
      }
    }
  }
  return null;
}

/** Find nearest target cell by BFS across all targets; returns path to nearest. */
export function pathToNearest(
  start: GridPos,
  targets: Set<string>,
  passable: (p: GridPos) => boolean
): GridPos[] | null {
  const startKey = key(start);
  if (targets.has(startKey)) return [start];

  const q: GridPos[] = [start];
  const came = new Map<string, string | null>();
  came.set(startKey, null);

  while (q.length) {
    const cur = q.shift()!;
    for (const nb of neighbors(cur)) {
      const k = key(nb);
      if (!came.has(k) && passable(nb)) {
        came.set(k, key(cur));
        if (targets.has(k)) {
          // reconstruct
          const [gx, gy] = k.split(",").map(Number);
          const goal = { x: gx, y: gy };
          const path: GridPos[] = [goal];
          let ck: string | null = key(cur);
          while (ck) {
            const [x, y] = ck.split(",").map(Number);
            path.push({ x, y });
            ck = came.get(ck) ?? null;
          }
          path.reverse();
          return path;
        }
        q.push(nb);
      }
    }
  }
  return null;
}


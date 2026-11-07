import { Move, CubeColor } from '../../types/puzzle';
import { FaceName3x3 } from '../../components/3d/cubieModel';
import { Cube4x4State } from './cube4x4Types';
import {
  apply4x4Move,
  turnInfo4x4,
  getStandardSolved4x4State,
} from './cube4x4Geometry';
import { optimizeMoves4x4 } from '../core/moveOptimizer4x4';

export const CENTRE_SLOTS: Array<{ face: FaceName3x3; idx: number }> = [
  // U: 0..3
  { face: 'U', idx: 5 }, { face: 'U', idx: 6 }, { face: 'U', idx: 9 }, { face: 'U', idx: 10 },
  // D: 4..7
  { face: 'D', idx: 5 }, { face: 'D', idx: 6 }, { face: 'D', idx: 9 }, { face: 'D', idx: 10 },
  // F: 8..11
  { face: 'F', idx: 5 }, { face: 'F', idx: 6 }, { face: 'F', idx: 9 }, { face: 'F', idx: 10 },
  // B: 12..15
  { face: 'B', idx: 5 }, { face: 'B', idx: 6 }, { face: 'B', idx: 9 }, { face: 'B', idx: 10 },
  // L: 16..19
  { face: 'L', idx: 5 }, { face: 'L', idx: 6 }, { face: 'L', idx: 9 }, { face: 'L', idx: 10 },
  // R: 20..23
  { face: 'R', idx: 5 }, { face: 'R', idx: 6 }, { face: 'R', idx: 9 }, { face: 'R', idx: 10 },
];

const ALL_MOVES = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
  'r', "r'", 'r2',
  'l', "l'", 'l2',
  'u', "u'", 'u2',
  'd', "d'", 'd2',
  'f', "f'", 'f2',
  'b', "b'", 'b2',
];

const PERMS: Record<string, number[]> = {};
for (const m of ALL_MOVES) {
  const base = getStandardSolved4x4State();
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    (base[s.face] as any)[s.idx] = i;
  }
  const moved = apply4x4Move(base, m);
  const perm: number[] = new Array(24);
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    perm[i] = (moved[s.face] as any)[s.idx];
  }
  PERMS[m] = perm;
}

function applyPermToMask(mask: number, m: string): number {
  const perm = PERMS[m];
  let res = 0;
  for (let i = 0; i < 24; i++) {
    if (mask & (1 << perm[i])) {
      res |= 1 << i;
    }
  }
  return res;
}

function inv(m: string): string {
  if (m.endsWith("'")) return m.slice(0, -1);
  if (m.endsWith('2')) return m;
  return m + "'";
}

// Stage 1: Bring 8 U/D centres to U/D (slots 0..7: bits 0..7)
const TARGET_STAGE1 = 0xFF;

const MOVES_STAGE1 = [
  'r', "r'", 'r2',
  'l', "l'", 'l2',
  'f', "f'", 'f2',
  'b', "b'", 'b2',
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

export function solveStage1Centres(startMask: number): string[] {
  if ((startMask & 0xFF) === TARGET_STAGE1) return [];

  const forwardQueue: Array<{ mask: number; path: string[] }> = [{ mask: startMask, path: [] }];
  const forwardVisited = new Map<number, string[]>([[startMask, []]]);

  const backwardQueue: Array<{ mask: number; path: string[] }> = [{ mask: TARGET_STAGE1, path: [] }];
  const backwardVisited = new Map<number, string[]>([[TARGET_STAGE1, []]]);

  for (let depth = 0; depth < 10; depth++) {
    const fLen = forwardQueue.length;
    for (let i = 0; i < fLen; i++) {
      const cur = forwardQueue.shift()!;
      const lastMove = cur.path.length > 0 ? cur.path[cur.path.length - 1] : null;

      for (const m of MOVES_STAGE1) {
        if (lastMove && m[0] === lastMove[0]) continue;
        const nextMask = applyPermToMask(cur.mask, m);
        if (backwardVisited.has(nextMask)) {
          return [...cur.path, m, ...backwardVisited.get(nextMask)!];
        }
        if (!forwardVisited.has(nextMask) && cur.path.length < 5) {
          const newPath = [...cur.path, m];
          forwardVisited.set(nextMask, newPath);
          forwardQueue.push({ mask: nextMask, path: newPath });
        }
      }
    }

    const bLen = backwardQueue.length;
    for (let i = 0; i < bLen; i++) {
      const cur = backwardQueue.shift()!;
      const lastMove = cur.path.length > 0 ? cur.path[0] : null;

      for (const m of MOVES_STAGE1) {
        if (lastMove && m[0] === lastMove[0]) continue;
        const nextMask = applyPermToMask(cur.mask, inv(m));
        if (forwardVisited.has(nextMask)) {
          return [...forwardVisited.get(nextMask)!, m, ...cur.path];
        }
        if (!backwardVisited.has(nextMask) && cur.path.length < 5) {
          const newPath = [m, ...cur.path];
          backwardVisited.set(nextMask, newPath);
          backwardQueue.push({ mask: nextMask, path: newPath });
        }
      }
    }
  }
  return [];
}

// Stage 2: Bring 8 L/R centres to L/R (slots 16..23) preserving U/D
const TARGET_STAGE2 = 0xFF0000;

const MOVES_STAGE2 = [
  'u', "u'", 'u2',
  'd', "d'", 'd2',
  'r2', 'l2', 'f2', 'b2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
  'U', "U'", 'U2',
  'D', "D'", 'D2',
];

export function solveStage2Centres(startMask: number): string[] {
  if ((startMask & 0xFF0000) === TARGET_STAGE2) return [];

  const forwardQueue: Array<{ mask: number; path: string[] }> = [{ mask: startMask, path: [] }];
  const forwardVisited = new Map<number, string[]>([[startMask, []]]);

  const backwardQueue: Array<{ mask: number; path: string[] }> = [{ mask: TARGET_STAGE2, path: [] }];
  const backwardVisited = new Map<number, string[]>([[TARGET_STAGE2, []]]);

  for (let depth = 0; depth < 10; depth++) {
    const fLen = forwardQueue.length;
    for (let i = 0; i < fLen; i++) {
      const cur = forwardQueue.shift()!;
      const lastMove = cur.path.length > 0 ? cur.path[cur.path.length - 1] : null;

      for (const m of MOVES_STAGE2) {
        if (lastMove && m[0] === lastMove[0]) continue;
        const nextMask = applyPermToMask(cur.mask, m);
        if (backwardVisited.has(nextMask)) {
          return [...cur.path, m, ...backwardVisited.get(nextMask)!];
        }
        if (!forwardVisited.has(nextMask) && cur.path.length < 4) {
          const newPath = [...cur.path, m];
          forwardVisited.set(nextMask, newPath);
          forwardQueue.push({ mask: nextMask, path: newPath });
        }
      }
    }

    const bLen = backwardQueue.length;
    for (let i = 0; i < bLen; i++) {
      const cur = backwardQueue.shift()!;
      const lastMove = cur.path.length > 0 ? cur.path[0] : null;

      for (const m of MOVES_STAGE2) {
        if (lastMove && m[0] === lastMove[0]) continue;
        const nextMask = applyPermToMask(cur.mask, inv(m));
        if (forwardVisited.has(nextMask)) {
          return [...forwardVisited.get(nextMask)!, m, ...cur.path];
        }
        if (!backwardVisited.has(nextMask) && cur.path.length < 4) {
          const newPath = [m, ...cur.path];
          backwardVisited.set(nextMask, newPath);
          backwardQueue.push({ mask: nextMask, path: newPath });
        }
      }
    }
  }
  return [];
}

// Stage 3: Subgroup G = <r2, l2, u2, d2, f2, b2, U, D, F2, B2, L2, R2>
// Preserves {U, D}, {L, R}, {F, B} separations and solves all 6 faces uniform.
const MOVES_STAGE3 = [
  'r2', 'l2',
  'u2', 'd2',
  'f2', 'b2',
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F2', 'B2',
  'L2', 'R2',
];

const SOLVED_STAGE3_MASK = 0x0F0F0F;

export function solveStage3Centres(startMask: number): string[] {
  if (startMask === SOLVED_STAGE3_MASK) return [];

  const forwardQueue: Array<{ mask: number; path: string[] }> = [{ mask: startMask, path: [] }];
  const forwardVisited = new Map<number, string[]>([[startMask, []]]);

  const backwardQueue: Array<{ mask: number; path: string[] }> = [{ mask: SOLVED_STAGE3_MASK, path: [] }];
  const backwardVisited = new Map<number, string[]>([[SOLVED_STAGE3_MASK, []]]);

  for (let depth = 0; depth < 12; depth++) {
    const fLen = forwardQueue.length;
    for (let i = 0; i < fLen; i++) {
      const cur = forwardQueue.shift()!;
      const lastMove = cur.path.length > 0 ? cur.path[cur.path.length - 1] : null;

      for (const m of MOVES_STAGE3) {
        if (lastMove && m[0] === lastMove[0]) continue;
        const nextMask = applyPermToMask(cur.mask, m);
        if (backwardVisited.has(nextMask)) {
          return [...cur.path, m, ...backwardVisited.get(nextMask)!];
        }
        if (!forwardVisited.has(nextMask) && cur.path.length < 5) {
          const newPath = [...cur.path, m];
          forwardVisited.set(nextMask, newPath);
          forwardQueue.push({ mask: nextMask, path: newPath });
        }
      }
    }

    const bLen = backwardQueue.length;
    for (let i = 0; i < bLen; i++) {
      const cur = backwardQueue.shift()!;
      const lastMove = cur.path.length > 0 ? cur.path[0] : null;

      for (const m of MOVES_STAGE3) {
        if (lastMove && m[0] === lastMove[0]) continue;
        const invM = m === 'U' ? "U'" : m === "U'" ? 'U' : m === 'D' ? "D'" : m === "D'" ? 'D' : m;
        const nextMask = applyPermToMask(cur.mask, invM);
        if (forwardVisited.has(nextMask)) {
          return [...forwardVisited.get(nextMask)!, m, ...cur.path];
        }
        if (!backwardVisited.has(nextMask) && cur.path.length < 5) {
          const newPath = [m, ...cur.path];
          backwardVisited.set(nextMask, newPath);
          backwardQueue.push({ mask: nextMask, path: newPath });
        }
      }
    }
  }
  return [];
}

/**
 * Solves all 24 4x4 centres in ~20-25 moves with ZERO whole-cube rotations.
 */
export function solve4x4CentresOptimal(
  state: Cube4x4State,
  targetColors: Record<FaceName3x3, CubeColor>
): { moves: Move[]; state: Cube4x4State } {
  let cur = state;
  const allMoves: string[] = [];

  const colorU = targetColors.U;
  const colorD = targetColors.D;
  const colorL = targetColors.L;
  const colorR = targetColors.R;
  const colorF = targetColors.F;

  // Stage 1: U/D centres to U/D
  let mask1 = 0;
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    const col = cur[s.face][s.idx];
    if (col === colorU || col === colorD) mask1 |= 1 << i;
  }
  const s1Moves = solveStage1Centres(mask1);
  for (const m of s1Moves) {
    cur = apply4x4Move(cur, m);
    allMoves.push(m);
  }

  // Stage 2: L/R centres to L/R
  let mask2 = 0;
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    const col = cur[s.face][s.idx];
    if (col === colorL || col === colorR) mask2 |= 1 << i;
  }
  const s2Moves = solveStage2Centres(mask2);
  for (const m of s2Moves) {
    cur = apply4x4Move(cur, m);
    allMoves.push(m);
  }

  // Stage 3: Arrange 6 faces uniform using half-turn subgroup
  let mask3 = 0;
  for (let i = 0; i < 8; i++) {
    const s = CENTRE_SLOTS[i];
    if (cur[s.face][s.idx] === colorU) mask3 |= 1 << i;
  }
  for (let i = 8; i < 16; i++) {
    const s = CENTRE_SLOTS[i];
    if (cur[s.face][s.idx] === colorF) mask3 |= 1 << i;
  }
  for (let i = 16; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    if (cur[s.face][s.idx] === colorL) mask3 |= 1 << i;
  }
  const s3Moves = solveStage3Centres(mask3);
  for (const m of s3Moves) {
    cur = apply4x4Move(cur, m);
    allMoves.push(m);
  }

  const optimized = optimizeMoves4x4(allMoves);
  const moves: Move[] = optimized.map((notation) => {
    const t = turnInfo4x4(notation);
    return {
      notation,
      face: notation[0].toUpperCase(),
      direction: t.direction,
      amount: t.direction === 'DOUBLE' ? 2 : t.direction === 'CCW' ? -1 : 1,
      description: t.wording,
      stage: 'Stage 1 of 4: Build the Centres',
    };
  });

  return { moves, state: cur };
}

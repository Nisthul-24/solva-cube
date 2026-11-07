import { FaceLayout, Move, Puzzle, PuzzleColor, ValidationResult } from '../../types/puzzle';
import {
  Cube2x2State,
  DEFAULT_2X2_SOLVED,
  FaceName2x2,
  applyMoveTo2x2State,
  clone2x2State,
  is2x2Solved,
} from './cube2x2Facelets';
import { validate2x2State } from './validation2x2';
import { normalize2x2State } from './cubeRotations';
import { parseMoveNotation } from '../core/cubeUtils';

const FACES_2X2: FaceLayout[] = [
  { id: 'U', name: 'Up', defaultColor: 'white', gridSize: 2 },
  { id: 'L', name: 'Left', defaultColor: 'orange', gridSize: 2 },
  { id: 'F', name: 'Front', defaultColor: 'green', gridSize: 2 },
  { id: 'R', name: 'Right', defaultColor: 'red', gridSize: 2 },
  { id: 'B', name: 'Back', defaultColor: 'blue', gridSize: 2 },
  { id: 'D', name: 'Down', defaultColor: 'yellow', gridSize: 2 },
];

const COLORS_2X2: PuzzleColor[] = [
  'white',
  'yellow',
  'green',
  'blue',
  'red',
  'orange',
];

export const MOVES_2X2 = [
  'U', "U'", 'U2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'B', "B'", 'B2',
];

// Fixed corner DBL pos defs for the 7 movable corners:
// 0: UBL, 1: UBR, 2: UFL, 3: UFR, 4: DFL, 5: DFR, 6: DBR
const MOVABLE_CORNER_POS_DEFS: Array<{
  name: string;
  f1: FaceName2x2;
  i1: number;
  f2: FaceName2x2;
  i2: number;
  f3: FaceName2x2;
  i3: number;
}> = [
  { name: 'UBL', f1: 'U', i1: 0, f2: 'B', i2: 1, f3: 'L', i3: 0 },
  { name: 'UBR', f1: 'U', i1: 1, f2: 'R', i2: 1, f3: 'B', i3: 0 },
  { name: 'UFL', f1: 'U', i1: 2, f2: 'L', i2: 1, f3: 'F', i3: 0 },
  { name: 'UFR', f1: 'U', i1: 3, f2: 'F', i2: 1, f3: 'R', i3: 0 },
  { name: 'DFL', f1: 'D', i1: 0, f2: 'F', i2: 2, f3: 'L', i3: 3 },
  { name: 'DFR', f1: 'D', i1: 1, f2: 'R', i2: 2, f3: 'F', i3: 3 },
  { name: 'DBR', f1: 'D', i1: 3, f2: 'B', i2: 2, f3: 'R', i3: 3 },
];

// Solved colors for each corner 0..6
const SOLVED_CORNER_KEYS = [
  ['white', 'blue', 'orange'].sort().join('-'),   // 0: UBL
  ['white', 'red', 'blue'].sort().join('-'),     // 1: UBR
  ['white', 'orange', 'green'].sort().join('-'), // 2: UFL
  ['white', 'green', 'red'].sort().join('-'),    // 3: UFR
  ['yellow', 'green', 'orange'].sort().join('-'),// 4: DFL
  ['yellow', 'red', 'green'].sort().join('-'),   // 5: DFR
  ['yellow', 'blue', 'red'].sort().join('-'),    // 6: DBR
];

const COLOR_KEY_TO_PIECE_ID: Record<string, number> = {};
SOLVED_CORNER_KEYS.forEach((k, idx) => {
  COLOR_KEY_TO_PIECE_ID[k] = idx;
});

// Move definitions on 7 corners:
const BASE_MOVES_7: Record<string, { p: number[]; o: number[] }> = {
  U: { p: [2, 0, 3, 1, 4, 5, 6], o: [0, 0, 0, 0, 0, 0, 0] },
  R: { p: [0, 3, 2, 5, 4, 6, 1], o: [0, 2, 0, 1, 0, 2, 1] },
  F: { p: [0, 1, 4, 2, 5, 3, 6], o: [0, 0, 1, 2, 2, 1, 0] },
};

function applyMoveTo7(
  state: { p: number[]; o: number[] },
  m: { p: number[]; o: number[] }
) {
  const nextP = new Array(7);
  const nextO = new Array(7);
  for (let i = 0; i < 7; i++) {
    const src = m.p[i];
    nextP[i] = state.p[src];
    nextO[i] = (state.o[src] + m.o[i]) % 3;
  }
  return { p: nextP, o: nextO };
}

interface Move7Def {
  name: string;
  face: string;
  m: { p: number[]; o: number[] };
}

const ALL_MOVES_7: Move7Def[] = [];
['U', 'R', 'F'].forEach((f) => {
  const m1 = BASE_MOVES_7[f];
  const m2 = applyMoveTo7(m1, m1);
  const m3 = applyMoveTo7(m2, m1);
  ALL_MOVES_7.push({ name: f, face: f, m: m1 });
  ALL_MOVES_7.push({ name: `${f}2`, face: f, m: m2 });
  ALL_MOVES_7.push({ name: `${f}'`, face: f, m: m3 });
});

function permToIdx(p: number[]): number {
  let idx = 0;
  for (let i = 0; i < 6; i++) {
    idx *= 7 - i;
    let count = 0;
    for (let j = i + 1; j < 7; j++) {
      if (p[j] < p[i]) count++;
    }
    idx += count;
  }
  return idx;
}

function oriToIdx(o: number[]): number {
  let idx = 0;
  for (let i = 0; i < 6; i++) {
    idx = idx * 3 + o[i];
  }
  return idx;
}

function c4ToIdx(p: number[], o: number[]): number {
  const used = new Array(7).fill(false);
  let pIdx = 0;
  for (let piece = 0; piece < 4; piece++) {
    pIdx *= 7 - piece;
    const pos = p.indexOf(piece);
    let count = 0;
    for (let j = 0; j < pos; j++) {
      if (!used[j]) count++;
    }
    pIdx += count;
    used[pos] = true;
  }
  let oIdx = 0;
  for (let piece = 0; piece < 4; piece++) {
    const pos = p.indexOf(piece);
    oIdx = oIdx * 3 + o[pos];
  }
  return pIdx * 81 + oIdx;
}

// Global cached pruning tables (built once)
let permDistTable: Int8Array | null = null;
let oriDistTable: Int8Array | null = null;
let c4DistTable: Int8Array | null = null;

function ensurePruningTables() {
  if (permDistTable && oriDistTable && c4DistTable) return;

  // 1. Permutation table (5040 states)
  const permDist = new Int8Array(5040).fill(-1);
  permDist[0] = 0;
  let pQueue: number[][] = [[0, 1, 2, 3, 4, 5, 6]];
  let depth = 0;
  while (pQueue.length > 0) {
    depth++;
    const nextQ: number[][] = [];
    for (const cur of pQueue) {
      for (const { m } of ALL_MOVES_7) {
        const nextP = new Array(7);
        for (let i = 0; i < 7; i++) nextP[i] = cur[m.p[i]];
        const idx = permToIdx(nextP);
        if (permDist[idx] === -1) {
          permDist[idx] = depth;
          nextQ.push(nextP);
        }
      }
    }
    pQueue = nextQ;
  }

  // 2. Orientation table (729 states)
  const oriDist = new Int8Array(729).fill(-1);
  oriDist[0] = 0;
  let oQueue: number[][] = [[0, 0, 0, 0, 0, 0, 0]];
  depth = 0;
  while (oQueue.length > 0) {
    depth++;
    const nextQ: number[][] = [];
    for (const cur of oQueue) {
      for (const { m } of ALL_MOVES_7) {
        const nextO = new Array(7);
        for (let i = 0; i < 7; i++) nextO[i] = (cur[m.p[i]] + m.o[i]) % 3;
        const idx = oriToIdx(nextO);
        if (oriDist[idx] === -1) {
          oriDist[idx] = depth;
          nextQ.push(nextO);
        }
      }
    }
    oQueue = nextQ;
  }

  // 3. C4 table (68040 states)
  const c4Dist = new Int8Array(68040).fill(-1);
  c4Dist[0] = 0;
  let c4Queue: Array<{ p: number[]; o: number[] }> = [
    { p: [0, 1, 2, 3, 4, 5, 6], o: [0, 0, 0, 0, 0, 0, 0] },
  ];
  depth = 0;
  while (c4Queue.length > 0) {
    depth++;
    const nextQ: Array<{ p: number[]; o: number[] }> = [];
    for (const cur of c4Queue) {
      for (const { m } of ALL_MOVES_7) {
        const next = applyMoveTo7(cur, m);
        const idx = c4ToIdx(next.p, next.o);
        if (c4Dist[idx] === -1) {
          c4Dist[idx] = depth;
          nextQ.push(next);
        }
      }
    }
    c4Queue = nextQ;
  }

  permDistTable = permDist;
  oriDistTable = oriDist;
  c4DistTable = c4Dist;
}

function getHeuristic(p: number[], o: number[]): number {
  ensurePruningTables();
  const h1 = permDistTable![permToIdx(p)];
  const h2 = oriDistTable![oriToIdx(o)];
  const h3 = c4DistTable![c4ToIdx(p, o)];
  return Math.max(h1, h2, h3);
}

function solveWithIDA(start: { p: number[]; o: number[] }): string[] {
  const h0 = getHeuristic(start.p, start.o);
  if (h0 === 0) return [];

  let bound = h0;
  let path: string[] = [];

  function search(
    state: { p: number[]; o: number[] },
    g: number,
    lastFace: string
  ): boolean {
    const h = getHeuristic(state.p, state.o);
    if (h === 0) return true;
    if (g + h > bound) return false;

    for (const { name, face, m } of ALL_MOVES_7) {
      if (face === lastFace) continue;
      const next = applyMoveTo7(state, m);
      path.push(name);
      if (search(next, g + 1, face)) return true;
      path.pop();
    }
    return false;
  }

  while (bound <= 11) {
    path = [];
    if (search(start, 0, '')) {
      return path;
    }
    bound++;
  }

  throw new Error('No 2x2 solution found within 11 moves.');
}

export class Cube2x2Solver implements Puzzle<Cube2x2State> {
  readonly id = '2x2' as const;
  readonly name = '2x2 Pocket Cube';
  readonly colors = COLORS_2X2;

  constructor() {
    // Precompute pruning tables on solver initialization
    ensurePruningTables();
  }

  getFaces(): FaceLayout[] {
    return FACES_2X2;
  }

  getSolvedState(): Cube2x2State {
    return clone2x2State(DEFAULT_2X2_SOLVED);
  }

  validate(state: Cube2x2State): ValidationResult {
    return validate2x2State(state);
  }

  applyMove(state: Cube2x2State, move: string | Move): Cube2x2State {
    return applyMoveTo2x2State(state, move);
  }

  isSolved(state: Cube2x2State): boolean {
    return is2x2Solved(state);
  }

  cloneState(state: Cube2x2State): Cube2x2State {
    return clone2x2State(state);
  }

  solve(state: Cube2x2State): Move[] {
    const validation = this.validate(state);
    if (!validation.valid) {
      throw new Error(validation.details || validation.error || 'Invalid 2x2 cube state');
    }

    if (this.isSolved(state)) {
      return [];
    }

    // 1. Normalise user input: find orientation matching DBL corner
    const { normalized, orientation } = normalize2x2State(state);

    // 2. Extract permutation and orientation arrays for 7 movable corners
    const pArr: number[] = [];
    const oArr: number[] = [];
    for (const def of MOVABLE_CORNER_POS_DEFS) {
      const c1 = normalized[def.f1][def.i1];
      const c2 = normalized[def.f2][def.i2];
      const c3 = normalized[def.f3][def.i3];
      const key = [c1, c2, c3].sort().join('-');
      const pieceId = COLOR_KEY_TO_PIECE_ID[key];
      if (pieceId === undefined) {
        throw new Error(`Unrecognised corner piece colours: ${c1}-${c2}-${c3}`);
      }
      pArr.push(pieceId);
      const o =
        c1 === 'white' || c1 === 'yellow'
          ? 0
          : c2 === 'white' || c2 === 'yellow'
          ? 1
          : 2;
      oArr.push(o);
    }

    // 3. Solve with optimal IDA* using {U, R, F} (max 11 moves)
    const rawMoves = solveWithIDA({ p: pArr, o: oArr });

    // 4. Map solution moves back to user's real orientation
    const convertedMoves = rawMoves.map((rawMove) => {
      const f = rawMove[0] as FaceName2x2;
      const suffix = rawMove.slice(1);
      const origFace = orientation.mapFace[f] || f;
      return `${origFace}${suffix}`;
    });

    const mid = Math.max(1, Math.floor(convertedMoves.length / 2));
    return convertedMoves.map((m, idx) => {
      const stage =
        idx < mid ? 'Stage 1: Solve First Layer' : 'Stage 2: Solve Last Layer';
      return parseMoveNotation(m, stage);
    });
  }

  scramble(movesCount = 15): { moves: Move[]; state: Cube2x2State } {
    let state = this.getSolvedState();
    const moves: Move[] = [];
    let lastFace = '';

    for (let i = 0; i < movesCount; i++) {
      const candidates = MOVES_2X2.filter((m) => m[0] !== lastFace);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const move = parseMoveNotation(chosen, 'Scramble');
      moves.push(move);
      state = this.applyMove(state, move);
      lastFace = move.face;
    }

    return { moves, state };
  }
}

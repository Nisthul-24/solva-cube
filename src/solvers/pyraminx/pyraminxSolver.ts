import { FaceLayout, Move, Puzzle, PuzzleColor, ValidationResult } from '../../types/puzzle';
import {
  DEFAULT_PYRAMINX_SOLVED,
  FaceNamePyraminx,
  PyraminxColor,
  PyraminxState,
  applyMoveToPyraminxState,
  clonePyraminxState,
  isPyraminxSolved,
} from './pyraminxFacelets';
import {
  validatePyraminxDerived,
  deriveTargetFaceColors,
  PyraminxValidationResult,
} from './pyraminxDerivedTarget';
import {
  PYRAMINX_STICKERS_3D,
  PYRAMINX_MOVE_PERMUTATIONS,
  ALL_16_PYRAMINX_MOVES,
} from './pyraminxGeometry';

const FACES_PYRAMINX: FaceLayout[] = [
  { id: 'F', name: 'Front', defaultColor: 'green', gridSize: 3, isTriangle: true },
  { id: 'R', name: 'Right', defaultColor: 'red', gridSize: 3, isTriangle: true },
  { id: 'L', name: 'Left', defaultColor: 'blue', gridSize: 3, isTriangle: true },
  { id: 'D', name: 'Bottom', defaultColor: 'yellow', gridSize: 3, isTriangle: true },
];

const COLORS_PYRAMINX: PuzzleColor[] = ['green', 'red', 'blue', 'yellow'];

const BODY_MOVE_NAMES = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"];
const TIP_MOVE_NAMES = ['u', "u'", 'l', "l'", 'r', "r'", 'b', "b'"];

export const PYRAMINX_WORDINGS: Record<string, { action: string; hint: string }> = {
  U: { action: 'Turn top layer clockwise', hint: 'Looking down at top corner.' },
  "U'": { action: 'Turn top layer counter-clockwise', hint: 'Looking down at top corner.' },
  u: { action: 'Twist top tip clockwise', hint: 'Twist only the top point.' },
  "u'": { action: 'Twist top tip counter-clockwise', hint: 'Twist only the top point.' },
  L: { action: 'Turn bottom-left corner clockwise', hint: 'Looking at left corner.' },
  "L'": { action: 'Turn bottom-left corner counter-clockwise', hint: 'Looking at left corner.' },
  l: { action: 'Twist bottom-left tip clockwise', hint: 'Twist only the left point.' },
  "l'": { action: 'Twist bottom-left tip counter-clockwise', hint: 'Twist only the left point.' },
  R: { action: 'Turn bottom-right corner clockwise', hint: 'Looking at right corner.' },
  "R'": { action: 'Turn bottom-right corner counter-clockwise', hint: 'Looking at right corner.' },
  r: { action: 'Twist bottom-right tip clockwise', hint: 'Twist only the right point.' },
  "r'": { action: 'Twist bottom-right tip counter-clockwise', hint: 'Twist only the right point.' },
  B: { action: 'Turn back corner clockwise', hint: 'Looking at rear corner.' },
  "B'": { action: 'Turn back corner counter-clockwise', hint: 'Looking at rear corner.' },
  b: { action: 'Twist back tip clockwise', hint: 'Twist only the rear point.' },
  "b'": { action: 'Twist back tip counter-clockwise', hint: 'Twist only the rear point.' },
};

export function formatDynamicPyraminxMove(
  notation: string,
  target: Record<FaceNamePyraminx, PyraminxColor>,
  stage?: string
): Move {
  const clean = notation.trim();
  const face = clean[0].toUpperCase();
  const isTip = clean[0] === clean[0].toLowerCase();
  const isCCW = clean.includes("'");

  const bottomCol = target.D.toUpperCase();
  const frontCol = target.F.toUpperCase();
  const holdPrefix = `Hold pyramid with [${bottomCol}] on bottom and [${frontCol}] toward you: `;

  let actionDesc = '';
  let hint = '';

  switch (clean) {
    case 'U':
      actionDesc = `${holdPrefix}turn top layer clockwise`;
      hint = `Looking down at top corner (above ${target.F}, ${target.R}, and ${target.L} faces).`;
      break;
    case "U'":
      actionDesc = `${holdPrefix}turn top layer counter-clockwise`;
      hint = `Looking down at top corner (above ${target.F}, ${target.R}, and ${target.L} faces).`;
      break;
    case 'u':
      actionDesc = `${holdPrefix}twist top tip clockwise`;
      hint = 'Twist only the top point.';
      break;
    case "u'":
      actionDesc = `${holdPrefix}twist top tip counter-clockwise`;
      hint = 'Twist only the top point.';
      break;
    case 'L':
      actionDesc = `${holdPrefix}turn bottom-left corner clockwise`;
      hint = `Looking at left corner (between ${target.F}, ${target.L}, and ${target.D} faces).`;
      break;
    case "L'":
      actionDesc = `${holdPrefix}turn bottom-left corner counter-clockwise`;
      hint = `Looking at left corner (between ${target.F}, ${target.L}, and ${target.D} faces).`;
      break;
    case 'l':
      actionDesc = `${holdPrefix}twist bottom-left tip clockwise`;
      hint = 'Twist only the left point.';
      break;
    case "l'":
      actionDesc = `${holdPrefix}twist bottom-left tip counter-clockwise`;
      hint = 'Twist only the left point.';
      break;
    case 'R':
      actionDesc = `${holdPrefix}turn bottom-right corner clockwise`;
      hint = `Looking at right corner (between ${target.F}, ${target.R}, and ${target.D} faces).`;
      break;
    case "R'":
      actionDesc = `${holdPrefix}turn bottom-right corner counter-clockwise`;
      hint = `Looking at right corner (between ${target.F}, ${target.R}, and ${target.D} faces).`;
      break;
    case 'r':
      actionDesc = `${holdPrefix}twist bottom-right tip clockwise`;
      hint = 'Twist only the right point.';
      break;
    case "r'":
      actionDesc = `${holdPrefix}twist bottom-right tip counter-clockwise`;
      hint = 'Twist only the right point.';
      break;
    case 'B':
      actionDesc = `${holdPrefix}turn back corner clockwise`;
      hint = `Looking at rear corner (between ${target.R}, ${target.L}, and ${target.D} faces).`;
      break;
    case "B'":
      actionDesc = `${holdPrefix}turn back corner counter-clockwise`;
      hint = `Looking at rear corner (between ${target.R}, ${target.L}, and ${target.D} faces).`;
      break;
    case 'b':
      actionDesc = `${holdPrefix}twist back tip clockwise`;
      hint = 'Twist only the rear point.';
      break;
    case "b'":
      actionDesc = `${holdPrefix}twist back tip counter-clockwise`;
      hint = 'Twist only the rear point.';
      break;
    default:
      actionDesc = `${holdPrefix}turn ${clean}`;
      break;
  }

  return {
    notation: clean,
    face,
    direction: isCCW ? 'CCW' : 'CW',
    amount: isCCW ? -1 : 1,
    description: actionDesc,
    stage,
  };
}

export function parsePyraminxMove(notation: string, stage?: string): Move {
  const clean = notation.trim();
  const face = clean[0].toUpperCase();
  const isCCW = clean.includes("'");
  return {
    notation: clean,
    face,
    direction: isCCW ? 'CCW' : 'CW',
    amount: isCCW ? -1 : 1,
    description: `Turn ${clean}`,
    stage,
  };
}

// 12 physical edge stickers in 0..35
const EDGE_STICKER_INDICES = PYRAMINX_STICKERS_3D
  .map((s, idx) => ({ s, idx }))
  .filter((x) => x.s.type === 'edge')
  .map((x) => x.idx);

// Solved colors as 0..3 (F:0, R:1, L:2, D:3)
const SOLVED_FLAT_COLORS: number[] = new Array(36);
for (let i = 0; i < 36; i++) {
  const face = PYRAMINX_STICKERS_3D[i].face;
  SOLVED_FLAT_COLORS[i] = face === 'F' ? 0 : face === 'R' ? 1 : face === 'L' ? 2 : 3;
}

function applyPermutation(state: number[], perm: number[]): number[] {
  const next = new Array(36);
  for (let i = 0; i < 36; i++) {
    next[perm[i]] = state[i];
  }
  return next;
}

function hashEdges(state: number[]): string {
  let s = '';
  for (let i = 0; i < 12; i++) {
    s += state[EDGE_STICKER_INDICES[i]];
  }
  return s;
}

function isBodySolved(state: number[]): boolean {
  for (let i = 0; i < 36; i++) {
    if (PYRAMINX_STICKERS_3D[i].type !== 'tip' && state[i] !== SOLVED_FLAT_COLORS[i]) {
      return false;
    }
  }
  return true;
}

// Global cached pruning table for edges (11,520 states)
let edgePruningTable: Map<string, number> | null = null;

function ensurePyraminxPruningTable() {
  if (edgePruningTable) return;

  const table = new Map<string, number>();
  const startHash = hashEdges(SOLVED_FLAT_COLORS);
  table.set(startHash, 0);

  let queue: number[][] = [SOLVED_FLAT_COLORS];
  let depth = 0;

  while (queue.length > 0) {
    depth++;
    const nextQ: number[][] = [];
    for (const cur of queue) {
      for (const m of BODY_MOVE_NAMES) {
        const next = applyPermutation(cur, PYRAMINX_MOVE_PERMUTATIONS[m]);
        const h = hashEdges(next);
        if (!table.has(h)) {
          table.set(h, depth);
          nextQ.push(next);
        }
      }
    }
    queue = nextQ;
  }

  edgePruningTable = table;
}

function solvePyraminxBodyIDA(startState: number[]): string[] {
  ensurePyraminxPruningTable();
  const startH = edgePruningTable!.get(hashEdges(startState)) ?? 11;
  if (isBodySolved(startState)) return [];

  let bound = startH;
  let path: string[] = [];

  function search(state: number[], g: number, lastFace: string): boolean {
    const h = edgePruningTable!.get(hashEdges(state)) ?? 11;
    if (g + h > bound) return false;
    if (isBodySolved(state)) return true;

    for (const m of BODY_MOVE_NAMES) {
      if (m[0] === lastFace) continue;
      const next = applyPermutation(state, PYRAMINX_MOVE_PERMUTATIONS[m]);
      path.push(m);
      if (search(next, g + 1, m[0])) return true;
      path.pop();
    }
    return false;
  }

  while (bound <= 11) {
    path = [];
    if (search(startState, 0, '')) {
      return path;
    }
    bound++;
  }

  throw new Error('Could not find Pyraminx solution within 11 moves.');
}

export class PyraminxSolver implements Puzzle<PyraminxState> {
  readonly id = 'pyraminx' as const;
  readonly name = 'Pyraminx';
  readonly colors = COLORS_PYRAMINX;

  constructor() {
    ensurePyraminxPruningTable();
  }

  getFaces(): FaceLayout[] {
    return FACES_PYRAMINX;
  }

  getSolvedState(): PyraminxState {
    return clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
  }

  validate(state: PyraminxState): PyraminxValidationResult {
    return validatePyraminxDerived(state);
  }

  applyMove(state: PyraminxState, move: string | Move): PyraminxState {
    return applyMoveToPyraminxState(state, move);
  }

  isSolved(state: PyraminxState): boolean {
    return isPyraminxSolved(state);
  }

  cloneState(state: PyraminxState): PyraminxState {
    return clonePyraminxState(state);
  }

  solve(state: PyraminxState): Move[] {
    const validation = this.validate(state);
    if (!validation.valid || !validation.derivedTargets) {
      throw new Error(validation.details || validation.error || 'Invalid Pyraminx state');
    }

    const target = validation.derivedTargets;
    const isTargetSolved = (['F', 'R', 'L', 'D'] as FaceNamePyraminx[]).every(
      (f) => state[f].every((c) => c === target[f])
    );
    if (isTargetSolved) {
      return [];
    }

    let cur = clonePyraminxState(state);
    const resultMoves: string[] = [];

    // 1. Solve body (axials + edges) first with optimal IDA*
    // Map target colors directly to 0..3 (F:0, R:1, L:2, D:3)
    const colorMap: Record<string, number> = {
      [target.F]: 0,
      [target.R]: 1,
      [target.L]: 2,
      [target.D]: 3,
    };

    const flatCur = new Array(36);
    for (let i = 0; i < 36; i++) {
      const s = PYRAMINX_STICKERS_3D[i];
      flatCur[i] = colorMap[cur[s.face][s.index]];
    }

    const bodyMoves = solvePyraminxBodyIDA(flatCur);
    resultMoves.push(...bodyMoves);
    for (const bm of bodyMoves) {
      cur = applyMoveToPyraminxState(cur, bm);
    }

    // 2. Solve 4 tips independently to match derived target face colors
    // Tip U: sticker F0 vs target F
    if (cur.F[0] !== target.F) {
      const testU = applyMoveToPyraminxState(cur, 'u');
      if (testU.F[0] === target.F) {
        resultMoves.push('u');
        cur = testU;
      } else {
        resultMoves.push("u'");
        cur = applyMoveToPyraminxState(cur, "u'");
      }
    }

    // Tip L: sticker F4 vs target F
    if (cur.F[4] !== target.F) {
      const testL = applyMoveToPyraminxState(cur, 'l');
      if (testL.F[4] === target.F) {
        resultMoves.push('l');
        cur = testL;
      } else {
        resultMoves.push("l'");
        cur = applyMoveToPyraminxState(cur, "l'");
      }
    }

    // Tip R: sticker F8 vs target F
    if (cur.F[8] !== target.F) {
      const testR = applyMoveToPyraminxState(cur, 'r');
      if (testR.F[8] === target.F) {
        resultMoves.push('r');
        cur = testR;
      } else {
        resultMoves.push("r'");
        cur = applyMoveToPyraminxState(cur, "r'");
      }
    }

    // Tip B: sticker R8 vs target R
    if (cur.R[8] !== target.R) {
      const testB = applyMoveToPyraminxState(cur, 'b');
      if (testB.R[8] === target.R) {
        resultMoves.push('b');
        cur = testB;
      } else {
        resultMoves.push("b'");
        cur = applyMoveToPyraminxState(cur, "b'");
      }
    }

    // 3. Format moves with dynamic plain-English wording using actual target color names
    const userMoves: Move[] = resultMoves.map((m) => {
      const isTip = m[0] === m[0].toLowerCase();
      const stage = isTip ? 'Stage 2: Solve Tips' : 'Stage 1: Solve Centres & Edges';
      return formatDynamicPyraminxMove(m, target, stage);
    });

    // 4. Verify solution replays to solved target on original state
    let verify = clonePyraminxState(state);
    for (const um of userMoves) {
      verify = applyMoveToPyraminxState(verify, um);
    }

    const finalSolved = (['F', 'R', 'L', 'D'] as FaceNamePyraminx[]).every(
      (f) => verify[f].every((c) => c === target[f])
    );

    if (!finalSolved) {
      throw new Error(
        'We could not solve this. Please recheck the colours on your Pyraminx.'
      );
    }

    return userMoves;
  }

  scramble(movesCount = 15): { moves: Move[]; state: PyraminxState } {
    let state = this.getSolvedState();
    const moves: Move[] = [];
    let lastFace = '';

    for (let i = 0; i < movesCount; i++) {
      const candidates = ALL_16_PYRAMINX_MOVES.filter((m) => m[0].toUpperCase() !== lastFace);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const target = { F: 'green', R: 'red', L: 'blue', D: 'yellow' } as Record<FaceNamePyraminx, PyraminxColor>;
      const move = formatDynamicPyraminxMove(chosen, target, 'Scramble');
      moves.push(move);
      state = this.applyMove(state, move);
      lastFace = move.face;
    }

    return { moves, state };
  }
}

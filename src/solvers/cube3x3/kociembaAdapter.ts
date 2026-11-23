import Cube from 'cubejs';
import { CubeColor, Move } from '../../types/puzzle';
import { Cube3x3State, FaceName3x3 } from './cube3x3Facelets';
import { parseMoveNotation } from '../core/cubeUtils';
import { debugLogger } from '../../services/debugLogger';

const RawCube = Cube as any;

const COLOR_TO_FACELET: Record<CubeColor, FaceName3x3> = {
  white: 'U',
  red: 'R',
  green: 'F',
  yellow: 'D',
  orange: 'L',
  blue: 'B',
};

const FACELET_TO_COLOR: Record<FaceName3x3, CubeColor> = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

// Cube table dimensions
const N_TWIST = 2187;
const N_FLIP = 2048;
const N_PARITY = 2;
const N_FRtoBR = 11880;
const N_SLICE1 = 495;
const N_SLICE2 = 24;
const N_URFtoDLF = 20160;
const N_URtoDF = 20160;

const allMoves1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const allMoves2 = [0, 1, 2, 4, 7, 9, 10, 11, 13, 16];

const MOVE_TABLE_NAMES = [
  'twist',
  'flip',
  'FRtoBR',
  'URFtoDLF',
  'URtoDF',
  'URtoUL',
  'UBtoDF',
  'mergeURtoDF',
];

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setPruning(table: Int32Array, index: number, value: number) {
  const pos = index % 8;
  const slot = index >> 3;
  const shift = pos << 2;
  table[slot] &= ~(0xF << shift);
  table[slot] |= value << shift;
}

function getPruning(table: Int32Array, index: number) {
  const pos = index % 8;
  const slot = index >> 3;
  const shift = pos << 2;
  return (table[slot] & (0xF << shift)) >>> shift;
}

async function computePruningChunked(
  phase: 1 | 2,
  size: number,
  currentCoords: (index: number) => number[],
  nextIndex: (current: number[], move: number) => number
): Promise<number[]> {
  const table = new Int32Array(Math.ceil(size / 8));
  table.fill(-1);
  const moves = phase === 1 ? allMoves1 : allMoves2;
  let depth = 0;
  setPruning(table, 0, depth);
  let done = 1;
  let lastYield = Date.now();

  while (done !== size) {
    for (let index = 0; index < size; index++) {
      if (getPruning(table, index) !== depth) continue;
      const current = currentCoords(index);
      for (let o = 0; o < moves.length; o++) {
        const move = moves[o];
        const next = nextIndex(current, move);
        if (getPruning(table, next) === 0xF) {
          setPruning(table, next, depth + 1);
          done++;
        }
      }
      // Yield to the event loop every 20ms to keep animations and touches 100% fluid
      if (Date.now() - lastYield > 20) {
        await yieldToEventLoop();
        lastYield = Date.now();
      }
    }
    depth++;
  }

  return Array.from(table);
}

let isSolverInitialized = false;
let initPromise: Promise<void> | null = null;
const readyCallbacks = new Set<() => void>();

export function isCube3x3SolverReady(): boolean {
  return isSolverInitialized;
}

export function onCube3x3SolverReady(cb: () => void): () => void {
  if (isSolverInitialized) {
    cb();
    return () => {};
  }
  readyCallbacks.add(cb);
  return () => {
    readyCallbacks.delete(cb);
  };
}

export async function initCube3x3Solver(): Promise<void> {
  // If already initialized in Cubejs, check move and pruning tables
  if (isSolverInitialized) return;
  if (
    RawCube.pruningTables.sliceTwist &&
    RawCube.pruningTables.sliceFlip &&
    RawCube.pruningTables.sliceURFtoDLFParity &&
    RawCube.pruningTables.sliceURtoDFParity
  ) {
    isSolverInitialized = true;
    readyCallbacks.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
    readyCallbacks.clear();
    return;
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const startTime = Date.now();
    debugLogger.log('Cube.initSolver() chunked warm-up started');

    try {
      // 1. Compute 8 Move Tables with cooperative yielding between tables
      for (const name of MOVE_TABLE_NAMES) {
        if (RawCube.moveTables[name] === null) {
          RawCube.computeMoveTables(name);
          await yieldToEventLoop();
        }
      }

      // 2. Compute 4 Pruning Tables with 20ms cooperative chunked BFS
      if (RawCube.pruningTables.sliceTwist === null) {
        RawCube.pruningTables.sliceTwist = await computePruningChunked(
          1,
          N_SLICE1 * N_TWIST,
          (index) => [index % N_SLICE1, (index / N_SLICE1) | 0],
          (current, move) => {
            const newSlice = (RawCube.moveTables.FRtoBR[current[0] * 24][move] / 24) | 0;
            const newTwist = RawCube.moveTables.twist[current[1]][move];
            return newTwist * N_SLICE1 + newSlice;
          }
        );
        await yieldToEventLoop();
      }

      if (RawCube.pruningTables.sliceFlip === null) {
        RawCube.pruningTables.sliceFlip = await computePruningChunked(
          1,
          N_SLICE1 * N_FLIP,
          (index) => [index % N_SLICE1, (index / N_SLICE1) | 0],
          (current, move) => {
            const newSlice = (RawCube.moveTables.FRtoBR[current[0] * 24][move] / 24) | 0;
            const newFlip = RawCube.moveTables.flip[current[1]][move];
            return newFlip * N_SLICE1 + newSlice;
          }
        );
        await yieldToEventLoop();
      }

      if (RawCube.pruningTables.sliceURFtoDLFParity === null) {
        RawCube.pruningTables.sliceURFtoDLFParity = await computePruningChunked(
          2,
          N_SLICE2 * N_URFtoDLF * N_PARITY,
          (index) => [index % 2, ((index / 2) | 0) % N_SLICE2, (((index / 2) | 0) / N_SLICE2) | 0],
          (current, move) => {
            const newParity = RawCube.moveTables.parity[current[0]][move];
            const newSlice = RawCube.moveTables.FRtoBR[current[1]][move];
            const newURFtoDLF = RawCube.moveTables.URFtoDLF[current[2]][move];
            return (newURFtoDLF * N_SLICE2 + newSlice) * 2 + newParity;
          }
        );
        await yieldToEventLoop();
      }

      if (RawCube.pruningTables.sliceURtoDFParity === null) {
        RawCube.pruningTables.sliceURtoDFParity = await computePruningChunked(
          2,
          N_SLICE2 * N_URtoDF * N_PARITY,
          (index) => [index % 2, ((index / 2) | 0) % N_SLICE2, (((index / 2) | 0) / N_SLICE2) | 0],
          (current, move) => {
            const newParity = RawCube.moveTables.parity[current[0]][move];
            const newSlice = RawCube.moveTables.FRtoBR[current[1]][move];
            const newURtoDF = RawCube.moveTables.URtoDF[current[2]][move];
            return (newURtoDF * N_SLICE2 + newSlice) * 2 + newParity;
          }
        );
        await yieldToEventLoop();
      }

      const duration = Date.now() - startTime;
      isSolverInitialized = true;
      debugLogger.log(`Cube.initSolver() chunked warm-up completed in ${duration}ms (measured)`);

      readyCallbacks.forEach((cb) => {
        try {
          cb();
        } catch {}
      });
      readyCallbacks.clear();
    } catch (err) {
      debugLogger.error('Cube.initSolver() chunked warm-up failed:', err);
      // Fallback: synchronous init if chunked fails for any reason
      try {
        Cube.initSolver();
        isSolverInitialized = true;
      } catch (e) {
        debugLogger.error('Cube.initSolver() synchronous fallback failed:', e);
      }
    }
  })();

  return initPromise;
}

/**
 * Converts a Cube3x3State into the 54-character string representation for cubejs:
 * 9 chars of U, then R, then F, then D, then L, then B.
 */
export function stateToCubejsString(state: Cube3x3State): string {
  const faces: FaceName3x3[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  let result = '';
  for (const f of faces) {
    for (let i = 0; i < 9; i++) {
      const color = state[f][i];
      const faceChar = COLOR_TO_FACELET[color];
      result += faceChar;
    }
  }
  return result;
}

/**
 * Converts a 54-character string from cubejs back into Cube3x3State.
 */
export function cubejsStringToState(str: string): Cube3x3State {
  if (str.length !== 54) {
    throw new Error(`Invalid cube string length: ${str.length}, expected 54`);
  }

  const faces: FaceName3x3[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  const state: Cube3x3State = {
    U: [],
    R: [],
    F: [],
    D: [],
    L: [],
    B: [],
  };

  for (let fIdx = 0; fIdx < faces.length; fIdx++) {
    const f = faces[fIdx];
    const slice = str.slice(fIdx * 9, (fIdx + 1) * 9);
    state[f] = slice.split('').map((ch) => FACELET_TO_COLOR[ch as FaceName3x3]);
  }

  return state;
}

/**
 * Applies a move to state using cubejs's exact internal 3D simulation.
 */
export function applyMoveWithCubejs(state: Cube3x3State, move: string | Move): Cube3x3State {
  const notation = typeof move === 'string' ? move : move.notation;
  const str = stateToCubejsString(state);
  const cube = Cube.fromString(str);
  cube.move(notation);
  return cubejsStringToState(cube.asString());
}

/**
 * Assigns descriptive two-phase stages to the solution moves.
 */
function assignStagesToMoves(rawMoves: string[]): Move[] {
  const total = rawMoves.length;
  // Phase 1 reduces cube to <U, D, R2, L2, F2, B2> subgroup
  // Phase 2 solves the subgroup
  const midPoint = Math.max(1, Math.floor(total * 0.55));

  return rawMoves.map((m, idx) => {
    let stage: string;
    if (idx < midPoint) {
      stage = 'Stage 1: Orient Edges & Corners';
    } else {
      stage = 'Stage 2: Permute & Solve Cube';
    }
    return parseMoveNotation(m, stage);
  });
}

/**
 * Solves a 3x3 cube state using cubejs Kociemba algorithm.
 */
export async function solve3x3Cube(state: Cube3x3State): Promise<Move[]> {
  await initCube3x3Solver();

  const str = stateToCubejsString(state);
  const cube = Cube.fromString(str);

  if (cube.isSolved()) {
    return [];
  }

  const solutionStr = cube.solve();
  const rawMoves = solutionStr.trim().split(/\s+/).filter(Boolean);
  return assignStagesToMoves(rawMoves);
}

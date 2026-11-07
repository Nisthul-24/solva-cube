import Cube from 'cubejs';
import { CubeColor, Move } from '../../types/puzzle';
import { Cube3x3State, FaceName3x3 } from './cube3x3Facelets';
import { parseMoveNotation } from '../core/cubeUtils';

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

let isSolverInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initCube3x3Solver(): Promise<void> {
  if (isSolverInitialized) return;
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve) => {
    // Run asynchronously to not freeze UI
    setTimeout(() => {
      Cube.initSolver();
      isSolverInitialized = true;
      resolve();
    }, 50);
  });

  return initPromise;
}

export function isCube3x3SolverReady(): boolean {
  return isSolverInitialized;
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


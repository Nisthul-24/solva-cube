import { Move } from '../../types/puzzle';
import {
  FaceNamePyraminx,
  PyraminxColor,
  PYRAMINX_STICKERS_3D,
  PYRAMINX_MOVE_PERMUTATIONS,
  STICKER_KEY_TO_LINEAR_INDEX,
  get12TetrahedralRotations,
  TetrahedralRotation,
  dist,
} from './pyraminxGeometry';

export { FaceNamePyraminx, PyraminxColor };

export type PyraminxState = Record<FaceNamePyraminx, PyraminxColor[]>;

export const DEFAULT_PYRAMINX_SOLVED: PyraminxState = {
  F: ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green', 'green'],
  R: ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
  L: ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
  D: ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
};

export function clonePyraminxState(state: PyraminxState): PyraminxState {
  return {
    F: [...state.F],
    R: [...state.R],
    L: [...state.L],
    D: [...state.D],
  };
}

/**
 * Applies move to Pyraminx state using 3D-generated move permutation tables.
 * Single source of truth guaranteeing model, animation, arrow, and solver agree.
 */
export function applyMoveToPyraminxState(
  state: PyraminxState,
  move: string | Move
): PyraminxState {
  const notation = typeof move === 'string' ? move.trim() : move.notation.trim();
  const perm = PYRAMINX_MOVE_PERMUTATIONS[notation];
  if (!perm) {
    throw new Error(`Unrecognised Pyraminx move: ${notation}`);
  }

  // Convert state to flat 36 array
  const flatState = new Array(36);
  for (let i = 0; i < 36; i++) {
    const s = PYRAMINX_STICKERS_3D[i];
    flatState[i] = state[s.face][s.index];
  }

  // Apply permutation
  const nextFlat = new Array(36);
  for (let i = 0; i < 36; i++) {
    nextFlat[perm[i]] = flatState[i];
  }

  // Convert back to PyraminxState
  const nextState: PyraminxState = {
    F: new Array(9),
    R: new Array(9),
    L: new Array(9),
    D: new Array(9),
  };
  for (let i = 0; i < 36; i++) {
    const s = PYRAMINX_STICKERS_3D[i];
    nextState[s.face][s.index] = nextFlat[i];
  }

  return nextState;
}

export function isPyraminxSolved(state: PyraminxState): boolean {
  const faces: FaceNamePyraminx[] = ['F', 'R', 'L', 'D'];
  for (const f of faces) {
    const faceColors = state[f];
    if (!faceColors || faceColors.length !== 9) return false;
    const first = faceColors[0];
    if (!faceColors.every((c) => c === first)) return false;
  }
  return true;
}

/**
 * Rotate a PyraminxState by a tetrahedral rotation in 3D.
 */
export function rotatePyraminxState(
  state: PyraminxState,
  rot: TetrahedralRotation
): PyraminxState {
  const nextState: PyraminxState = {
    F: new Array(9),
    R: new Array(9),
    L: new Array(9),
    D: new Array(9),
  };

  for (let i = 0; i < 36; i++) {
    const srcSticker = PYRAMINX_STICKERS_3D[i];
    const rotCentroid = rot.rotFn(srcSticker.centroid);

    // Find destination sticker
    let bestIdx = 0;
    let minD = 1e9;
    for (let j = 0; j < 36; j++) {
      const d = dist(rotCentroid, PYRAMINX_STICKERS_3D[j].centroid);
      if (d < minD) {
        minD = d;
        bestIdx = j;
      }
    }

    const destSticker = PYRAMINX_STICKERS_3D[bestIdx];
    nextState[destSticker.face][destSticker.index] = state[srcSticker.face][srcSticker.index];
  }

  return nextState;
}

/**
 * Normalises arbitrary user Pyraminx state by finding the rotation out of the 12
 * tetrahedral rotations that aligns the 4 axial pieces to the standard scheme:
 * - Axial U: {green, red, blue}
 * - Axial L: {green, blue, yellow}
 * - Axial R: {green, red, yellow}
 * - Axial B: {red, blue, yellow}
 */
export function normalizePyraminxState(state: PyraminxState): {
  normalized: PyraminxState;
  rotation: TetrahedralRotation;
} {
  const rotations = get12TetrahedralRotations();

  for (const rot of rotations) {
    const rotated = rotatePyraminxState(state, rot);

    // Check axial U: F2, R2, L2
    const uAxial = [rotated.F[2], rotated.R[2], rotated.L[2]].sort().join('-');
    if (uAxial !== 'blue-green-red') continue;

    // Check axial L: F5, L7, D2
    const lAxial = [rotated.F[5], rotated.L[7], rotated.D[2]].sort().join('-');
    if (lAxial !== 'blue-green-yellow') continue;

    // Check axial R: F7, R5, D7
    const rAxial = [rotated.F[7], rotated.R[5], rotated.D[7]].sort().join('-');
    if (rAxial !== 'green-red-yellow') continue;

    // Check axial B: R7, L5, D5
    const bAxial = [rotated.R[7], rotated.L[5], rotated.D[5]].sort().join('-');
    if (bAxial !== 'blue-red-yellow') continue;

    return { normalized: rotated, rotation: rot };
  }

  throw new Error(
    'Could not align Pyraminx orientation. Please check that your axial piece colours match a legal Pyraminx.'
  );
}

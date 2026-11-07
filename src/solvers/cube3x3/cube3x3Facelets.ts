import { CubeColor, Move } from '../../types/puzzle';

export type FaceName3x3 = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export type Cube3x3State = Record<FaceName3x3, CubeColor[]>;

export const DEFAULT_3X3_SOLVED: Cube3x3State = {
  U: ['white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white'],
  R: ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red'],
  F: ['green', 'green', 'green', 'green', 'green', 'green', 'green', 'green', 'green'],
  D: ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
  L: ['orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange', 'orange'],
  B: ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
};

export function clone3x3State(state: Cube3x3State): Cube3x3State {
  return {
    U: [...state.U],
    R: [...state.R],
    F: [...state.F],
    D: [...state.D],
    L: [...state.L],
    B: [...state.B],
  };
}

/**
 * Rotates a 3x3 face array 90 degrees clockwise:
 * 0 1 2       6 3 0
 * 3 4 5  -->  7 4 1
 * 6 7 8       8 5 2
 */
function rotateFaceCW(face: CubeColor[]): CubeColor[] {
  return [
    face[6], face[3], face[0],
    face[7], face[4], face[1],
    face[8], face[5], face[2],
  ];
}

function rotateFaceCCW(face: CubeColor[]): CubeColor[] {
  return [
    face[2], face[5], face[8],
    face[1], face[4], face[7],
    face[0], face[3], face[6],
  ];
}

function rotateFace180(face: CubeColor[]): CubeColor[] {
  return [
    face[8], face[7], face[6],
    face[5], face[4], face[3],
    face[2], face[1], face[0],
  ];
}

/**
 * Applies a single 90 degree clockwise face turn to 3x3 state.
 */
export function applySingleTurnCW(state: Cube3x3State, face: FaceName3x3): Cube3x3State {
  const next = clone3x3State(state);
  next[face] = rotateFaceCW(state[face]);

  const { U, R, F, D, L, B } = state;

  switch (face) {
    case 'U': {
      // F top -> L top -> B top -> R top -> F top
      next.L[0] = F[0]; next.L[1] = F[1]; next.L[2] = F[2];
      next.B[0] = L[0]; next.B[1] = L[1]; next.B[2] = L[2];
      next.R[0] = B[0]; next.R[1] = B[1]; next.R[2] = B[2];
      next.F[0] = R[0]; next.F[1] = R[1]; next.F[2] = R[2];
      break;
    }
    case 'D': {
      // F bottom -> R bottom -> B bottom -> L bottom -> F bottom
      next.R[6] = F[6]; next.R[7] = F[7]; next.R[8] = F[8];
      next.B[6] = R[6]; next.B[7] = R[7]; next.B[8] = R[8];
      next.L[6] = B[6]; next.L[7] = B[7]; next.L[8] = B[8];
      next.F[6] = L[6]; next.F[7] = L[7]; next.F[8] = L[8];
      break;
    }
    case 'R': {
      // U right -> B left (inverted) -> D right -> F right -> U right
      next.B[6] = U[2]; next.B[3] = U[5]; next.B[0] = U[8];
      next.D[2] = B[6]; next.D[5] = B[3]; next.D[8] = B[0];
      next.F[2] = D[2]; next.F[5] = D[5]; next.F[8] = D[8];
      next.U[2] = F[2]; next.U[5] = F[5]; next.U[8] = F[8];
      break;
    }
    case 'L': {
      // U left -> F left -> D left -> B right (inverted) -> U left
      next.F[0] = U[0]; next.F[3] = U[3]; next.F[6] = U[6];
      next.D[0] = F[0]; next.D[3] = F[3]; next.D[6] = F[6];
      next.B[8] = D[0]; next.B[5] = D[3]; next.B[2] = D[6];
      next.U[0] = B[8]; next.U[3] = B[5]; next.U[6] = B[2];
      break;
    }
    case 'F': {
      // U bottom -> R left -> D top (inverted) -> L right (inverted) -> U bottom
      next.R[0] = U[6]; next.R[3] = U[7]; next.R[6] = U[8];
      next.D[2] = R[0]; next.D[1] = R[3]; next.D[0] = R[6];
      next.L[8] = D[2]; next.L[5] = D[1]; next.L[2] = D[0];
      next.U[6] = L[8]; next.U[7] = L[5]; next.U[8] = L[2];
      break;
    }
    case 'B': {
      // U top -> L left (inverted) -> D bottom (inverted) -> R right -> U top
      // U[0,1,2] -> L[6,3,0] -> D[8,7,6] -> R[2,5,8] -> U[0,1,2]
      next.L[0] = U[2]; next.L[3] = U[1]; next.L[6] = U[0];
      next.D[6] = L[0]; next.D[7] = L[3]; next.D[8] = L[6];
      next.R[8] = D[6]; next.R[5] = D[7]; next.R[2] = D[8];
      next.U[2] = R[8]; next.U[1] = R[5]; next.U[0] = R[2];
      break;
    }
  }

  return next;
}

export function applyMoveTo3x3State(state: Cube3x3State, move: string | Move): Cube3x3State {
  const notation = typeof move === 'string' ? move : move.notation;
  const face = notation[0] as FaceName3x3;
  const modifier = notation.slice(1);

  if (modifier === "'") {
    // 3 clockwise turns = 1 CCW turn
    const s1 = applySingleTurnCW(state, face);
    const s2 = applySingleTurnCW(s1, face);
    return applySingleTurnCW(s2, face);
  } else if (modifier === '2') {
    // 2 turns = 180°
    const s1 = applySingleTurnCW(state, face);
    return applySingleTurnCW(s1, face);
  } else {
    // 1 CW turn
    return applySingleTurnCW(state, face);
  }
}

export function is3x3Solved(state: Cube3x3State): boolean {
  const faces: FaceName3x3[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  for (const f of faces) {
    const color = state[f][0];
    for (let i = 1; i < 9; i++) {
      if (state[f][i] !== color) return false;
    }
  }
  return true;
}


import { CubeColor, Move } from '../../types/puzzle';

export type FaceName2x2 = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export type Cube2x2State = Record<FaceName2x2, CubeColor[]>;

export const DEFAULT_2X2_SOLVED: Cube2x2State = {
  U: ['white', 'white', 'white', 'white'],
  R: ['red', 'red', 'red', 'red'],
  F: ['green', 'green', 'green', 'green'],
  D: ['yellow', 'yellow', 'yellow', 'yellow'],
  L: ['orange', 'orange', 'orange', 'orange'],
  B: ['blue', 'blue', 'blue', 'blue'],
};

export function clone2x2State(state: Cube2x2State): Cube2x2State {
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
 * 2x2 facelet layout:
 *        [U0, U1]
 *        [U2, U3]
 * [L0, L1] [F0, F1] [R0, R1] [B0, B1]
 * [L2, L3] [F2, F3] [R2, R3] [B2, B3]
 *        [D0, D1]
 *        [D2, D3]
 */

function rotateFaceCW(face: CubeColor[]): CubeColor[] {
  // 0->1, 1->3, 3->2, 2->0 => new: [2, 0, 3, 1]
  return [face[2], face[0], face[3], face[1]];
}

export function applySingleTurnCW2x2(state: Cube2x2State, face: FaceName2x2): Cube2x2State {
  const next = clone2x2State(state);
  next[face] = rotateFaceCW(state[face]);

  const { U, R, F, D, L, B } = state;

  switch (face) {
    case 'U': {
      // F top -> L top -> B top -> R top -> F top
      next.L[0] = F[0]; next.L[1] = F[1];
      next.B[0] = L[0]; next.B[1] = L[1];
      next.R[0] = B[0]; next.R[1] = B[1];
      next.F[0] = R[0]; next.F[1] = R[1];
      break;
    }
    case 'D': {
      // F bottom -> R bottom -> B bottom -> L bottom -> F bottom
      next.R[2] = F[2]; next.R[3] = F[3];
      next.B[2] = R[2]; next.B[3] = R[3];
      next.L[2] = B[2]; next.L[3] = B[3];
      next.F[2] = L[2]; next.F[3] = L[3];
      break;
    }
    case 'R': {
      // U right -> B left (inverted) -> D right -> F right -> U right
      next.B[2] = U[1]; next.B[0] = U[3];
      next.D[1] = B[2]; next.D[3] = B[0];
      next.F[1] = D[1]; next.F[3] = D[3];
      next.U[1] = F[1]; next.U[3] = F[3];
      break;
    }
    case 'L': {
      // U left -> F left -> D left -> B right (inverted) -> U left
      next.F[0] = U[0]; next.F[2] = U[2];
      next.D[0] = F[0]; next.D[2] = F[2];
      next.B[3] = D[0]; next.B[1] = D[2];
      next.U[0] = B[3]; next.U[2] = B[1];
      break;
    }
    case 'F': {
      // U bottom -> R left -> D top (inverted) -> L right (inverted) -> U bottom
      next.R[0] = U[2]; next.R[2] = U[3];
      next.D[1] = R[0]; next.D[0] = R[2];
      next.L[3] = D[1]; next.L[1] = D[0];
      next.U[2] = L[3]; next.U[3] = L[1];
      break;
    }
    case 'B': {
      // U top -> L left (inverted) -> D bottom (inverted) -> R right -> U top
      next.L[0] = U[1]; next.L[2] = U[0];
      next.D[2] = L[0]; next.D[3] = L[2];
      next.R[3] = D[2]; next.R[1] = D[3];
      next.U[1] = R[3]; next.U[0] = R[1];
      break;
    }
  }

  return next;
}

export function applyMoveTo2x2State(state: Cube2x2State, move: string | Move): Cube2x2State {
  const notation = typeof move === 'string' ? move : move.notation;
  const face = notation[0] as FaceName2x2;
  const modifier = notation.slice(1);

  if (modifier === "'") {
    const s1 = applySingleTurnCW2x2(state, face);
    const s2 = applySingleTurnCW2x2(s1, face);
    return applySingleTurnCW2x2(s2, face);
  } else if (modifier === '2') {
    const s1 = applySingleTurnCW2x2(state, face);
    return applySingleTurnCW2x2(s1, face);
  } else {
    return applySingleTurnCW2x2(state, face);
  }
}

export function is2x2Solved(state: Cube2x2State): boolean {
  const faces: FaceName2x2[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  for (const f of faces) {
    const color = state[f][0];
    for (let i = 1; i < 4; i++) {
      if (state[f][i] !== color) return false;
    }
  }
  return true;
}


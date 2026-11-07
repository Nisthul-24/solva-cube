import Cube from 'cubejs';
import {
  Puzzle,
  PuzzleId,
  PuzzleColor,
  Move,
  ValidationResult,
  FaceLayout,
  CubeColor,
} from '../../types/puzzle';
import { FaceName3x3 } from '../../components/3d/cubieModel';
import { Cube4x4State } from './cube4x4Types';
import {
  CUBE4X4_FACES,
  getStandardSolved4x4State,
  apply4x4Move,
  turnInfo4x4,
  generate4x4RandomScramble,
  deriveColorSchemeFromCorners,
} from './cube4x4Geometry';
import { solve4x4Centres } from './cube4x4Centres';
import { solve4x4Edges } from './cube4x4Edges';
import { optimizeMoves4x4Objects } from '../core/moveOptimizer4x4';

export const OLL_PARITY_MACRO = [
  'r2', 'B2', 'U2',
  'l', 'U2',
  "r'", 'U2',
  'r', 'U2',
  'F2', 'r', 'F2',
  "l'", 'B2',
  'r2',
];

export const PLL_PARITY_MACRO = ['r2', 'U2', 'r2', 'Uw2', 'r2', 'u2'];

export function getFaceColorsFromCentres(state: Cube4x4State): Record<FaceName3x3, CubeColor> {
  return {
    U: state.U[5],
    R: state.R[5],
    F: state.F[5],
    D: state.D[5],
    L: state.L[5],
    B: state.B[5],
  };
}

export function stateToCubejsString4x4(state: Cube4x4State): string {
  const faceColors = getFaceColorsFromCentres(state);
  const colorToChar: Record<string, string> = {};
  for (const [face, color] of Object.entries(faceColors)) {
    colorToChar[color] = face;
  }

  const FACES: FaceName3x3[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  let res = '';

  for (const f of FACES) {
    const s = state[f];
    const indices = [0, 1, 3, 4, 5, 7, 12, 13, 15];
    for (const idx of indices) {
      const col = s[idx];
      res += colorToChar[col] || 'U';
    }
  }

  return res;
}

export class Cube4x4Solver implements Puzzle<Cube4x4State> {
  id: PuzzleId = '4x4';
  name = '4x4 Revenge Cube';
  colors: PuzzleColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];

  getFaces(): FaceLayout[] {
    return [
      { id: 'U', name: 'Top', defaultColor: 'white', gridSize: 4 },
      { id: 'L', name: 'Left', defaultColor: 'orange', gridSize: 4 },
      { id: 'F', name: 'Front', defaultColor: 'green', gridSize: 4 },
      { id: 'R', name: 'Right', defaultColor: 'red', gridSize: 4 },
      { id: 'B', name: 'Back', defaultColor: 'blue', gridSize: 4 },
      { id: 'D', name: 'Bottom', defaultColor: 'yellow', gridSize: 4 },
    ];
  }

  getSolvedState(): Cube4x4State {
    return getStandardSolved4x4State();
  }

  cloneState(state: Cube4x4State): Cube4x4State {
    return {
      U: [...state.U],
      R: [...state.R],
      F: [...state.F],
      D: [...state.D],
      L: [...state.L],
      B: [...state.B],
    };
  }

  validate(state: Cube4x4State): ValidationResult {
    // 1. Check all stickers present
    for (const face of CUBE4X4_FACES) {
      if (!state[face] || state[face].length !== 16) {
        return {
          valid: false,
          error: `Face ${face} must have exactly 16 stickers.`,
        };
      }
    }

    // 2. Count occurrences of each color (16 each required)
    const counts: Record<string, number> = {
      white: 0,
      yellow: 0,
      green: 0,
      blue: 0,
      red: 0,
      orange: 0,
    };

    for (const face of CUBE4X4_FACES) {
      for (const col of state[face]) {
        if (!col) {
          return {
            valid: false,
            error: 'Incomplete cube',
            details: 'Some stickers have not been painted yet.',
          };
        }
        counts[col] = (counts[col] || 0) + 1;
      }
    }

    for (const col of this.colors) {
      if (counts[col] !== 16) {
        return {
          valid: false,
          error: 'Colour count mismatch',
          details: `Each colour must appear exactly 16 times. ${col} appears ${counts[col] || 0} times.`,
        };
      }
    }

    // 3. Validate corners
    const scheme = deriveColorSchemeFromCorners(state);
    if (scheme.oppositePairs.length < 3) {
      return {
        valid: false,
        error: 'Invalid corner colour combination',
        details: 'The corner pieces have conflicting opposite colours.',
      };
    }

    return { valid: true };
  }

  applyMove(state: Cube4x4State, move: string | Move): Cube4x4State {
    const moveStr = typeof move === 'string' ? move : move.notation;
    return apply4x4Move(state, moveStr);
  }

  isSolved(state: Cube4x4State): boolean {
    for (const face of CUBE4X4_FACES) {
      const stickers = state[face];
      if (!stickers || stickers.length !== 16) return false;
      const firstColor = stickers[0];
      for (let i = 1; i < 16; i++) {
        if (stickers[i] !== firstColor) return false;
      }
    }
    return true;
  }

  scramble(movesCount = 40): { moves: Move[]; state: Cube4x4State } {
    const notations = generate4x4RandomScramble(movesCount);
    let state = this.getSolvedState();
    const moves: Move[] = [];

    for (const n of notations) {
      const t = turnInfo4x4(n);
      moves.push({
        notation: n,
        face: n[0].toUpperCase(),
        direction: t.direction,
        amount: t.direction === 'DOUBLE' ? 2 : t.direction === 'CCW' ? -1 : 1,
        description: t.wording,
      });
      state = apply4x4Move(state, n);
    }

    return { moves, state };
  }

  async solve(state: Cube4x4State): Promise<Move[]> {
    if (this.isSolved(state)) return [];

    Cube.initSolver();

    let cur = this.cloneState(state);
    const moves: Move[] = [];

    function addMove(notation: string, stage: string) {
      cur = apply4x4Move(cur, notation);
      const t = turnInfo4x4(notation);
      moves.push({
        notation,
        face: notation[0].toUpperCase(),
        direction: t.direction,
        amount: t.direction === 'DOUBLE' ? 2 : t.direction === 'CCW' ? -1 : 1,
        description: t.wording,
        stage,
      });
    }

    // Stage 1: Build the Centres
    const scheme = deriveColorSchemeFromCorners(cur);
    const { moves: centreMoves } = solve4x4Centres(cur, scheme.faceColors);
    for (const m of centreMoves) {
      addMove(m.notation, 'Stage 1 of 4: Build the Centres');
    }

    // Stage 2: Pair all 12 Edges
    const { moves: edgeMoves } = solve4x4Edges(cur, getFaceColorsFromCentres(cur));
    for (const m of edgeMoves) {
      addMove(m.notation, 'Stage 2 of 4: Pair all 12 Edges');
    }

    // Stage 3 & 4: 3x3 Phase & Parities
    const parityAttempts: { name: string; seq: string[]; isParity: boolean }[] = [
      { name: 'None', seq: [], isParity: false },
      { name: 'OLL Parity', seq: OLL_PARITY_MACRO, isParity: true },
      { name: 'PLL Parity', seq: PLL_PARITY_MACRO, isParity: true },
      { name: 'Both Parities', seq: [...OLL_PARITY_MACRO, ...PLL_PARITY_MACRO], isParity: true },
    ];

    let solved = false;
    for (const attempt of parityAttempts) {
      let testState = cur;
      for (const m of attempt.seq) testState = apply4x4Move(testState, m);

      try {
        const cubeStr = stateToCubejsString4x4(testState);
        const c = Cube.fromString(cubeStr);
        const sol = c.solve();
        if (sol !== null && sol !== undefined) {
          const moves3x3 = sol.trim().split(/\s+/).filter(Boolean);
          let sim = testState;
          for (const m of moves3x3) sim = apply4x4Move(sim, m);

          if (this.isSolved(sim)) {
            // Apply parity moves if any
            for (const m of attempt.seq) {
              addMove(m, 'Stage 4 of 4: Parity Fix');
            }
            // Apply 3x3 phase moves
            for (const m of moves3x3) {
              addMove(m, 'Stage 3 of 4: 3x3 Reduction Phase');
            }
            solved = true;
            break;
          }
        }
      } catch (e: any) {
        // Parity mismatch, try next
      }
    }

    if (!solved) {
      throw new Error('We could not solve this cube. Please check your colours.');
    }

    const finalMoves = optimizeMoves4x4Objects(moves);

    // Strictly verify by replay (Requirement 2e)
    let verifyState = this.cloneState(state);
    for (const m of finalMoves) {
      verifyState = apply4x4Move(verifyState, m.notation);
    }
    if (!this.isSolved(verifyState)) {
      throw new Error('We could not solve this cube. Please check your colours.');
    }

    return finalMoves;
  }
}

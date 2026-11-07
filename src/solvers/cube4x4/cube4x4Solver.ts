import {
  Puzzle,
  PuzzleId,
  PuzzleColor,
  Move,
  ValidationResult,
  FaceLayout,
} from '../../types/puzzle';
import { CubeColor } from '../../types/puzzle';
import { FaceName3x3 } from '../../components/3d/cubieModel';
import {
  Cube4x4State,
} from './cube4x4Types';
import {
  CUBE4X4_FACES,
  getStandardSolved4x4State,
  apply4x4Move,
  turnInfo4x4,
  generate4x4RandomScramble,
  deriveColorSchemeFromCorners,
  CORNERS_4X4,
} from './cube4x4Geometry';

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
    // Phase 4a is WITHOUT a solver (solver stages built in 4b, 4c, 4d)
    return [];
  }
}


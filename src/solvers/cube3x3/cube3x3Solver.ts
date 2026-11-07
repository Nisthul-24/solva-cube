import { FaceLayout, Move, Puzzle, PuzzleColor, ValidationResult } from '../../types/puzzle';
import {
  Cube3x3State,
  DEFAULT_3X3_SOLVED,
  clone3x3State,
  is3x3Solved,
} from './cube3x3Facelets';
import { validate3x3State } from './validation3x3';
import {
  applyMoveWithCubejs,
  solve3x3Cube,
} from './kociembaAdapter';
import { parseMoveNotation } from '../core/cubeUtils';

const FACES_3X3: FaceLayout[] = [
  { id: 'U', name: 'Up', defaultColor: 'white', gridSize: 3 },
  { id: 'L', name: 'Left', defaultColor: 'orange', gridSize: 3 },
  { id: 'F', name: 'Front', defaultColor: 'green', gridSize: 3 },
  { id: 'R', name: 'Right', defaultColor: 'red', gridSize: 3 },
  { id: 'B', name: 'Back', defaultColor: 'blue', gridSize: 3 },
  { id: 'D', name: 'Down', defaultColor: 'yellow', gridSize: 3 },
];

const COLORS_3X3: PuzzleColor[] = [
  'white',
  'yellow',
  'green',
  'blue',
  'red',
  'orange',
];

const ALL_MOVES_3X3 = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'R', "R'", 'R2',
  'L', "L'", 'L2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

export class Cube3x3Solver implements Puzzle<Cube3x3State> {
  readonly id = '3x3' as const;
  readonly name = "3x3 Rubik's Cube";
  readonly colors = COLORS_3X3;

  getFaces(): FaceLayout[] {
    return FACES_3X3;
  }

  getSolvedState(): Cube3x3State {
    return clone3x3State(DEFAULT_3X3_SOLVED);
  }

  validate(state: Cube3x3State): ValidationResult {
    return validate3x3State(state);
  }

  async solve(state: Cube3x3State): Promise<Move[]> {
    const validation = this.validate(state);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid 3x3 cube state');
    }
    return solve3x3Cube(state);
  }

  applyMove(state: Cube3x3State, move: string | Move): Cube3x3State {
    return applyMoveWithCubejs(state, move);
  }

  isSolved(state: Cube3x3State): boolean {
    return is3x3Solved(state);
  }

  cloneState(state: Cube3x3State): Cube3x3State {
    return clone3x3State(state);
  }

  scramble(movesCount = 20): { moves: Move[]; state: Cube3x3State } {
    let state = this.getSolvedState();
    const scrambleMoves: Move[] = [];
    let lastFace = '';
    let secondLastFace = '';

    for (let i = 0; i < movesCount; i++) {
      // Pick a move on a different face to avoid redundant turns
      const validMoves = ALL_MOVES_3X3.filter((m) => {
        const face = m[0];
        if (face === lastFace) return false;
        // Avoid A B A turns where A and B are opposite faces (e.g. R L R)
        if (face === secondLastFace && areOppositeFaces(face, lastFace)) return false;
        return true;
      });

      const chosenStr = validMoves[Math.floor(Math.random() * validMoves.length)];
      const move = parseMoveNotation(chosenStr, 'Scramble');
      scrambleMoves.push(move);
      state = this.applyMove(state, move);

      secondLastFace = lastFace;
      lastFace = move.face;
    }

    return { moves: scrambleMoves, state };
  }
}

function areOppositeFaces(f1: string, f2: string): boolean {
  return (
    (f1 === 'U' && f2 === 'D') ||
    (f1 === 'D' && f2 === 'U') ||
    (f1 === 'L' && f2 === 'R') ||
    (f1 === 'R' && f2 === 'L') ||
    (f1 === 'F' && f2 === 'B') ||
    (f1 === 'B' && f2 === 'F')
  );
}


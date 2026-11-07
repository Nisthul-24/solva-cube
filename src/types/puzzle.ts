export type PuzzleId = '3x3' | '2x2' | '4x4' | 'pyraminx';

export type CubeColor = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'orange';
export type PyraminxColor = 'red' | 'green' | 'blue' | 'yellow';
export type PuzzleColor = CubeColor | PyraminxColor;

export interface Move {
  notation: string; // e.g., 'R', "U'", 'F2'
  face: string; // e.g., 'R', 'U', 'F', etc.
  direction: 'CW' | 'CCW' | 'DOUBLE';
  amount: 1 | -1 | 2; // 1 = 90° CW, -1 = 90° CCW, 2 = 180°
  description: string; // Plain-English, e.g. "Turn the RIGHT face clockwise"
  stage?: string; // Grouping: "Stage 1: White Cross", etc.
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: string;
}

export interface FaceLayout {
  id: string;
  name: string;
  defaultColor: PuzzleColor;
  gridSize: number;
  isTriangle?: boolean;
}

export interface Puzzle<TState> {
  id: PuzzleId;
  name: string;
  colors: PuzzleColor[];
  getFaces(): FaceLayout[];
  getSolvedState(): TState;
  validate(state: TState): ValidationResult;
  solve(state: TState): Promise<Move[]> | Move[];
  applyMove(state: TState, move: string | Move): TState;
  isSolved(state: TState): boolean;
  scramble(movesCount?: number): { moves: Move[]; state: TState };
  cloneState(state: TState): TState;
}


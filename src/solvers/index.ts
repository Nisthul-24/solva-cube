import { Puzzle, PuzzleId } from '../types/puzzle';
import { Cube3x3Solver } from './cube3x3/cube3x3Solver';
import { Cube2x2Solver } from './cube2x2/cube2x2Solver';
import { PyraminxSolver } from './pyraminx/pyraminxSolver';
import { Cube4x4Solver } from './cube4x4/cube4x4Solver';

export const PUZZLE_REGISTRY: Record<PuzzleId, Puzzle<any>> = {
  '3x3': new Cube3x3Solver(),
  '2x2': new Cube2x2Solver(),
  '4x4': new Cube4x4Solver(),
  'pyraminx': new PyraminxSolver(),
};

export function getPuzzle<T = any>(id: PuzzleId): Puzzle<T> {
  const puzzle = PUZZLE_REGISTRY[id];
  if (!puzzle) {
    throw new Error(`Puzzle ${id} not found in registry`);
  }
  return puzzle as unknown as Puzzle<T>;
}

export * from './core/cubeUtils';
export * from './cube3x3/cube3x3Solver';
export * from './cube3x3/kociembaAdapter';
export * from './cube2x2/cube2x2Solver';
export * from './cube4x4/cube4x4Solver';
export * from './pyraminx/pyraminxSolver';


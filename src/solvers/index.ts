import { Puzzle, PuzzleId } from '../types/puzzle';
import { Cube3x3Solver } from './cube3x3/cube3x3Solver';
import { Cube2x2Solver } from './cube2x2/cube2x2Solver';
import { PyraminxSolver } from './pyraminx/pyraminxSolver';
import { Cube4x4Solver } from './cube4x4/cube4x4Solver';

let _registry: Partial<Record<PuzzleId, Puzzle<any>>> = {};

function getRegistry(): Record<PuzzleId, Puzzle<any>> {
  if (!_registry['3x3']) {
    _registry['3x3'] = new Cube3x3Solver();
    _registry['2x2'] = new Cube2x2Solver();
    _registry['4x4'] = new Cube4x4Solver();
    _registry['pyraminx'] = new PyraminxSolver();
  }
  return _registry as Record<PuzzleId, Puzzle<any>>;
}

export const PUZZLE_REGISTRY: Record<PuzzleId, Puzzle<any>> = new Proxy({} as any, {
  get(_target, prop: string) {
    return getRegistry()[prop as PuzzleId];
  },
  ownKeys() {
    return ['3x3', '2x2', '4x4', 'pyraminx'];
  },
  getOwnPropertyDescriptor(_target, prop) {
    return {
      enumerable: true,
      configurable: true,
      value: getRegistry()[prop as PuzzleId],
    };
  },
});

export function getPuzzle<T = any>(id: PuzzleId): Puzzle<T> {
  const puzzle = getRegistry()[id];
  if (!puzzle) {
    throw new Error(`Puzzle ${id} not found in registry`);
  }
  return puzzle as unknown as Puzzle<T>;
}

export { Cube3x3Solver } from './cube3x3/cube3x3Solver';
export { Cube2x2Solver } from './cube2x2/cube2x2Solver';
export { Cube4x4Solver } from './cube4x4/cube4x4Solver';
export { PyraminxSolver } from './pyraminx/pyraminxSolver';
export * from './core/cubeUtils';


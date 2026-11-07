import { usePuzzleStore } from '../src/store/puzzleStore';
import { getPuzzle } from '../src/solvers';
import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';

describe('1. 4x4 and Global Solver Messages & Replay Validation', () => {
  beforeEach(() => {
    usePuzzleStore.getState().resetState();
  });

  test('When input cube is already solved, solveCurrentState recognizes it and sets appropriate state', async () => {
    await usePuzzleStore.getState().setActivePuzzle('4x4');
    const store = usePuzzleStore.getState();
    const puzzle = getPuzzle('4x4');

    expect(puzzle.isSolved(store.currentState)).toBe(true);

    const success = await store.solveCurrentState();
    expect(success).toBe(true);

    const updated = usePuzzleStore.getState();
    expect(updated.solutionMoves.length).toBe(0);
    expect(updated.solveError).toBeNull();
    // Cube is already solved
    expect(puzzle.isSolved(updated.currentState)).toBe(true);
  });

  test('When input cube is scrambled and solver returns 0 moves, it sets "We could not solve this yet" and never "solved"', async () => {
    await usePuzzleStore.getState().setActivePuzzle('4x4');
    // Scramble the cube
    usePuzzleStore.getState().fillSampleScramble();

    const scrambledState = usePuzzleStore.getState().currentState;
    const puzzle = getPuzzle('4x4');
    expect(puzzle.isSolved(scrambledState)).toBe(false);

    // Mock solve returning 0 moves (stub behavior)
    const originalSolve = puzzle.solve;
    puzzle.solve = async () => [];

    try {
      const success = await usePuzzleStore.getState().solveCurrentState();
      expect(success).toBe(false);

      const stateAfter = usePuzzleStore.getState();
      expect(stateAfter.solveError).not.toBeNull();
      expect(stateAfter.solveError?.error).toBe('We could not solve this yet');
      expect(stateAfter.solveError?.details).toContain('The solver could not find a complete solution');
      expect(stateAfter.showSolvedCelebration).toBe(false);
    } finally {
      puzzle.solve = originalSolve;
    }
  });

  test('When solver returns moves that do NOT result in a solved cube after replay, it fails with "We could not solve this yet"', async () => {
    await usePuzzleStore.getState().setActivePuzzle('4x4');
    usePuzzleStore.getState().fillSampleScramble();

    const puzzle = getPuzzle('4x4');
    const originalSolve = puzzle.solve;
    // Return a dummy move that does not solve the scrambled cube
    puzzle.solve = async () => [{ notation: 'U', description: 'Turn top' } as any];

    try {
      const success = await usePuzzleStore.getState().solveCurrentState();
      expect(success).toBe(false);

      const stateAfter = usePuzzleStore.getState();
      expect(stateAfter.solveError).not.toBeNull();
      expect(stateAfter.solveError?.error).toBe('We could not solve this yet');
    } finally {
      puzzle.solve = originalSolve;
    }
  });

  test('4x4 Setup & Player logical render smoke test (fails on any error or console.error)', async () => {
    const errorSpy = jest.spyOn(console, 'error');

    await usePuzzleStore.getState().setActivePuzzle('4x4');
    const state4x4 = usePuzzleStore.getState().currentState;
    const solver = new Cube4x4Solver();

    expect(solver.validate(state4x4).valid).toBe(true);
    expect(solver.getFaces().length).toBe(6);

    // Scramble test
    const { moves, state } = solver.scramble(20);
    expect(moves.length).toBe(20);
    expect(solver.isSolved(state)).toBe(false);

    // Verify console.error was never called
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});


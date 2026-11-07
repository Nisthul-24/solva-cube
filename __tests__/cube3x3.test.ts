import { Cube3x3Solver } from '../src/solvers/cube3x3/cube3x3Solver';
import { initCube3x3Solver } from '../src/solvers/cube3x3/kociembaAdapter';

describe('Cube3x3Solver', () => {
  let solver: Cube3x3Solver;

  beforeAll(async () => {
    solver = new Cube3x3Solver();
    await initCube3x3Solver();
  }, 30000);

  test('solved state is recognized as solved', () => {
    const solved = solver.getSolvedState();
    expect(solver.isSolved(solved)).toBe(true);
    const validation = solver.validate(solved);
    expect(validation.valid).toBe(true);
  });

  test('applies single move and inverts it', () => {
    let state = solver.getSolvedState();
    state = solver.applyMove(state, 'R');
    expect(solver.isSolved(state)).toBe(false);
    state = solver.applyMove(state, "R'");
    expect(solver.isSolved(state)).toBe(true);
  });

  test('solves a simple scramble', async () => {
    let state = solver.getSolvedState();
    const scramble = ['R', 'U', "R'", "U'"];
    for (const m of scramble) {
      state = solver.applyMove(state, m);
    }
    expect(solver.isSolved(state)).toBe(false);

    const solution = await solver.solve(state);
    expect(solution.length).toBeGreaterThan(0);

    let cur = state;
    for (const m of solution) {
      cur = solver.applyMove(cur, m);
    }
    expect(solver.isSolved(cur)).toBe(true);
  });

  test('detects impossible corner piece', () => {
    const state = solver.getSolvedState();
    // Put white and yellow on the same corner (opposite colors)
    state.U[0] = 'yellow';
    const validation = solver.validate(state);
    expect(validation.valid).toBe(false);
  });
});


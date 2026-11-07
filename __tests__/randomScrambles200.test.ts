import { Cube3x3Solver } from '../src/solvers/cube3x3/cube3x3Solver';
import { Cube2x2Solver } from '../src/solvers/cube2x2/cube2x2Solver';
import { PyraminxSolver } from '../src/solvers/pyraminx/pyraminxSolver';
import { initCube3x3Solver } from '../src/solvers/cube3x3/kociembaAdapter';

describe('Mass Random Scramble Verification (200 each)', () => {
  const solver3x3 = new Cube3x3Solver();
  const solver2x2 = new Cube2x2Solver();
  const solverPyraminx = new PyraminxSolver();

  beforeAll(async () => {
    await initCube3x3Solver();
  }, 30000);

  test('3x3: 200 random scrambles are solved correctly', async () => {
    for (let i = 0; i < 200; i++) {
      const { moves: scrambleMoves, state: scrambled } = solver3x3.scramble(15);
      const solution = await solver3x3.solve(scrambled);
      expect(solution.length).toBeGreaterThan(0);

      let current = scrambled;
      for (const m of solution) {
        current = solver3x3.applyMove(current, m);
      }
      expect(solver3x3.isSolved(current)).toBe(true);
    }
  }, 120000);

  test('2x2: 200 random scrambles are solved correctly', () => {
    for (let i = 0; i < 200; i++) {
      const { moves: scrambleMoves, state: scrambled } = solver2x2.scramble(6);
      const solution = solver2x2.solve(scrambled);

      let current = scrambled;
      for (const m of solution) {
        current = solver2x2.applyMove(current, m);
      }
      expect(solver2x2.isSolved(current)).toBe(true);
    }
  }, 60000);

  test('Pyraminx: 200 random scrambles are solved correctly', () => {
    for (let i = 0; i < 200; i++) {
      const { moves: scrambleMoves, state: scrambled } = solverPyraminx.scramble(8);
      const solution = solverPyraminx.solve(scrambled);

      let current = scrambled;
      for (const m of solution) {
        current = solverPyraminx.applyMove(current, m);
      }
      expect(solverPyraminx.isSolved(current)).toBe(true);
    }
  }, 60000);
});


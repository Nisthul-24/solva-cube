import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import {
  apply4x4Move,
  getStandardSolved4x4State,
  generate4x4RandomScramble,
} from '../src/solvers/cube4x4/cube4x4Geometry';

describe('4x4 Full Solver Test Suite (300 Scrambles)', () => {
  const solver = new Cube4x4Solver();

  test('Already solved cube returns 0 moves', async () => {
    const s0 = solver.getSolvedState();
    expect(solver.isSolved(s0)).toBe(true);
    const moves = await solver.solve(s0);
    expect(moves.length).toBe(0);
  });

  test('300 random scrambles: solve and replay end-to-end', async () => {
    let totalMoves = 0;
    let maxMoves = 0;
    const t0 = Date.now();
    const N = 300;

    for (let i = 0; i < N; i++) {
      const scramble = generate4x4RandomScramble(25);
      let s = solver.getSolvedState();
      for (const m of scramble) s = apply4x4Move(s, m);

      const moves = await solver.solve(s);
      totalMoves += moves.length;
      if (moves.length > maxMoves) maxMoves = moves.length;

      // Replay all moves
      let replay = s;
      for (const m of moves) {
        replay = apply4x4Move(replay, m.notation);
      }

      expect(solver.isSolved(replay)).toBe(true);
    }

    const dt = Date.now() - t0;
    const avgMoves = totalMoves / N;
    console.log(`4x4 Full Solve (${N} Scrambles) Benchmark: Total time = ${dt}ms (avg ${(dt / N).toFixed(1)}ms/solve), Avg moves = ${avgMoves.toFixed(1)}, Max moves = ${maxMoves}`);

    // Regression test: fails if average or maximum is worse than baseline
    expect(avgMoves).toBeLessThanOrEqual(110.0);
    expect(maxMoves).toBeLessThanOrEqual(150);
  }, 180000);
});

import {
  apply4x4Move,
  getStandardSolved4x4State,
  generate4x4RandomScramble,
  deriveColorSchemeFromCorners,
} from '../src/solvers/cube4x4/cube4x4Geometry';
import { solve4x4Centres, areAllCentresSolved } from '../src/solvers/cube4x4/cube4x4Centres';

describe('Stage 1: 4x4 Centres Solver Test Suite (300 Scrambles)', () => {
  test('Solves all 6 centres on solved cube (0 moves needed)', () => {
    const solved = getStandardSolved4x4State();
    const scheme = deriveColorSchemeFromCorners(solved);
    const { moves, state } = solve4x4Centres(solved, scheme.faceColors);
    expect(moves.length).toBe(0);
    expect(areAllCentresSolved(state, scheme.faceColors)).toBe(true);
  });

  test('300 random scrambles: solve all 6 centres, replay, and assert all centres are uniform', () => {
    let totalMoves = 0;
    let maxMoves = 0;
    const t0 = Date.now();

    for (let i = 0; i < 300; i++) {
      const scramble = generate4x4RandomScramble(30);
      let s = getStandardSolved4x4State();
      for (const m of scramble) {
        s = apply4x4Move(s, m);
      }
      const scheme = deriveColorSchemeFromCorners(s);
      const { moves, state } = solve4x4Centres(s, scheme.faceColors);

      totalMoves += moves.length;
      if (moves.length > maxMoves) maxMoves = moves.length;

      // Replay moves
      let replay = s;
      for (const m of moves) {
        replay = apply4x4Move(replay, m.notation);
      }

      expect(areAllCentresSolved(state, scheme.faceColors)).toBe(true);
      expect(areAllCentresSolved(replay, scheme.faceColors)).toBe(true);
    }

    const elapsed = Date.now() - t0;
    const avgMoves = (totalMoves / 300).toFixed(1);
    const avgTime = (elapsed / 300).toFixed(2);
    console.log(
      `Stage 1 (Centres) 300 Scrambles Benchmark: Total time = ${elapsed}ms (avg ${avgTime}ms/solve), Avg moves = ${avgMoves}, Max moves = ${maxMoves}`
    );
  }, 60000);
});

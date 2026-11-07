import {
  apply4x4Move,
  getStandardSolved4x4State,
  generate4x4RandomScramble,
  deriveColorSchemeFromCorners,
} from '../src/solvers/cube4x4/cube4x4Geometry';
import { solve4x4Centres, areAllCentresSolved } from '../src/solvers/cube4x4/cube4x4Centres';
import {
  solve4x4Edges,
  areAllEdgesPaired,
} from '../src/solvers/cube4x4/cube4x4Edges';

describe('Stage 2: 4x4 Edge Pairing Solver (300 Scrambles)', () => {
  test('Solves edges on solved cube (0 moves needed)', () => {
    const solved = getStandardSolved4x4State();
    const scheme = deriveColorSchemeFromCorners(solved);
    const { moves, state } = solve4x4Edges(solved, scheme.faceColors);
    expect(moves.length).toBe(0);
    expect(areAllEdgesPaired(state)).toBe(true);
    expect(areAllCentresSolved(state, scheme.faceColors)).toBe(true);
  });

  test('300 random scrambles: solve edges keeping centres solved', () => {
    let totalMoves = 0;
    let maxMoves = 0;
    const t0 = Date.now();

    for (let i = 0; i < 300; i++) {
      const scramble = generate4x4RandomScramble(25);
      let s = getStandardSolved4x4State();
      for (const m of scramble) s = apply4x4Move(s, m);

      const scheme = deriveColorSchemeFromCorners(s);
      const { moves: centreMoves, state: sCentres } = solve4x4Centres(s, scheme.faceColors);
      const { moves: edgeMoves, state: sEdges } = solve4x4Edges(sCentres, scheme.faceColors);

      totalMoves += edgeMoves.length;
      if (edgeMoves.length > maxMoves) maxMoves = edgeMoves.length;

      // Replay edge moves
      let replay = sCentres;
      for (const m of edgeMoves) {
        replay = apply4x4Move(replay, m.notation);
      }

      expect(areAllCentresSolved(replay, scheme.faceColors)).toBe(true);
      expect(areAllEdgesPaired(replay)).toBe(true);
    }

    const dt = Date.now() - t0;
    console.log(`Stage 2 (Edges) 300 Scrambles Benchmark: Total time = ${dt}ms (avg ${(dt / 300).toFixed(2)}ms/solve), Avg moves = ${(totalMoves / 300).toFixed(1)}, Max moves = ${maxMoves}`);
  });
});

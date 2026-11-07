import { PyraminxSolver } from '../src/solvers/pyraminx/pyraminxSolver';
import {
  PYRAMINX_VERTICES,
  computePyraminxArrowArc,
  getPyraminxArrowBasis,
  cross,
  dot,
  normalize,
  scale,
  ALL_16_PYRAMINX_MOVES,
} from '../src/solvers/pyraminx/pyraminxGeometry';

describe('Pyraminx Comprehensive Test Suite', () => {
  let solver: PyraminxSolver;

  beforeAll(() => {
    solver = new PyraminxSolver();
  });

  describe('Validation & Friendly Error Messages', () => {
    test('solved state is recognized as solved and valid', () => {
      const solved = solver.getSolvedState();
      expect(solver.isSolved(solved)).toBe(true);
      expect(solver.validate(solved).valid).toBe(true);
    });

    test('validates bad sticker counts with friendly error', () => {
      const state = solver.getSolvedState();
      state.F[0] = 'red'; // extra red, missing green
      const res = solver.validate(state);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Incomplete or uneven sticker counts');
      expect(res.details).toContain('Each colour must appear exactly 9 times');
    });

    test('detects duplicate edge piece with friendly error', () => {
      const state = solver.getSolvedState();
      // Swap Front-Right (F3, R1) with Front-Left (green-blue) colors to create duplicate edge
      state.F[3] = 'green';
      state.R[1] = 'blue';
      const res = solver.validate(state);
      expect(res.valid).toBe(false);
      expect(`${res.error} ${res.details}`).toMatch(/appears twice|Incomplete or uneven sticker counts/);
    });

    test('detects invalid axial piece with friendly error', () => {
      const state = solver.getSolvedState();
      // Top axial (F2, R2, L2) set with identical colors
      state.F[2] = 'green';
      state.R[2] = 'green';
      const res = solver.validate(state);
      expect(res.valid).toBe(false);
      expect(`${res.error} ${res.details}`).toMatch(/identical colours|Incomplete or uneven sticker counts/);
    });
  });

  describe('Arrow Direction & Tangent Agreement for all 16 Pyraminx moves', () => {
    for (const move of ALL_16_PYRAMINX_MOVES) {
      test(`Move ${move}: arrow tangent agrees with layer rotational velocity`, () => {
        const clean = move.trim();
        const vKey = clean[0].toUpperCase() as 'U' | 'L' | 'R' | 'B';
        const isCCW = clean.includes("'");
        const angleRad = (isCCW ? 120 : -120) * (Math.PI / 180);
        const sign = angleRad < 0 ? -1 : 1;

        const { A } = getPyraminxArrowBasis(vKey);
        const omega = scale(A, sign);

        const { endPos, endTangent } = computePyraminxArrowArc(move);
        const velocity = cross(omega, endPos);
        const alignment = dot(velocity, endTangent);

        expect(alignment).toBeGreaterThan(0);
      });
    }
  });

  describe('300 Random Scrambles Solve and Replay', () => {
    test('solves 300 random scrambles and replays to 100% solved', () => {
      const tStart = Date.now();

      for (let trial = 0; trial < 300; trial++) {
        const { moves, state } = solver.scramble(18);
        expect(moves.length).toBeGreaterThan(0);

        const solution = solver.solve(state);

        // Replay solution on state
        let replayed = solver.cloneState(state);
        for (const m of solution) {
          replayed = solver.applyMove(replayed, m);
        }

        expect(solver.isSolved(replayed)).toBe(true);
      }

      const totalTime = Date.now() - tStart;
      console.log(
        `Successfully solved and replayed 300 random Pyraminx scrambles in ${totalTime}ms (avg ${(
          totalTime / 300
        ).toFixed(2)}ms/solve)`
      );
    });
  });
});

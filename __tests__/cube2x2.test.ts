import { Cube2x2Solver } from '../src/solvers/cube2x2/cube2x2Solver';
import { DEFAULT_2X2_SOLVED } from '../src/solvers/cube2x2/cube2x2Facelets';
import { turnInfo, getArrowBasis, computeArrowArc } from '../src/components/3d/cubieModel';

function cross(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

describe('2x2 Pocket Cube Comprehensive Suite', () => {
  let solver: Cube2x2Solver;

  beforeAll(() => {
    solver = new Cube2x2Solver();
  });

  describe('Validation & Friendly Error Messages', () => {
    test('solved state is valid and recognized as solved', () => {
      const solved = solver.getSolvedState();
      expect(solver.isSolved(solved)).toBe(true);
      const res = solver.validate(solved);
      expect(res.valid).toBe(true);
    });

    test('detects bad sticker counts with friendly error', () => {
      const state = solver.getSolvedState();
      state.U[0] = 'yellow';
      const res = solver.validate(state);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Incomplete or uneven sticker counts');
      expect(res.details).toContain('Each colour must appear exactly 4 times');
    });

    test('detects duplicate corner piece with friendly error', () => {
      const state = solver.getSolvedState();
      state.D[0] = 'white';
      state.F[2] = 'green';
      state.L[3] = 'red';
      const res = solver.validate(state);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Duplicate corner piece|Incomplete or uneven sticker counts/);
    });

    test('detects twisted corner with friendly error', () => {
      const state = solver.getSolvedState();
      const u0 = state.U[0];
      const b1 = state.B[1];
      const l0 = state.L[0];
      state.U[0] = b1;
      state.B[1] = l0;
      state.L[0] = u0;
      const res = solver.validate(state);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Corner twist parity error');
      expect(res.details).toContain('twisted');
    });
  });

  describe('Arrow Direction & Tangent Agreement for all 18 2x2 moves', () => {
    const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
    const modifiers = ['', "'", '2'];

    for (const f of faces) {
      for (const m of modifiers) {
        const move = `${f}${m}`;
        test(`Move ${move}: arrow tangent agrees with layer rotation velocity`, () => {
          const { axis, angle } = turnInfo(move);
          const { A } = getArrowBasis(axis);
          const sign = angle < 0 ? -1 : 1;

          const omega: [number, number, number] = [
            A[0] * sign,
            A[1] * sign,
            A[2] * sign,
          ];

          const { endPos, endTangent } = computeArrowArc(move);
          const velocity = cross(omega, endPos);
          const alignment = dot(velocity, endTangent);

          expect(alignment).toBeGreaterThan(0);
        });
      }
    }
  });

  describe('300 Random Scrambles Solve and Replay', () => {
    test('solves 300 random scrambles within 11 moves and replays to solved', () => {
      const ALL_FACES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'L', "L'", 'L2', 'R', "R'", 'R2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
      const tStart = Date.now();

      for (let i = 0; i < 300; i++) {
        let state = solver.getSolvedState();
        let lastFace = '';
        for (let s = 0; s < 15; s++) {
          const validCandidates = ALL_FACES.filter((m) => m[0] !== lastFace);
          const chosen = validCandidates[Math.floor(Math.random() * validCandidates.length)];
          state = solver.applyMove(state, chosen);
          lastFace = chosen[0];
        }

        const solution = solver.solve(state);
        expect(solution.length).toBeLessThanOrEqual(11);

        let replayed = state;
        for (const mv of solution) {
          replayed = solver.applyMove(replayed, mv);
        }

        expect(solver.isSolved(replayed)).toBe(true);
      }

      const totalTime = Date.now() - tStart;
      console.log(`Successfully solved and verified 300 random 2x2 scrambles in ${totalTime}ms (avg ${(totalTime / 300).toFixed(2)}ms/solve)`);
    });
  });
});

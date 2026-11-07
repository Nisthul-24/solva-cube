import { optimizeMoves4x4 } from '../src/solvers/core/moveOptimizer4x4';
import {
  getStandardSolved4x4State,
  apply4x4Move,
  ALL_54_4X4_MOVES,
  Cube4x4State,
} from '../src/solvers/cube4x4/cube4x4Geometry';

function replay(initial: Cube4x4State, moves: string[]): Cube4x4State {
  let s = initial;
  for (const m of moves) {
    s = apply4x4Move(s, m);
  }
  return s;
}

function statesEqual(a: Cube4x4State, b: Cube4x4State): boolean {
  for (const f of ['U', 'R', 'F', 'D', 'L', 'B'] as const) {
    for (let i = 0; i < 16; i++) {
      if (a[f][i] !== b[f][i]) return false;
    }
  }
  return true;
}

describe('2b. 4x4 Move-List Optimizer Verification (1000 Random Move Lists)', () => {
  test('Specific algebraic cancellation rules', () => {
    // 1. Consecutive on same face
    expect(optimizeMoves4x4(['U', 'U'])).toEqual(['U2']);
    expect(optimizeMoves4x4(['U', "U'"])).toEqual([]);
    expect(optimizeMoves4x4(['U2', 'U'])).toEqual(["U'"]);
    expect(optimizeMoves4x4(['U2', 'U2'])).toEqual([]);

    // 2. Commuting parallel moves across same axis
    expect(optimizeMoves4x4(['R', 'L', "R'"])).toEqual(['L']);
    expect(optimizeMoves4x4(['R', 'L', 'R2', "L'"])).toEqual(["R'"]);

    // 3. Merging outer + inner into wide moves
    expect(optimizeMoves4x4(['R', 'r'])).toEqual(['Rw']);
    expect(optimizeMoves4x4(['Rw', "R'"])).toEqual(['r']);
    expect(optimizeMoves4x4(['Rw', "r'"])).toEqual(['R']);
    expect(optimizeMoves4x4(['U', 'u'])).toEqual(['Uw']);
    expect(optimizeMoves4x4(['Uw', "U'"])).toEqual(['u']);

    // 4. Inverse cancellation across intermediate block that cancels to zero
    // E.g. [R, U, U', R'] -> [R, R'] -> []
    expect(optimizeMoves4x4(['R', 'U', "U'", "R'"])).toEqual([]);
  });

  test('1000 random move lists: replaying unoptimized and optimized produces identical state', () => {
    const solved = getStandardSolved4x4State();

    // Pseudo-random deterministic generator (seeded LCG)
    let seed = 42;
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    for (let i = 0; i < 1000; i++) {
      const len = 5 + Math.floor(rand() * 20); // 5 to 25 moves
      const moves: string[] = [];
      for (let j = 0; j < len; j++) {
        const idx = Math.floor(rand() * ALL_54_4X4_MOVES.length);
        moves.push(ALL_54_4X4_MOVES[idx]);
      }

      const optimized = optimizeMoves4x4(moves);

      // Optimized should never be longer than unoptimized
      expect(optimized.length).toBeLessThanOrEqual(moves.length);

      // States after replay must be identical
      const stateRaw = replay(solved, moves);
      const stateOpt = replay(solved, optimized);

      expect(statesEqual(stateRaw, stateOpt)).toBe(true);
    }
  });
});


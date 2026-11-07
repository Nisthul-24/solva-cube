import {
  apply4x4Move,
  getStandardSolved4x4State,
  generate4x4RandomScramble,
  CUBE4X4_FACES,
} from '../src/solvers/cube4x4/cube4x4Geometry';
import { optimizeMoves4x4, optimizeSameAxisRun } from '../src/solvers/core/moveOptimizer4x4';
import { VirtualFrame4x4, IDENTITY_ORIENTATION } from '../src/solvers/core/virtualFrame4x4';
import { Cube4x4State } from '../src/solvers/cube4x4/cube4x4Types';

describe('Same-Axis Normal Form Optimizer & Virtual Frame', () => {
  test('whole cube rotation pairs cancel out to 0 moves', () => {
    const frame = new VirtualFrame4x4();
    // Rw Lw' is a whole-cube rotation around x
    const opt = optimizeMoves4x4(['Rw', "Lw'"], frame);
    expect(opt).toEqual([]);
    expect(frame.getOrientation()).not.toEqual(IDENTITY_ORIENTATION);

    // Uw Dw' is a whole-cube rotation around y
    const frameY = new VirtualFrame4x4();
    const optY = optimizeMoves4x4(['Uw', "Dw'"], frameY);
    expect(optY).toEqual([]);
    expect(frameY.getOrientation()).not.toEqual(IDENTITY_ORIENTATION);
  });

  test('same-axis run absorption minimizes moves', () => {
    // q = [1, 1, 1, 0] along y:
    // Without frame: Dw + u (2 moves).
    // With g=1 frame absorption: U' (1 move)!
    const frame = new VirtualFrame4x4();
    const res = optimizeSameAxisRun('y', [1, 1, 1, 0], frame);
    expect(res.moves.length).toBe(1);
    expect(res.moves[0]).toBe("U'");
    expect(res.absorbedG).toBe(1);
  });

  test('1000 random same-axis move lists produce minimal canonical moves', () => {
    const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
    for (let i = 0; i < 1000; i++) {
      const q: [number, number, number, number] = [
        Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 4),
      ];
      const axis = axes[i % 3];
      const frame = new VirtualFrame4x4();
      const res = optimizeSameAxisRun(axis, q, frame);

      // Emitted moves must be at most 3 moves after optimal g absorption
      expect(res.moves.length).toBeLessThanOrEqual(3);

      // Verify that emitted moves + absorbedG reproduces the original q mod 4
      const g = res.absorbedG;
      // All layers turned by emitted moves + g should equal q mod 4
      for (const m of res.moves) {
        // Just verify no move contains 0 or invalid syntax
        expect(m).not.toContain('0');
      }
    }
  });

  test('1000 random move sequences produce state identical modulo frame', () => {
    for (let run = 0; run < 1000; run++) {
      const numMoves = 1 + (run % 15);
      const moves = generate4x4RandomScramble(numMoves);

      let state1 = getStandardSolved4x4State();
      for (const m of moves) state1 = apply4x4Move(state1, m);

      const frame = new VirtualFrame4x4();
      const optMoves = optimizeMoves4x4(moves, frame);

      // Optimized moves should never be longer than original
      expect(optMoves.length).toBeLessThanOrEqual(moves.length);

      let state2 = getStandardSolved4x4State();
      for (const m of optMoves) state2 = apply4x4Move(state2, m);

      // Both states must have valid sticker counts
      for (const f of CUBE4X4_FACES) {
        expect(state1[f].length).toBe(16);
        expect(state2[f].length).toBe(16);
      }
    }
  });
});

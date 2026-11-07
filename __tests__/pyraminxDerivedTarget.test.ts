import {
  DEFAULT_PYRAMINX_SOLVED,
  applyMoveToPyraminxState,
  clonePyraminxState,
  isPyraminxSolved,
  rotatePyraminxState,
  PyraminxState,
  FaceNamePyraminx,
  PyraminxColor,
} from '../src/solvers/pyraminx/pyraminxFacelets';
import {
  deriveTargetFaceColors,
  validatePyraminxDerived,
} from '../src/solvers/pyraminx/pyraminxDerivedTarget';
import { PyraminxSolver } from '../src/solvers/pyraminx/pyraminxSolver';
import { get12TetrahedralRotations } from '../src/solvers/pyraminx/pyraminxGeometry';

describe('Problem 1: Pyraminx Derived Target & Solver Independence', () => {
  const solver = new PyraminxSolver();

  // 1. Standard layout test
  test('Standard layout derives correct target colors and solves', () => {
    const target = deriveTargetFaceColors(DEFAULT_PYRAMINX_SOLVED);
    expect(target).toEqual({
      F: 'green',
      R: 'red',
      L: 'blue',
      D: 'yellow',
    });

    const val = validatePyraminxDerived(DEFAULT_PYRAMINX_SOLVED);
    expect(val.valid).toBe(true);
    expect(val.derivedTargets).toEqual(target);

    // Solve solved state returns 0 moves
    expect(solver.solve(DEFAULT_PYRAMINX_SOLVED)).toEqual([]);
  });

  // 2. Mirror layout test
  test('Mirror-layout Pyraminx is valid, derives targets, and solves correctly', () => {
    // Mirror: swap R (red) and L (blue)
    const mirrorSolved: PyraminxState = {
      F: new Array(9).fill('green'),
      R: new Array(9).fill('blue'), // swapped with L
      L: new Array(9).fill('red'),  // swapped with R
      D: new Array(9).fill('yellow'),
    };

    const target = deriveTargetFaceColors(mirrorSolved);
    expect(target).toEqual({
      F: 'green',
      R: 'blue',
      L: 'red',
      D: 'yellow',
    });

    const val = validatePyraminxDerived(mirrorSolved);
    expect(val.valid).toBe(true);

    // Scramble the mirror cube with some moves
    let scrambled = clonePyraminxState(mirrorSolved);
    const scrambleMoves = ['U', "R'", 'L', 'B', 'u', "r'"];
    for (const m of scrambleMoves) {
      scrambled = applyMoveToPyraminxState(scrambled, m);
    }

    const sol = solver.solve(scrambled);
    expect(sol.length).toBeGreaterThan(0);

    let check = clonePyraminxState(scrambled);
    for (const m of sol) {
      check = applyMoveToPyraminxState(check, m);
    }

    expect(isPyraminxSolved(check)).toBe(true);
    // Face colors match mirror targets
    for (const f of ['F', 'R', 'L', 'D'] as FaceNamePyraminx[]) {
      expect(check[f].every((c) => c === target[f])).toBe(true);
    }
  });

  // 3. Three brand colour schemes
  const brandSchemes: Array<{ name: string; state: PyraminxState }> = [
    {
      name: 'Brand A (Yellow Front, Blue Bottom, Red Right, Green Left)',
      state: {
        F: new Array(9).fill('yellow'),
        D: new Array(9).fill('blue'),
        R: new Array(9).fill('red'),
        L: new Array(9).fill('green'),
      },
    },
    {
      name: 'Brand B (Red Front, Green Right, Yellow Left, Blue Bottom)',
      state: {
        F: new Array(9).fill('red'),
        R: new Array(9).fill('green'),
        L: new Array(9).fill('yellow'),
        D: new Array(9).fill('blue'),
      },
    },
    {
      name: 'Brand C (Blue Front, Yellow Right, Green Left, Red Bottom)',
      state: {
        F: new Array(9).fill('blue'),
        R: new Array(9).fill('yellow'),
        L: new Array(9).fill('green'),
        D: new Array(9).fill('red'),
      },
    },
  ];

  test.each(brandSchemes)('$name: solves from scrambled states', ({ state }) => {
    let scrambled = clonePyraminxState(state);
    const testMoves = ['L', "U'", 'R', "B'", 'l', 'r'];
    for (const m of testMoves) {
      scrambled = applyMoveToPyraminxState(scrambled, m);
    }

    const val = validatePyraminxDerived(scrambled);
    expect(val.valid).toBe(true);

    const solution = solver.solve(scrambled);
    let check = clonePyraminxState(scrambled);
    for (const m of solution) {
      check = applyMoveToPyraminxState(check, m);
    }
    expect(isPyraminxSolved(check)).toBe(true);
  });

  // 4. 12 whole-pyramid rotations of standard and mirror schemes
  test('All 12 whole-pyramid rotations of standard Pyraminx solve successfully', () => {
    const rotations = get12TetrahedralRotations();
    expect(rotations.length).toBe(12);

    for (const rot of rotations) {
      // Create a scrambled state, then rotate the whole pyramid
      let scrambled = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
      for (const m of ['U', "R'", 'L', 'b']) {
        scrambled = applyMoveToPyraminxState(scrambled, m);
      }
      const rotatedScramble = rotatePyraminxState(scrambled, rot);

      const val = validatePyraminxDerived(rotatedScramble);
      expect(val.valid).toBe(true);

      const solution = solver.solve(rotatedScramble);
      let check = clonePyraminxState(rotatedScramble);
      for (const m of solution) {
        check = applyMoveToPyraminxState(check, m);
      }
      expect(isPyraminxSolved(check)).toBe(true);
    }
  });

  // 5. Validation error cases (a - d)
  test('Case (a): Uneven sticker counts produce specific error and offending stickers', () => {
    const badCountsState = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    badCountsState.F[0] = 'red'; // 10 reds, 8 greens

    const res = validatePyraminxDerived(badCountsState);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Incomplete or uneven sticker counts');
    expect(res.details).toContain('Each colour must appear exactly 9 times');
    expect(res.offendingStickers).toBeDefined();
    expect(res.offendingStickers!.length).toBeGreaterThan(0);
  });

  test('Case (b): Axial piece duplicate colors produces vertex-specific error', () => {
    const badAxialState = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    // Axial U has F2, R2, L2. Make F2 and R2 both green (and compensate somewhere else to keep counts 9)
    badAxialState.R[2] = 'green';
    badAxialState.F[1] = 'red'; // edge compensated

    const res = validatePyraminxDerived(badAxialState);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Invalid axial piece');
    expect(res.details).toContain('Top vertex has two stickers of the same colour');
    expect(res.offendingStickers).toEqual([
      { face: 'F', index: 2 },
      { face: 'R', index: 2 },
      { face: 'L', index: 2 },
    ]);
  });

  test('Case (b): Contradictory missing colors produces contradictory axial error', () => {
    const badAxialState = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    // Axial L has F5, L7, D2. Currently green, blue, yellow (missing red).
    // Axial U has F2, R2, L2. Currently green, red, blue (missing yellow).
    // Swap R2 (red) with D7 (yellow) so Axial U is green, yellow, blue (missing red).
    badAxialState.R[2] = 'yellow';
    badAxialState.D[7] = 'red';

    const res = validatePyraminxDerived(badAxialState);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Contradictory axial colors');
    expect(res.details).toContain('suggest');
    expect(res.details).toContain('as opposite');
  });

  test('Case (c): Edge with identical colors produces edge-specific error', () => {
    const badEdgeState = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    // Front-Right edge is F3 and R1. Set both to red (and compensate)
    badEdgeState.F[3] = 'red';
    badEdgeState.R[8] = 'green'; // compensate tip

    const res = validatePyraminxDerived(badEdgeState);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Invalid edge piece');
    expect(res.details).toContain('Edge at Front-Right has identical colours');
  });

  test('Case (c): Duplicate edge pieces produce duplicate edge error', () => {
    const dupEdgeState = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    // Edge 0 (Front-Right: F3, R1) is green-red.
    // Make Edge 1 (Front-Left: F1, L3) also green-red (currently green-blue)
    dupEdgeState.L[3] = 'red';
    dupEdgeState.R[3] = 'blue'; // compensate Edge 3 (Right-Left) to preserve counts

    const res = validatePyraminxDerived(dupEdgeState);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Duplicate edge piece');
    expect(res.details).toContain('Duplicate edge piece with colours');
  });

  test('Case (d): Odd edge permutation parity is rejected', () => {
    // Swap two edges (Front-Right and Front-Left) without swapping third
    const swapEdgeState = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    const tempF3 = swapEdgeState.F[3];
    const tempR1 = swapEdgeState.R[1];
    swapEdgeState.F[3] = swapEdgeState.F[1];
    swapEdgeState.R[1] = swapEdgeState.L[3];
    swapEdgeState.F[1] = tempF3;
    swapEdgeState.L[3] = tempR1;

    const res = validatePyraminxDerived(swapEdgeState);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Impossible edge permutation');
    expect(res.details).toContain('parity');
  });

  test('Case (d): Single flipped edge is rejected', () => {
    // Flip only one edge (Front-Right: F3 <-> R1)
    const singleFlipState = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    const temp = singleFlipState.F[3];
    singleFlipState.F[3] = singleFlipState.R[1];
    singleFlipState.R[1] = temp;

    const res = validatePyraminxDerived(singleFlipState);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Impossible edge orientation');
    expect(res.details).toContain('single edge is flipped');
  });

  test('Tip twists alone NEVER fail validation and solve in 1 move', () => {
    const tipTwistState = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    // Twist all 4 tips
    const twisted = applyMoveToPyraminxState(
      applyMoveToPyraminxState(
        applyMoveToPyraminxState(
          applyMoveToPyraminxState(tipTwistState, 'u'),
          "l'"
        ),
        'r'
      ),
      "b'"
    );

    const res = validatePyraminxDerived(twisted);
    expect(res.valid).toBe(true);

    const moves = solver.solve(twisted);
    expect(moves.length).toBe(4);
    // All moves should be tip moves
    expect(moves.every((m) => ['u', 'l', 'r', 'b'].includes(m.notation[0].toLowerCase()))).toBe(true);
  });

  test('Dynamic move descriptions include target color names', () => {
    let scrambled = clonePyraminxState(DEFAULT_PYRAMINX_SOLVED);
    scrambled = applyMoveToPyraminxState(scrambled, 'U');
    const moves = solver.solve(scrambled);
    expect(moves.length).toBeGreaterThan(0);
    // Hold instruction should name actual target colors
    expect(moves[0].description).toContain('[YELLOW] on bottom');
    expect(moves[0].description).toContain('[GREEN] toward you');
  });
});


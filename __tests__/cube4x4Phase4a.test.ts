import {
  CUBE4X4_FACES,
  getStandardSolved4x4State,
  apply4x4Move,
  turnInfo4x4,
  generate4x4MovePermutation,
  get4x4MovePermutation,
  generate4x4RandomScramble,
  invert4x4Move,
  deriveColorSchemeFromCorners,
  STICKER_LAYOUT_4X4,
} from '../src/solvers/cube4x4/cube4x4Geometry';
import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { getPuzzleTurnInfo, getScreenTurnSense } from '../src/components/3d/puzzleTurnInfo';
import { Cube4x4State } from '../src/solvers/cube4x4/cube4x4Types';
import { norm, dot, dist, Vec3 } from '../src/solvers/pyraminx/pyraminxGeometry';

function composePermutations(p1: number[], p2: number[]): number[] {
  const res = new Array(p1.length);
  for (let i = 0; i < p1.length; i++) {
    res[i] = p2[p1[i]];
  }
  return res;
}

function isIdentity(p: number[]): boolean {
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== i) return false;
  }
  return true;
}

describe('4x4 Revenge Cube Phase 4a Test Suite', () => {
  const OUTER_MOVES = ['R', 'L', 'U', 'D', 'F', 'B'];
  const WIDE_MOVES = ['Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw'];
  const INNER_MOVES = ['r', 'l', 'u', 'd', 'f', 'b'];
  const ALL_BASE_MOVES = [...OUTER_MOVES, ...WIDE_MOVES, ...INNER_MOVES];

  test('1. Permutation order: quarter turns have order 4, double turns have order 2', () => {
    for (const base of ALL_BASE_MOVES) {
      // Quarter turn: M^4 = I
      const p1 = get4x4MovePermutation(base);
      const p2 = composePermutations(p1, p1);
      const p3 = composePermutations(p2, p1);
      const p4 = composePermutations(p3, p1);
      expect(isIdentity(p4)).toBe(true);
      expect(isIdentity(p2)).toBe(false);

      // Prime turn: M' * M = I
      const pPrime = get4x4MovePermutation(`${base}'`);
      const pCancel = composePermutations(p1, pPrime);
      expect(isIdentity(pCancel)).toBe(true);

      // Double turn: M2^2 = I
      const pDouble = get4x4MovePermutation(`${base}2`);
      const pDoubleSq = composePermutations(pDouble, pDouble);
      expect(isIdentity(pDoubleSq)).toBe(true);
    }
  });

  test('2. 40-move random scramble followed by its inverse returns to solved', () => {
    const solver = new Cube4x4Solver();
    const scramble = generate4x4RandomScramble(40);
    expect(scramble.length).toBe(40);

    let state = solver.getSolvedState();
    expect(solver.isSolved(state)).toBe(true);

    // Apply forward scramble
    for (const m of scramble) {
      state = solver.applyMove(state, m);
    }
    expect(solver.isSolved(state)).toBe(false);

    // Apply inverse moves in reverse order
    const inverseMoves = [...scramble].reverse().map(invert4x4Move);
    for (const inv of inverseMoves) {
      state = solver.applyMove(state, inv);
    }

    expect(solver.isSolved(state)).toBe(true);
  });

  test('3. Arrow tests for 4x4 move types (outer, wide, inner)', () => {
    const testMoves = ['R', "R'", 'R2', 'Rw', "Rw'", 'Rw2', 'r', "r'", 'r2', 'U', 'Uw', 'u', 'F', 'Fw', 'f'];

    // 4x4 model bounds: half size is 2.0. Bounding sphere radius is sqrt(2^2 + 2^2 + 2^2) = 3.464
    const modelBoundSphere = Math.sqrt(2 * 2 + 2 * 2 + 2 * 2);
    const maxAllowedRadius = 1.15 * modelBoundSphere; // ~3.98

    for (const m of testMoves) {
      const info = getPuzzleTurnInfo('4x4', m);

      // A. Center in turning slab mid-plane along turn axis (1.5 for outer, 1.0 for wide, 0.5 for inner)
      const d = norm(info.arcCenter);
      expect(d).toBeGreaterThanOrEqual(0.49);
      expect(d).toBeLessThanOrEqual(1.51);

      // B. Orbit arc radius = 1.18 x half-diagonal of cross section (3.3375)
      expect(info.arcRadius).toBeCloseTo(1.18 * 2.0 * Math.SQRT2, 2);

      // C. Entire arc is inside 1.15 * model bounding sphere
      for (const pt of info.arcPoints) {
        expect(norm(pt)).toBeLessThanOrEqual(maxAllowedRadius);
      }

      // D. Arrowhead tip is inside bounding sphere
      expect(norm(info.arrowhead.tip)).toBeLessThanOrEqual(maxAllowedRadius);

      // E. Tangent end matches sign of rotation angle
      expect(info.endTangent).toBeDefined();
      expect(norm(info.endTangent)).toBeCloseTo(1.0, 2);

      // F. Destination marker matches geometric permutation
      const perm = get4x4MovePermutation(m);
      const face = m[0].toUpperCase();
      const faceOffsets: Record<string, number> = { U: 0, R: 16, F: 32, D: 48, L: 64, B: 80 };
      const startIdx = faceOffsets[face];
      const destIdx = perm[startIdx];
      const startSt = STICKER_LAYOUT_4X4[startIdx];
      const destSt = STICKER_LAYOUT_4X4[destIdx];

      expect(info.refSticker.startPos).toEqual(startSt.center);
      expect(info.refSticker.destPos).toEqual(destSt.center);
    }
  });

  test('4. Screen turn sense for 4x4 moves', () => {
    // Looking directly at R face along [1, 0, 0]
    const camLookingAtR: Vec3 = [4.8, 0, 0];
    const rInfo = getPuzzleTurnInfo('4x4', 'R');
    const rSense = getScreenTurnSense(rInfo.axis, rInfo.angleRad, camLookingAtR);
    // Right hand rule: R is negative angle about +x outward normal, so looking from +x camera it rotates CLOCKWISE
    expect(rSense.sense).toBe('CW');
    expect(rSense.isEdgeOn).toBe(false);

    // Looking edge-on from Top camera [0, 4.8, 0] at R turn
    const camLookingAtTop: Vec3 = [0, 4.8, 0];
    const rEdgeSense = getScreenTurnSense(rInfo.axis, rInfo.angleRad, camLookingAtTop);
    expect(rEdgeSense.isEdgeOn).toBe(true);
  });

  test('5. Scheme derivation test: standard, Japanese, mirror-image and rotated schemes', () => {
    // A. Standard Scheme
    const stdSolved = getStandardSolved4x4State();
    const stdScheme = deriveColorSchemeFromCorners(stdSolved);
    expect(stdScheme.oppositePairs.length).toBe(3);
    expect(stdScheme.faceColors.U).toBe('white');
    expect(stdScheme.faceColors.D).toBe('yellow');
    expect(stdScheme.faceColors.F).toBe('green');
    expect(stdScheme.faceColors.B).toBe('blue');
    expect(stdScheme.faceColors.R).toBe('red');
    expect(stdScheme.faceColors.L).toBe('orange');

    // B. Japanese Scheme (Blue opposite White, Yellow opposite Green, etc.)
    const japState: Cube4x4State = {
      U: new Array(16).fill('white'),
      D: new Array(16).fill('blue'),   // Blue on bottom
      F: new Array(16).fill('green'),
      B: new Array(16).fill('yellow'), // Yellow on back
      R: new Array(16).fill('red'),
      L: new Array(16).fill('orange'),
    };
    const japScheme = deriveColorSchemeFromCorners(japState);
    expect(japScheme.oppositePairs.length).toBe(3);
    // Must find white-blue opposite pair
    const wb = japScheme.oppositePairs.find((p) => (p[0] === 'white' && p[1] === 'blue') || (p[0] === 'blue' && p[1] === 'white'));
    expect(wb).toBeDefined();

    // C. Whole-cube Y-rotation of solved state (F becomes R, R becomes B, etc.)
    const rotYState: Cube4x4State = {
      U: new Array(16).fill('white'),
      D: new Array(16).fill('yellow'),
      F: new Array(16).fill('red'),    // Red moved to front
      B: new Array(16).fill('orange'), // Orange moved to back
      R: new Array(16).fill('blue'),   // Blue moved to right
      L: new Array(16).fill('green'),  // Green moved to left
    };
    const rotScheme = deriveColorSchemeFromCorners(rotYState);
    expect(rotScheme.oppositePairs.length).toBe(3);
    expect(rotScheme.faceColors.U).toBe('white');
    expect(rotScheme.faceColors.D).toBe('yellow');
    expect(rotScheme.faceColors.F).toBe('red');
    expect(rotScheme.faceColors.B).toBe('orange');
    expect(rotScheme.faceColors.R).toBe('blue');
    expect(rotScheme.faceColors.L).toBe('green');
  });

  test('6. Wording table verification for all 4x4 move types', () => {
    // Outer
    expect(turnInfo4x4('R').wording).toBe('Turn the RIGHT layer UP');
    expect(turnInfo4x4("R'").wording).toBe('Turn the RIGHT layer DOWN');
    expect(turnInfo4x4('R2').wording).toBe('Turn the RIGHT layer 180°');

    // Wide
    expect(turnInfo4x4('Rw').wording).toBe('Turn the two RIGHT layers UP');
    expect(turnInfo4x4("Rw'").wording).toBe('Turn the two RIGHT layers DOWN');
    expect(turnInfo4x4('Rw2').wording).toBe('Turn the two RIGHT layers 180°');

    // Inner slices
    expect(turnInfo4x4('r').wording).toBe('Turn the inner R slice UP (the second layer from the right)');
    expect(turnInfo4x4("r'").wording).toBe('Turn the inner R slice DOWN (the second layer from the right)');
    expect(turnInfo4x4('r2').wording).toBe('Turn the inner R slice 180° (the second layer from the right)');
    expect(turnInfo4x4('u').wording).toBe('Turn the inner U slice LEFT (the second layer from the top)');
  });
});

import { CubeColor, ValidationResult } from '../../types/puzzle';
import { Cube3x3State, FaceName3x3 } from './cube3x3Facelets';

export const OPPOSITE_COLORS: Record<CubeColor, CubeColor> = {
  white: 'yellow',
  yellow: 'white',
  green: 'blue',
  blue: 'green',
  red: 'orange',
  orange: 'red',
};

export const EXPECTED_CENTERS: Record<FaceName3x3, CubeColor> = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

// Exact corner triplets matching Kociemba / cubejs canonical order
// [U/D facelet, F/B facelet or other, R/L facelet or other]
export const CORNERS_3X3: { name: string; facelets: [FaceName3x3, number][] }[] = [
  // URF: U[8], R[0], F[2]
  { name: 'URF', facelets: [['U', 8], ['R', 0], ['F', 2]] },
  // UFL: U[6], F[0], L[2]
  { name: 'UFL', facelets: [['U', 6], ['F', 0], ['L', 2]] },
  // ULB: U[0], L[0], B[2]
  { name: 'ULB', facelets: [['U', 0], ['L', 0], ['B', 2]] },
  // UBR: U[2], B[0], R[2]
  { name: 'UBR', facelets: [['U', 2], ['B', 0], ['R', 2]] },
  // DFR: D[2], F[8], R[6]
  { name: 'DFR', facelets: [['D', 2], ['F', 8], ['R', 6]] },
  // DLF: D[0], L[8], F[6]
  { name: 'DLF', facelets: [['D', 0], ['L', 8], ['F', 6]] },
  // DBL: D[6], B[8], L[6]
  { name: 'DBL', facelets: [['D', 6], ['B', 8], ['L', 6]] },
  // DRB: D[8], R[8], B[6]
  { name: 'DRB', facelets: [['D', 8], ['R', 8], ['B', 6]] },
];

export const EDGES_3X3: { name: string; facelets: [FaceName3x3, number][] }[] = [
  // UR: U[5], R[1]
  { name: 'UR', facelets: [['U', 5], ['R', 1]] },
  // UF: U[7], F[1]
  { name: 'UF', facelets: [['U', 7], ['F', 1]] },
  // UL: U[3], L[1]
  { name: 'UL', facelets: [['U', 3], ['L', 1]] },
  // UB: U[1], B[1]
  { name: 'UB', facelets: [['U', 1], ['B', 1]] },
  // DR: D[5], R[7]
  { name: 'DR', facelets: [['D', 5], ['R', 7]] },
  // DF: D[1], F[7]
  { name: 'DF', facelets: [['D', 1], ['F', 7]] },
  // DL: D[3], L[7]
  { name: 'DL', facelets: [['D', 3], ['L', 7]] },
  // DB: D[7], B[7]
  { name: 'DB', facelets: [['D', 7], ['B', 7]] },
  // FR: F[5], R[3]
  { name: 'FR', facelets: [['F', 5], ['R', 3]] },
  // FL: F[3], L[5]
  { name: 'FL', facelets: [['F', 3], ['L', 5]] },
  // BL: B[5], L[3]
  { name: 'BL', facelets: [['B', 5], ['L', 3]] },
  // BR: B[3], R[5]
  { name: 'BR', facelets: [['B', 3], ['R', 5]] },
];

function edgeKey(c1: CubeColor, c2: CubeColor): string {
  return [c1, c2].sort().join('-');
}

function cornerKey(c1: CubeColor, c2: CubeColor, c3: CubeColor): string {
  return [c1, c2, c3].sort().join('-');
}

export function validate3x3State(state: Cube3x3State): ValidationResult {
  const faces: FaceName3x3[] = ['U', 'R', 'F', 'D', 'L', 'B'];

  // 1. Sticker counts
  const counts: Record<CubeColor, number> = {
    white: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    red: 0,
    orange: 0,
  };

  for (const f of faces) {
    for (const c of state[f]) {
      if (counts[c] !== undefined) counts[c]++;
    }
  }

  const badCounts: string[] = [];
  for (const [col, count] of Object.entries(counts)) {
    if (count !== 9) {
      badCounts.push(`${col.toUpperCase()}: ${count}/9`);
    }
  }

  if (badCounts.length > 0) {
    return {
      valid: false,
      error: 'Incomplete or uneven sticker counts',
      details: `Each colour must appear exactly 9 times. Discrepancies: ${badCounts.join(', ')}.`,
    };
  }

  // 2. Fixed Centers Check
  for (const f of faces) {
    const centerColor = state[f][4];
    const expected = EXPECTED_CENTERS[f];
    if (centerColor !== expected) {
      return {
        valid: false,
        error: 'Incorrect centre orientation',
        details: `The ${f} face centre is ${centerColor}, but must be ${expected}. Hold the cube with White on top and Green in front.`,
      };
    }
  }

  // 3. Edges Check
  const seenEdges = new Set<string>();
  const edgeList: string[] = [];

  for (const def of EDGES_3X3) {
    const c1 = state[def.facelets[0][0]][def.facelets[0][1]];
    const c2 = state[def.facelets[1][0]][def.facelets[1][1]];

    if (c1 === c2) {
      return {
        valid: false,
        error: 'Invalid edge piece',
        details: `The edge at ${def.name} has identical colours (${c1}-${c2}).`,
      };
    }

    if (OPPOSITE_COLORS[c1] === c2) {
      return {
        valid: false,
        error: 'Impossible edge piece',
        details: `Found an edge with ${c1} and ${c2}. These opposite colours cannot be on the same edge piece.`,
      };
    }

    const key = edgeKey(c1, c2);
    if (seenEdges.has(key)) {
      return {
        valid: false,
        error: 'Duplicate edge piece',
        details: `The ${c1}-${c2} edge appears twice. Please recheck your stickers.`,
      };
    }
    seenEdges.add(key);
    edgeList.push(key);
  }

  // 4. Corners Check
  const seenCorners = new Set<string>();
  const cornerList: string[] = [];

  for (const def of CORNERS_3X3) {
    const c1 = state[def.facelets[0][0]][def.facelets[0][1]];
    const c2 = state[def.facelets[1][0]][def.facelets[1][1]];
    const c3 = state[def.facelets[2][0]][def.facelets[2][1]];

    if (c1 === c2 || c2 === c3 || c1 === c3) {
      return {
        valid: false,
        error: 'Invalid corner piece',
        details: `A corner at ${def.name} has duplicate colours (${c1}, ${c2}, ${c3}).`,
      };
    }

    if (
      OPPOSITE_COLORS[c1] === c2 ||
      OPPOSITE_COLORS[c2] === c3 ||
      OPPOSITE_COLORS[c1] === c3
    ) {
      return {
        valid: false,
        error: 'Impossible corner piece',
        details: `Found a corner at ${def.name} with opposite colours (${c1}, ${c2}, ${c3}).`,
      };
    }

    const key = cornerKey(c1, c2, c3);
    if (seenCorners.has(key)) {
      return {
        valid: false,
        error: 'Duplicate corner piece',
        details: `The corner with colours ${c1}-${c2}-${c3} appears more than once. Please recheck your stickers.`,
      };
    }
    seenCorners.add(key);
    cornerList.push(key);
  }

  // 5. Parity & Orientation
  // A. Corner twist parity:
  // For each corner, find which position (0, 1, or 2) contains the U or D color ('white' or 'yellow').
  let cornerTwistSum = 0;
  for (const def of CORNERS_3X3) {
    const colors = [
      state[def.facelets[0][0]][def.facelets[0][1]],
      state[def.facelets[1][0]][def.facelets[1][1]],
      state[def.facelets[2][0]][def.facelets[2][1]],
    ];

    let ori = 0;
    for (let o = 0; o <= 2; o++) {
      if (colors[o] === 'white' || colors[o] === 'yellow') {
        ori = o;
        break;
      }
    }
    cornerTwistSum += ori;
  }

  if (cornerTwistSum % 3 !== 0) {
    return {
      valid: false,
      error: 'Corner twist parity error',
      details: 'One of the corner pieces is twisted. A cube in this state cannot be solved. Please check your corner stickers.',
    };
  }

  // B. Edge flip parity
  let edgeFlipSum = 0;
  for (const def of EDGES_3X3) {
    const c1 = state[def.facelets[0][0]][def.facelets[0][1]];
    const c2 = state[def.facelets[1][0]][def.facelets[1][1]];

    // If U or D color is present: it should be at facelets[0] (the U/D face)
    if (c1 === 'white' || c1 === 'yellow') {
      edgeFlipSum += 0;
    } else if (c2 === 'white' || c2 === 'yellow') {
      edgeFlipSum += 1;
    } else {
      // E-slice edge: green or blue on F/B facelet
      if (c1 === 'green' || c1 === 'blue') {
        edgeFlipSum += 0;
      } else {
        edgeFlipSum += 1;
      }
    }
  }

  if (edgeFlipSum % 2 !== 0) {
    return {
      valid: false,
      error: 'Edge flip parity error',
      details: 'One of the edge pieces is flipped. A cube in this state cannot be solved. Please check your edge stickers.',
    };
  }

  // C. Permutation parity
  const canonicalCorners = CORNERS_3X3.map((c) =>
    cornerKey(
      EXPECTED_CENTERS[c.facelets[0][0]],
      EXPECTED_CENTERS[c.facelets[1][0]],
      EXPECTED_CENTERS[c.facelets[2][0]]
    )
  );
  const cornerPerm = cornerList.map((c) => canonicalCorners.indexOf(c));

  let cornerInversions = 0;
  for (let i = 0; i < cornerPerm.length; i++) {
    for (let j = i + 1; j < cornerPerm.length; j++) {
      if (cornerPerm[i] > cornerPerm[j]) cornerInversions++;
    }
  }

  const canonicalEdges = EDGES_3X3.map((e) =>
    edgeKey(
      EXPECTED_CENTERS[e.facelets[0][0]],
      EXPECTED_CENTERS[e.facelets[1][0]]
    )
  );
  const edgePerm = edgeList.map((e) => canonicalEdges.indexOf(e));

  let edgeInversions = 0;
  for (let i = 0; i < edgePerm.length; i++) {
    for (let j = i + 1; j < edgePerm.length; j++) {
      if (edgePerm[i] > edgePerm[j]) edgeInversions++;
    }
  }

  if ((cornerInversions % 2) !== (edgeInversions % 2)) {
    return {
      valid: false,
      error: 'Permutation parity error',
      details: 'An impossible piece swap was detected. Two edges or two corners appear swapped. Please recheck your stickers.',
    };
  }

  return { valid: true };
}

import { CubeColor, ValidationResult } from '../../types/puzzle';
import { Cube2x2State, FaceName2x2 } from './cube2x2Facelets';
import { OPPOSITE_COLORS } from '../cube3x3/validation3x3';

export interface Corner2x2Def {
  name: string;
  f1: FaceName2x2;
  i1: number;
  f2: FaceName2x2;
  i2: number;
  f3: FaceName2x2;
  i3: number;
}

export const CORNERS_2X2: Corner2x2Def[] = [
  { name: 'UBL', f1: 'U', i1: 0, f2: 'B', i2: 1, f3: 'L', i3: 0 },
  { name: 'UBR', f1: 'U', i1: 1, f2: 'R', i2: 1, f3: 'B', i3: 0 },
  { name: 'UFL', f1: 'U', i1: 2, f2: 'L', i2: 1, f3: 'F', i3: 0 },
  { name: 'UFR', f1: 'U', i1: 3, f2: 'F', i2: 1, f3: 'R', i3: 0 },
  { name: 'DFL', f1: 'D', i1: 0, f2: 'F', i2: 2, f3: 'L', i3: 3 },
  { name: 'DFR', f1: 'D', i1: 1, f2: 'R', i2: 2, f3: 'F', i3: 3 },
  { name: 'DBL', f1: 'D', i1: 2, f2: 'L', i2: 2, f3: 'B', i3: 3 },
  { name: 'DBR', f1: 'D', i1: 3, f2: 'B', i2: 2, f3: 'R', i3: 3 },
];

function cornerKey(c1: CubeColor, c2: CubeColor, c3: CubeColor): string {
  return [c1, c2, c3].sort().join('-');
}

export function validate2x2State(state: Cube2x2State): ValidationResult {
  const faces: FaceName2x2[] = ['U', 'R', 'F', 'D', 'L', 'B'];

  // 1. Check sticker counts (must be 4 each)
  const counts: Record<CubeColor, number> = {
    white: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    red: 0,
    orange: 0,
  };

  for (const f of faces) {
    if (!state[f] || state[f].length !== 4) {
      return {
        valid: false,
        error: 'Missing face data',
        details: `Face ${f} does not have exactly 4 stickers.`,
      };
    }
    for (const c of state[f]) {
      if (counts[c] !== undefined) {
        counts[c]++;
      }
    }
  }

  const badCounts: string[] = [];
  for (const [col, count] of Object.entries(counts)) {
    if (count !== 4) {
      badCounts.push(`${col}: ${count}/4`);
    }
  }

  if (badCounts.length > 0) {
    return {
      valid: false,
      error: 'Incomplete or uneven sticker counts',
      details: `Each colour must appear exactly 4 times on a 2x2. Please check: ${badCounts.join(', ')}.`,
    };
  }

  // 2. Check each of the 8 corners
  const seenCorners = new Map<string, string>();

  for (const def of CORNERS_2X2) {
    const c1 = state[def.f1][def.i1];
    const c2 = state[def.f2][def.i2];
    const c3 = state[def.f3][def.i3];

    if (c1 === c2 || c2 === c3 || c1 === c3) {
      return {
        valid: false,
        error: 'Invalid corner piece',
        details: `The corner at ${def.name} has identical colours (${c1}, ${c2}, ${c3}). Please recheck.`,
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
        details: `Found a corner at ${def.name} with opposite colours (${c1}, ${c2}, ${c3}) which cannot exist on the same piece.`,
      };
    }

    const key = cornerKey(c1, c2, c3);
    if (seenCorners.has(key)) {
      return {
        valid: false,
        error: 'Duplicate corner piece',
        details: `The ${c1}-${c2}-${c3} corner appears twice (at ${seenCorners.get(key)} and ${def.name}). Please recheck.`,
      };
    }
    seenCorners.set(key, def.name);
  }

  // 3. Corner twist parity
  let twistSum = 0;
  for (const def of CORNERS_2X2) {
    const c1 = state[def.f1][def.i1]; // U or D facelet
    const c2 = state[def.f2][def.i2];
    const c3 = state[def.f3][def.i3];

    if (c1 === 'white' || c1 === 'yellow') {
      twistSum += 0;
    } else if (c2 === 'white' || c2 === 'yellow') {
      twistSum += 1;
    } else if (c3 === 'white' || c3 === 'yellow') {
      twistSum += 2;
    }
  }

  if (twistSum % 3 !== 0) {
    return {
      valid: false,
      error: 'Corner twist parity error',
      details: 'One of the corner pieces is twisted. A 2x2 cube with a twisted corner cannot be solved. Please check your stickers.',
    };
  }

  return { valid: true };
}

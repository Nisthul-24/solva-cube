import { ValidationResult } from '../../types/puzzle';
import { FaceNamePyraminx, PyraminxColor, PyraminxState } from './pyraminxFacelets';

export interface OffendingSticker {
  face: FaceNamePyraminx;
  index: number;
}

export interface PyraminxValidationResult extends ValidationResult {
  offendingStickers?: OffendingSticker[];
  derivedTargets?: Record<FaceNamePyraminx, PyraminxColor>;
}

export interface AxialDefinition {
  name: string;
  vertexKey: 'U' | 'L' | 'R' | 'B';
  oppositeFace: FaceNamePyraminx;
  stickers: Array<{ face: FaceNamePyraminx; index: number }>;
}

export const PYRAMINX_AXIAL_DEFS: AxialDefinition[] = [
  {
    name: 'Top',
    vertexKey: 'U',
    oppositeFace: 'D',
    stickers: [
      { face: 'F', index: 2 },
      { face: 'R', index: 2 },
      { face: 'L', index: 2 },
    ],
  },
  {
    name: 'Left',
    vertexKey: 'L',
    oppositeFace: 'R',
    stickers: [
      { face: 'F', index: 5 },
      { face: 'L', index: 7 },
      { face: 'D', index: 2 },
    ],
  },
  {
    name: 'Right',
    vertexKey: 'R',
    oppositeFace: 'L',
    stickers: [
      { face: 'F', index: 7 },
      { face: 'R', index: 5 },
      { face: 'D', index: 7 },
    ],
  },
  {
    name: 'Back',
    vertexKey: 'B',
    oppositeFace: 'F',
    stickers: [
      { face: 'R', index: 7 },
      { face: 'L', index: 5 },
      { face: 'D', index: 5 },
    ],
  },
];

export interface EdgeDefinition {
  name: string;
  fA: FaceNamePyraminx;
  iA: number;
  fB: FaceNamePyraminx;
  iB: number;
}

export const PYRAMINX_EDGE_DEFS: EdgeDefinition[] = [
  { name: 'Front-Right', fA: 'F', iA: 3, fB: 'R', iB: 1 },
  { name: 'Front-Left', fA: 'F', iA: 1, fB: 'L', iB: 3 },
  { name: 'Front-Bottom', fA: 'F', iA: 6, fB: 'D', iB: 3 },
  { name: 'Back (Right-Left)', fA: 'R', iA: 3, fB: 'L', iB: 1 },
  { name: 'Right-Bottom', fA: 'R', iA: 6, fB: 'D', iB: 6 },
  { name: 'Left-Bottom', fA: 'L', iA: 6, fB: 'D', iB: 1 },
];

export interface TipDefinition {
  name: string;
  vertexKey: 'U' | 'L' | 'R' | 'B';
  stickers: Array<{ face: FaceNamePyraminx; index: number }>;
}

export const PYRAMINX_TIP_DEFS: TipDefinition[] = [
  {
    name: 'Top Tip',
    vertexKey: 'U',
    stickers: [
      { face: 'F', index: 0 },
      { face: 'R', index: 0 },
      { face: 'L', index: 0 },
    ],
  },
  {
    name: 'Left Tip',
    vertexKey: 'L',
    stickers: [
      { face: 'F', index: 4 },
      { face: 'L', index: 8 },
      { face: 'D', index: 0 },
    ],
  },
  {
    name: 'Right Tip',
    vertexKey: 'R',
    stickers: [
      { face: 'F', index: 8 },
      { face: 'R', index: 4 },
      { face: 'D', index: 8 },
    ],
  },
  {
    name: 'Back Tip',
    vertexKey: 'B',
    stickers: [
      { face: 'R', index: 8 },
      { face: 'L', index: 4 },
      { face: 'D', index: 4 },
    ],
  },
];

/**
 * Derives target face colors from the axials of the user's state.
 * The missing color at axial vertex v is the target color of face opposite v.
 */
export function deriveTargetFaceColors(state: PyraminxState): Record<FaceNamePyraminx, PyraminxColor> {
  const faces: FaceNamePyraminx[] = ['F', 'R', 'L', 'D'];
  const allColorsSet = new Set<PyraminxColor>();
  for (const f of faces) {
    for (const c of state[f] || []) {
      if (c) allColorsSet.add(c);
    }
  }
  const allColors = Array.from(allColorsSet);

  const targetFaceColors: Partial<Record<FaceNamePyraminx, PyraminxColor>> = {};

  for (const ax of PYRAMINX_AXIAL_DEFS) {
    const axColors = ax.stickers.map((s) => state[s.face]?.[s.index]);
    const missing = allColors.find((c) => !axColors.includes(c));
    if (missing) {
      targetFaceColors[ax.oppositeFace] = missing;
    }
  }

  return targetFaceColors as Record<FaceNamePyraminx, PyraminxColor>;
}

/**
 * Independent validation for Pyraminx states without hardcoded color layout or chirality.
 * Checks:
 * (a) 9 stickers of each of 4 distinct colors
 * (b) Axials: 3 distinct colors each, all 4 missing colors distinct
 * (c) Edges: 2 distinct colors each, 6 unique edge pairs
 * (d) Solvability: edge permutation parity even, edge flip sum mod 2 = 0
 * Tips can never cause an orientation or solvability rejection.
 */
export function validatePyraminxDerived(state: PyraminxState): PyraminxValidationResult {
  const faces: FaceNamePyraminx[] = ['F', 'R', 'L', 'D'];

  // 1. Check face completeness
  for (const f of faces) {
    if (!state[f] || state[f].length !== 9) {
      return {
        valid: false,
        error: 'Missing face data',
        details: `Face ${f} does not have exactly 9 stickers.`,
      };
    }
  }

  // (a) Counts: exactly 9 of each of 4 distinct colors
  const counts: Record<string, number> = {};
  for (const f of faces) {
    for (const c of state[f]) {
      counts[c] = (counts[c] || 0) + 1;
    }
  }

  const colorEntries = Object.entries(counts);
  const badCounts = colorEntries.filter(([, count]) => count !== 9);

  if (colorEntries.length !== 4 || badCounts.length > 0) {
    const desc = colorEntries.map(([col, count]) => `${col}: ${count}/9`).join(', ');
    const badColors = new Set(badCounts.map(([col]) => col));

    const offendingStickers: OffendingSticker[] = [];
    for (const f of faces) {
      state[f].forEach((col, idx) => {
        if (badColors.has(col)) {
          offendingStickers.push({ face: f, index: idx });
        }
      });
    }

    return {
      valid: false,
      error: 'Incomplete or uneven sticker counts',
      details: `Each colour must appear exactly 9 times across the 4 faces. Current counts: ${desc}.`,
      offendingStickers,
    };
  }

  const distinctColors = Object.keys(counts) as PyraminxColor[];

  // (b) Axials: each has 3 distinct colors, and the 4 axials disagree on missing color
  const missingByAxial: Record<string, PyraminxColor> = {};
  const seenMissing = new Map<PyraminxColor, string>();

  for (const ax of PYRAMINX_AXIAL_DEFS) {
    const c1 = state[ax.stickers[0].face][ax.stickers[0].index];
    const c2 = state[ax.stickers[1].face][ax.stickers[1].index];
    const c3 = state[ax.stickers[2].face][ax.stickers[2].index];

    if (c1 === c2 || c2 === c3 || c1 === c3) {
      const dup = c1 === c2 ? c1 : c3;
      return {
        valid: false,
        error: 'Invalid axial piece',
        details: `${ax.name} vertex has two stickers of the same colour (${dup}). All three colours on an axial must be distinct.`,
        offendingStickers: [...ax.stickers],
      };
    }

    const axSet = new Set([c1, c2, c3]);
    const missing = distinctColors.find((c) => !axSet.has(c));
    if (!missing) {
      return {
        valid: false,
        error: 'Invalid axial piece',
        details: `${ax.name} vertex contains invalid colors.`,
        offendingStickers: [...ax.stickers],
      };
    }

    if (seenMissing.has(missing)) {
      const otherAxName = seenMissing.get(missing)!;
      const otherAx = PYRAMINX_AXIAL_DEFS.find((a) => a.name === otherAxName)!;
      return {
        valid: false,
        error: 'Contradictory axial colors',
        details: `${ax.name} and ${otherAxName} vertices both suggest ${missing} as opposite. Please check the colours on these vertices.`,
        offendingStickers: [...ax.stickers, ...otherAx.stickers],
      };
    }

    seenMissing.set(missing, ax.name);
    missingByAxial[ax.oppositeFace] = missing;
  }

  // Derived target face colors:
  const derivedTargets: Record<FaceNamePyraminx, PyraminxColor> = {
    F: missingByAxial.F,
    R: missingByAxial.R,
    L: missingByAxial.L,
    D: missingByAxial.D,
  };

  // (c) Edges: 2 distinct colors each, legal face pairs and no duplicate edge types
  const seenEdgePairs = new Map<string, EdgeDefinition>();
  for (const ed of PYRAMINX_EDGE_DEFS) {
    const cA = state[ed.fA][ed.iA];
    const cB = state[ed.fB][ed.iB];

    if (cA === cB) {
      return {
        valid: false,
        error: 'Invalid edge piece',
        details: `Edge at ${ed.name} has identical colours on both sides (${cA}). An edge piece must have two distinct colours.`,
        offendingStickers: [
          { face: ed.fA, index: ed.iA },
          { face: ed.fB, index: ed.iB },
        ],
      };
    }

    const pairKey = [cA, cB].sort().join('-');
    if (seenEdgePairs.has(pairKey)) {
      const otherEd = seenEdgePairs.get(pairKey)!;
      return {
        valid: false,
        error: 'Duplicate edge piece',
        details: `Duplicate edge piece with colours ${cA} and ${cB}. Each edge piece must have a unique pair of colours.`,
        offendingStickers: [
          { face: ed.fA, index: ed.iA },
          { face: ed.fB, index: ed.iB },
          { face: otherEd.fA, index: otherEd.iA },
          { face: otherEd.fB, index: otherEd.iB },
        ],
      };
    }
    seenEdgePairs.set(pairKey, ed);
  }

  // (d) Solvability: edge permutation parity even, edge flip sum mod 2 = 0
  const perm: number[] = [];
  const flips: number[] = [];
  const flippedEdgeStickers: OffendingSticker[] = [];

  for (let pos = 0; pos < 6; pos++) {
    const ed = PYRAMINX_EDGE_DEFS[pos];
    const cA = state[ed.fA][ed.iA];
    const cB = state[ed.fB][ed.iB];

    let homeSlot = -1;
    let flip = 0;

    for (let h = 0; h < 6; h++) {
      const hDef = PYRAMINX_EDGE_DEFS[h];
      const hTargetA = derivedTargets[hDef.fA];
      const hTargetB = derivedTargets[hDef.fB];

      if (cA === hTargetA && cB === hTargetB) {
        homeSlot = h;
        flip = 0;
        break;
      } else if (cA === hTargetB && cB === hTargetA) {
        homeSlot = h;
        flip = 1;
        break;
      }
    }

    if (homeSlot === -1) {
      return {
        valid: false,
        error: 'Impossible edge piece',
        details: `Edge at ${ed.name} has colour pair (${cA}, ${cB}) which does not match any valid slot.`,
        offendingStickers: [
          { face: ed.fA, index: ed.iA },
          { face: ed.fB, index: ed.iB },
        ],
      };
    }

    perm.push(homeSlot);
    flips.push(flip);
    if (flip === 1) {
      flippedEdgeStickers.push(
        { face: ed.fA, index: ed.iA },
        { face: ed.fB, index: ed.iB }
      );
    }
  }

  // Permutation parity
  let inversions = 0;
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      if (perm[i] > perm[j]) inversions++;
    }
  }

  if (inversions % 2 !== 0) {
    const allEdgeStickers: OffendingSticker[] = [];
    for (const ed of PYRAMINX_EDGE_DEFS) {
      allEdgeStickers.push(
        { face: ed.fA, index: ed.iA },
        { face: ed.fB, index: ed.iB }
      );
    }
    return {
      valid: false,
      error: 'Impossible edge permutation',
      details: 'Invalid Pyraminx edge permutation parity. Two edges are swapped, which is impossible on a legal Pyraminx.',
      offendingStickers: allEdgeStickers,
    };
  }

  const flipSum = flips.reduce((a, b) => a + b, 0);
  if (flipSum % 2 !== 0) {
    return {
      valid: false,
      error: 'Impossible edge orientation',
      details: 'Invalid Pyraminx edge orientation. A single edge is flipped, which is impossible without disassembling the puzzle.',
      offendingStickers: flippedEdgeStickers,
    };
  }

  return {
    valid: true,
    derivedTargets,
  };
}

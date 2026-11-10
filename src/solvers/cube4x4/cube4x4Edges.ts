import { Move, CubeColor } from '../../types/puzzle';
import { FaceName3x3 } from '../../components/3d/cubieModel';
import { Cube4x4State } from './cube4x4Types';
import {
  CUBE4X4_FACES,
  apply4x4Move,
  turnInfo4x4,
} from './cube4x4Geometry';
import { areAllCentresSolved } from './cube4x4Centres';
import { optimizeMoves4x4, optimizeMoves4x4Objects } from '../core/moveOptimizer4x4';

export interface EdgeWing {
  face1: FaceName3x3;
  idx1: number;
  face2: FaceName3x3;
  idx2: number;
}

export interface EdgePairDef {
  name: string;
  w1: EdgeWing;
  w2: EdgeWing;
}

export const EDGE_PAIRS_4X4: EdgePairDef[] = [
  // U layer
  { name: 'UB', w1: { face1: 'U', idx1: 1, face2: 'B', idx2: 2 }, w2: { face1: 'U', idx1: 2, face2: 'B', idx2: 1 } },
  { name: 'UL', w1: { face1: 'U', idx1: 4, face2: 'L', idx2: 1 }, w2: { face1: 'U', idx1: 8, face2: 'L', idx2: 2 } },
  { name: 'UR', w1: { face1: 'U', idx1: 7, face2: 'R', idx2: 2 }, w2: { face1: 'U', idx1: 11, face2: 'R', idx2: 1 } },
  { name: 'UF', w1: { face1: 'U', idx1: 13, face2: 'F', idx2: 1 }, w2: { face1: 'U', idx1: 14, face2: 'F', idx2: 2 } },

  // Equator
  { name: 'FL', w1: { face1: 'F', idx1: 4, face2: 'L', idx2: 7 }, w2: { face1: 'F', idx1: 8, face2: 'L', idx2: 11 } },
  { name: 'FR', w1: { face1: 'F', idx1: 7, face2: 'R', idx2: 4 }, w2: { face1: 'F', idx1: 11, face2: 'R', idx2: 8 } },
  { name: 'BL', w1: { face1: 'B', idx1: 7, face2: 'L', idx2: 4 }, w2: { face1: 'B', idx1: 11, face2: 'L', idx2: 8 } },
  { name: 'BR', w1: { face1: 'B', idx1: 4, face2: 'R', idx2: 7 }, w2: { face1: 'B', idx1: 8, face2: 'R', idx2: 11 } },

  // D layer
  { name: 'DF', w1: { face1: 'D', idx1: 1, face2: 'F', idx2: 13 }, w2: { face1: 'D', idx1: 2, face2: 'F', idx2: 14 } },
  { name: 'DR', w1: { face1: 'D', idx1: 7, face2: 'R', idx2: 13 }, w2: { face1: 'D', idx1: 11, face2: 'R', idx2: 14 } },
  { name: 'DL', w1: { face1: 'D', idx1: 4, face2: 'L', idx2: 14 }, w2: { face1: 'D', idx1: 8, face2: 'L', idx2: 13 } },
  { name: 'DB', w1: { face1: 'D', idx1: 13, face2: 'B', idx2: 14 }, w2: { face1: 'D', idx1: 14, face2: 'B', idx2: 13 } },
];

export function isEdgePaired(state: Cube4x4State, edge: EdgePairDef): boolean {
  const c1_w1 = state[edge.w1.face1][edge.w1.idx1];
  const c2_w1 = state[edge.w1.face2][edge.w1.idx2];

  const c1_w2 = state[edge.w2.face1][edge.w2.idx1];
  const c2_w2 = state[edge.w2.face2][edge.w2.idx2];

  return c1_w1 === c1_w2 && c2_w1 === c2_w2;
}

export function areAllEdgesPaired(state: Cube4x4State): boolean {
  return EDGE_PAIRS_4X4.every((e) => isEdgePaired(state, e));
}

export function getUnpairedEdges(state: Cube4x4State): EdgePairDef[] {
  return EDGE_PAIRS_4X4.filter((e) => !isEdgePaired(state, e));
}

// Setups to FL when FR is not yet occupied (can use F, L, U, B, D)
export const SETUP_FIRST_TO_FL: Record<string, string[]> = {
  FL: [],
  UL: ['L'],
  DL: ["L'"],
  BL: ['L2'],
  DF: ['F'],
  UF: ["F'"],
  FR: ['F2'],
  UB: ['U2', "F'"],
  DB: ['D2', 'F'],
  UR: ["U'", "F'"],
  DR: ['D', 'F'],
  BR: ['B2', 'L2'],
};

// Setups to FR when FL is ALREADY occupied (must only use R, U, B, D)
export const SETUP_SECOND_TO_FR: Record<string, string[]> = {
  FR: [],
  UR: ["R'"],
  UB: ['U', "R'"],
  UL: ['U2', "R'"],
  UF: ["U'", "R'"],
  BR: ['R2'],
  BL: ['B2', 'R2'],
  DR: ['R'],
  DF: ['D', 'R'],
  DL: ['D2', 'R'],
  DB: ["D'", 'R'],
};

// Setups to FR when FL is not yet occupied (can use F, R, U, B, D)
export const SETUP_FIRST_TO_FR: Record<string, string[]> = {
  FR: [],
  UR: ["R'"],
  DR: ['R'],
  BR: ['R2'],
  DF: ["F'"],
  UF: ['F'],
  FL: ['F2'],
  UB: ['U2', 'F'],
  DB: ['D2', "F'"],
  UL: ['U', 'F'],
  DL: ["D'", "F'"],
  BL: ['B2', 'R2'],
};

// Setups to FL when FR is ALREADY occupied (must only use L, U, B, D)
export const SETUP_SECOND_TO_FL: Record<string, string[]> = {
  FL: [],
  UL: ['L'],
  UB: ["U'", 'L'],
  UR: ['U2', 'L'],
  UF: ['U', 'L'],
  BL: ['L2'],
  BR: ['B2', 'L2'],
  DL: ["L'"],
  DF: ["D'", "L'"],
  DB: ['D', "L'"],
  DR: ['D2', "L'"],
};

export const SETUP_TO_FL = SETUP_FIRST_TO_FL;
export const SETUP_TO_FR = SETUP_SECOND_TO_FR;

function invert(m: string): string {
  if (m.endsWith("'")) return m.slice(0, -1);
  if (m.endsWith('2')) return m;
  return m + "'";
}

function invertSeq(seq: string[]): string[] {
  return [...seq].reverse().map(invert);
}

const FLIP_FR = ['R', 'U', "R'", 'F', "R'", "F'", 'R'];
const MACRO_PAIR = ["Uw'", ...FLIP_FR, 'Uw'];

// Top layer replacements into FR
const REPLACEMENTS_FR_TOP = [
  ['R', "U'", "R'"],
  ['R', 'U', "R'"],
  ['R', 'U2', "R'"],
  ["F'", 'U', 'F'],
  ["F'", "U'", 'F'],
  ["F'", 'U2', 'F'],
];

// Bottom layer replacements into FR
const REPLACEMENTS_FR_BOTTOM = [
  ["R'", 'D', 'R'],
  ["R'", "D'", 'R'],
  ["R'", 'D2', 'R'],
  ['F', "D'", "F'"],
  ['F', 'D', "F'"],
  ['F', 'D2', "F'"],
];

const CANDIDATES: string[][] = [];

// Uw slice with top replacements
for (const rep of REPLACEMENTS_FR_TOP) {
  CANDIDATES.push(["Uw'", ...rep, 'Uw']);
  CANDIDATES.push(['Uw', ...rep, "Uw'"]);
  // With U pre-alignment
  CANDIDATES.push(["Uw'", 'U', ...rep, "U'", 'Uw']);
  CANDIDATES.push(["Uw'", "U'", ...rep, 'U', 'Uw']);
  CANDIDATES.push(["Uw'", 'U2', ...rep, 'U2', 'Uw']);
  CANDIDATES.push(['Uw', 'U', ...rep, "U'", "Uw'"]);
  CANDIDATES.push(['Uw', "U'", ...rep, 'U', "Uw'"]);
  CANDIDATES.push(['Uw', 'U2', ...rep, 'U2', "Uw'"]);
}

// Dw slice with bottom replacements
for (const rep of REPLACEMENTS_FR_BOTTOM) {
  CANDIDATES.push(['Dw', ...rep, "Dw'"]);
  CANDIDATES.push(["Dw'", ...rep, 'Dw']);
  // With D pre-alignment
  CANDIDATES.push(['Dw', 'D', ...rep, "D'", "Dw'"]);
  CANDIDATES.push(['Dw', "D'", ...rep, 'D', "Dw'"]);
  CANDIDATES.push(['Dw', 'D2', ...rep, 'D2', "Dw'"]);
  CANDIDATES.push(["Dw'", 'D', ...rep, "D'", 'Dw']);
  CANDIDATES.push(["Dw'", "D'", ...rep, 'D', 'Dw']);
  CANDIDATES.push(["Dw'", 'D2', ...rep, 'D2', 'Dw']);
}

// Uw2 and Dw2 slice candidates
for (const rep of REPLACEMENTS_FR_TOP.slice(0, 3)) {
  CANDIDATES.push(['Uw2', ...rep, 'Uw2']);
}
for (const rep of REPLACEMENTS_FR_BOTTOM.slice(0, 3)) {
  CANDIDATES.push(['Dw2', ...rep, 'Dw2']);
}

// 7-move direct L2E algorithms
CANDIDATES.push(['Dw', 'R', "F'", 'U', "R'", 'F', "Dw'"]);
CANDIDATES.push(["Dw'", 'R', "F'", 'U', "R'", 'F', 'Dw']);
CANDIDATES.push(['Uw', 'R', "F'", 'U', "R'", 'F', "Uw'"]);
CANDIDATES.push(["Uw'", 'R', "F'", 'U', "R'", 'F', 'Uw']);
CANDIDATES.push(['Dw', "F'", 'L', "U'", 'F', "L'", "Dw'"]);
CANDIDATES.push(["Dw'", "F'", 'L', "U'", 'F', "L'", 'Dw']);
CANDIDATES.push(['Uw', "F'", 'L', "U'", 'F', "L'", "Uw'"]);
CANDIDATES.push(["Uw'", "F'", 'L', "U'", 'F', "L'", 'Uw']);

// Flips and fallback
for (const rep of REPLACEMENTS_FR_TOP.slice(0, 3)) {
  CANDIDATES.push([...FLIP_FR, "Uw'", ...rep, 'Uw']);
  CANDIDATES.push([...FLIP_FR, 'Uw', ...rep, "Uw'"]);
}
CANDIDATES.push(MACRO_PAIR);
CANDIDATES.push([...FLIP_FR, ...MACRO_PAIR]);

/**
 * Stage 2: Fast Edge Pairing
 * Pairs all 12 edge pairs using greedy minimum-setup outer face turns
 * and direct slice-replace insertions without whole-cube rotations.
 */
export function solve4x4Edges(
  initialState: Cube4x4State,
  targetColors: Record<FaceName3x3, CubeColor>
): { moves: Move[]; state: Cube4x4State } {
  let cur = initialState;
  const rawMoves: string[] = [];

  let iters = 0;
  while (!areAllEdgesPaired(cur) && iters++ < 30) {
    const unpaired = getUnpairedEdges(cur);
    if (unpaired.length === 0) break;

    let bestOption: {
      setups: string[];
      cand: string[];
      score: number;
    } | null = null;

    const initialPairedCount = EDGE_PAIRS_4X4.filter((e) => isEdgePaired(cur, e)).length;

    for (const targetEdge of unpaired) {
      const c1 = cur[targetEdge.w1.face1][targetEdge.w1.idx1];
      const c2 = cur[targetEdge.w1.face2][targetEdge.w1.idx2];

      // Config 1: target -> FL, partner -> FR
      {
        const setupFL = SETUP_FIRST_TO_FL[targetEdge.name] || [];
        let simFL = cur;
        for (const m of setupFL) simFL = apply4x4Move(simFL, m);

        let currentPartnerEdge = 'FR';
        for (const ep of EDGE_PAIRS_4X4) {
          if (ep.name === 'FL') continue;
          for (const w of [ep.w1, ep.w2]) {
            const wc1 = simFL[w.face1][w.idx1];
            const wc2 = simFL[w.face2][w.idx2];
            if ((wc1 === c1 && wc2 === c2) || (wc1 === c2 && wc2 === c1)) {
              currentPartnerEdge = ep.name;
              break;
            }
          }
          if (currentPartnerEdge !== 'FR') break;
        }

        const setupFR = SETUP_SECOND_TO_FR[currentPartnerEdge] || [];
        let simFR = simFL;
        for (const m of setupFR) simFR = apply4x4Move(simFR, m);

        for (const cand of CANDIDATES) {
          let sim = simFR;
          for (const m of cand) sim = apply4x4Move(sim, m);

          if (areAllCentresSolved(sim, targetColors)) {
            const count = EDGE_PAIRS_4X4.filter((e) => isEdgePaired(sim, e)).length;
            if (count > initialPairedCount) {
              const totalLen = setupFL.length + setupFR.length + cand.length;
              const score = count * 1000 - totalLen;
              if (!bestOption || score > bestOption.score) {
                bestOption = { setups: [...setupFL, ...setupFR], cand, score };
              }
            }
          }
        }
      }

      // Config 2: target -> FR, partner -> FL
      {
        const setupFR = SETUP_FIRST_TO_FR[targetEdge.name] || [];
        let simFR = cur;
        for (const m of setupFR) simFR = apply4x4Move(simFR, m);

        let currentPartnerEdge = 'FL';
        for (const ep of EDGE_PAIRS_4X4) {
          if (ep.name === 'FR') continue;
          for (const w of [ep.w1, ep.w2]) {
            const wc1 = simFR[w.face1][w.idx1];
            const wc2 = simFR[w.face2][w.idx2];
            if ((wc1 === c1 && wc2 === c2) || (wc1 === c2 && wc2 === c1)) {
              currentPartnerEdge = ep.name;
              break;
            }
          }
          if (currentPartnerEdge !== 'FL') break;
        }

        const setupFL = SETUP_SECOND_TO_FL[currentPartnerEdge] || [];
        let simFL = simFR;
        for (const m of setupFL) simFL = apply4x4Move(simFL, m);

        for (const cand of CANDIDATES) {
          let sim = simFL;
          for (const m of cand) sim = apply4x4Move(sim, m);

          if (areAllCentresSolved(sim, targetColors)) {
            const count = EDGE_PAIRS_4X4.filter((e) => isEdgePaired(sim, e)).length;
            if (count > initialPairedCount) {
              const totalLen = setupFR.length + setupFL.length + cand.length;
              const score = count * 1000 - totalLen;
              if (!bestOption || score > bestOption.score) {
                bestOption = { setups: [...setupFR, ...setupFL], cand, score };
              }
            }
          }
        }
      }
    }

    if (!bestOption) {
      // Fallback with unsetup
      const targetEdge = unpaired[0];
      const setupFL = SETUP_TO_FL[targetEdge.name] || [];
      const unsetupFL = invertSeq(setupFL);
      let simFL = cur;
      for (const m of setupFL) simFL = apply4x4Move(simFL, m);

      let currentPartnerEdge = 'FR';
      const c1 = cur[targetEdge.w1.face1][targetEdge.w1.idx1];
      const c2 = cur[targetEdge.w1.face2][targetEdge.w1.idx2];
      for (const ep of EDGE_PAIRS_4X4) {
        if (ep.name === 'FL') continue;
        for (const w of [ep.w1, ep.w2]) {
          const wc1 = simFL[w.face1][w.idx1];
          const wc2 = simFL[w.face2][w.idx2];
          if ((wc1 === c1 && wc2 === c2) || (wc1 === c2 && wc2 === c1)) {
            currentPartnerEdge = ep.name;
            break;
          }
        }
        if (currentPartnerEdge !== 'FR') break;
      }
      const setupFR = SETUP_TO_FR[currentPartnerEdge] || [];
      const unsetupFR = invertSeq(setupFR);

      for (const m of setupFL) cur = apply4x4Move(cur, m);
      rawMoves.push(...setupFL);
      for (const m of setupFR) cur = apply4x4Move(cur, m);
      rawMoves.push(...setupFR);
      for (const m of MACRO_PAIR) cur = apply4x4Move(cur, m);
      rawMoves.push(...MACRO_PAIR);
      for (const m of unsetupFR) cur = apply4x4Move(cur, m);
      rawMoves.push(...unsetupFR);
      for (const m of unsetupFL) cur = apply4x4Move(cur, m);
      rawMoves.push(...unsetupFL);
      continue;
    }

    // Apply bestOption directly without unsetup!
    for (const m of bestOption.setups) cur = apply4x4Move(cur, m);
    rawMoves.push(...bestOption.setups);

    for (const m of bestOption.cand) cur = apply4x4Move(cur, m);
    rawMoves.push(...bestOption.cand);
  }

  const optNotations = optimizeMoves4x4(rawMoves);
  const moves: Move[] = optNotations.map((notation) => {
    const t = turnInfo4x4(notation);
    return {
      notation,
      face: notation[0].toUpperCase(),
      direction: t.direction,
      amount: t.direction === 'DOUBLE' ? 2 : t.direction === 'CCW' ? -1 : 1,
      description: t.wording,
      stage: 'Stage 2 of 4: Pair all 12 Edges',
    };
  });

  return { moves, state: cur };
}

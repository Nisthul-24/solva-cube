import { Move, CubeColor } from '../../types/puzzle';
import { FaceName3x3 } from '../../components/3d/cubieModel';
import { Cube4x4State } from './cube4x4Types';
import {
  CUBE4X4_FACES,
  apply4x4Move,
  turnInfo4x4,
} from './cube4x4Geometry';
import { areAllCentresSolved } from './cube4x4Centres';
import { optimizeMoves4x4Objects } from '../core/moveOptimizer4x4';

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

const FLIP_FR = ['R', 'U', "R'", 'F', "R'", "F'", 'R'];
const MACRO_PAIR = ["Uw'", ...FLIP_FR, 'Uw'];

const ROT_TO_FL: Record<string, string[]> = {
  FL: [],
  FR: ['Uw', "Dw'"],
  BL: ["Uw'", 'Dw'],
  BR: ['Uw', "Dw'", 'Uw', "Dw'"],
  UF: ["Fw'", 'Bw'],
  DF: ['Fw', "Bw'"],
  UL: ["Rw'", 'Lw'],
  DL: ['Rw', "Lw'"],
  UR: ["Rw'", 'Lw', 'Uw', "Dw'"],
  DR: ['Rw', "Lw'", 'Uw', "Dw'"],
  UB: ["Rw'", 'Lw', "Fw'", 'Bw'],
  DB: ['Rw', "Lw'", 'Fw', "Bw'"],
};

const SETUP_TO_FR: Record<string, string[]> = {
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

function invert(m: string): string {
  if (m.endsWith("'")) return m.slice(0, -1);
  if (m.endsWith('2')) return m;
  return m + "'";
}

function invertSeq(seq: string[]): string[] {
  return [...seq].reverse().map(invert);
}

/**
 * Stage 2: Edge Pairing
 * Pairs all 12 edge pairs while preserving all 6 centres.
 */
export function solve4x4Edges(
  initialState: Cube4x4State,
  targetColors: Record<FaceName3x3, CubeColor>
): { moves: Move[]; state: Cube4x4State } {
  let cur = initialState;
  const moves: Move[] = [];

  function doMove(notation: string) {
    cur = apply4x4Move(cur, notation);
    const t = turnInfo4x4(notation);
    moves.push({
      notation,
      face: notation[0].toUpperCase(),
      direction: t.direction,
      amount: t.direction === 'DOUBLE' ? 2 : t.direction === 'CCW' ? -1 : 1,
      description: t.wording,
      stage: 'Stage 2 of 4: Pair all 12 Edges',
    });
  }

  function doMoves(seq: string[]) {
    for (const m of seq) doMove(m);
  }

  let iters = 0;
  while (!areAllEdgesPaired(cur) && iters++ < 40) {
    const unpaired = getUnpairedEdges(cur);
    if (unpaired.length === 0) break;

    // Pick first unpaired edge
    const targetEdge = unpaired[0];
    const c1 = cur[targetEdge.w1.face1][targetEdge.w1.idx1];
    const c2 = cur[targetEdge.w1.face2][targetEdge.w1.idx2];

    // Rotate targetEdge to FL
    const rot = ROT_TO_FL[targetEdge.name] || [];
    const unrot = invertSeq(rot);
    doMoves(rot);

    // Now targetEdge is at FL.
    // Re-find which slot now contains the partner wing!
    let currentPartnerEdge: string = 'FR';
    for (const ep of EDGE_PAIRS_4X4) {
      if (ep.name === 'FL') continue;
      for (const w of [ep.w1, ep.w2]) {
        const wc1 = cur[w.face1][w.idx1];
        const wc2 = cur[w.face2][w.idx2];
        if ((wc1 === c1 && wc2 === c2) || (wc1 === c2 && wc2 === c1)) {
          currentPartnerEdge = ep.name;
          break;
        }
      }
      if (currentPartnerEdge !== 'FR') break;
    }

    // Bring currentPartnerEdge to FR
    const setupFR = SETUP_TO_FR[currentPartnerEdge] || [];
    const unsetupFR = invertSeq(setupFR);
    doMoves(setupFR);

    // Test candidates: which one maximizes paired edges count while preserving centres
    const candidates = [
      ["Uw'", 'R', "U'", "R'", 'Uw'],
      ["Uw'", 'R', 'U', "R'", 'Uw'],
      ['Uw', 'R', "U'", "R'", "Uw'"],
      ['Uw', 'R', 'U', "R'", "Uw'"],
      ["Uw'", 'R', 'U2', "R'", 'Uw'],
      ['Uw', 'R', 'U2', "R'", "Uw'"],
      MACRO_PAIR,
      [...FLIP_FR, ...MACRO_PAIR],
      [...MACRO_PAIR, ...FLIP_FR],
      [...FLIP_FR, ...MACRO_PAIR, ...FLIP_FR],
    ];

    let bestCand: string[] = candidates[0];
    let bestPairedCount = -1;
    const initialPairedCount = EDGE_PAIRS_4X4.filter((e) => isEdgePaired(cur, e)).length;

    for (const cand of candidates) {
      let sim = cur;
      for (const m of cand) sim = apply4x4Move(sim, m);
      for (const m of unsetupFR) sim = apply4x4Move(sim, m);
      for (const m of unrot) sim = apply4x4Move(sim, m);

      if (areAllCentresSolved(sim, targetColors)) {
        const count = EDGE_PAIRS_4X4.filter((e) => isEdgePaired(sim, e)).length;
        if (count > bestPairedCount) {
          bestPairedCount = count;
          bestCand = cand;
        }
      }
    }

    if (bestPairedCount <= initialPairedCount) {
      // Fallback to standard macro
      bestCand = MACRO_PAIR;
    }

    doMoves(bestCand);
    doMoves(unsetupFR);
    doMoves(unrot);
  }

  const optMoves = optimizeMoves4x4Objects(moves);
  return { moves: optMoves, state: cur };
}

import { Move } from '../../types/puzzle';
import { CubeColor } from '../../types/puzzle';
import { FaceName3x3 } from '../../components/3d/cubieModel';
import { Cube4x4State } from './cube4x4Types';
import {
  CUBE4X4_FACES,
  apply4x4Move,
  turnInfo4x4,
  getStandardSolved4x4State,
} from './cube4x4Geometry';

export const CENTER_INDICES = [5, 6, 9, 10];

export function areAllCentresSolved(
  state: Cube4x4State,
  targetColors: Record<FaceName3x3, CubeColor>
): boolean {
  for (const face of CUBE4X4_FACES) {
    const target = targetColors[face];
    for (const idx of CENTER_INDICES) {
      if (state[face][idx] !== target) return false;
    }
  }
  return true;
}

export function isFaceCentreSolved(
  state: Cube4x4State,
  face: FaceName3x3,
  targetColor: CubeColor
): boolean {
  for (const idx of CENTER_INDICES) {
    if (state[face][idx] !== targetColor) return false;
  }
  return true;
}

// Commutator: cycles U10 -> F9 -> F10 -> U10
// When applied with setup: moves F(idxSrc) into U(idxDst)
const COMM_UF = ['r', 'U', "l'", "U'", "r'", 'U', 'l', "U'"];

function getSetupTo10(faceLetter: string, slot: number): { setup: string[]; unsetup: string[] } {
  if (slot === 10) return { setup: [], unsetup: [] };
  if (slot === 6) return { setup: [faceLetter], unsetup: [`${faceLetter}'`] };
  if (slot === 5) return { setup: [`${faceLetter}2`], unsetup: [`${faceLetter}2`] };
  if (slot === 9) return { setup: [`${faceLetter}'`], unsetup: [faceLetter] };
  throw new Error(`invalid slot ${slot}`);
}

const ROT_MAP: Record<string, { rot: string[]; unrot: string[] }> = {
  "U_F": { "rot": [], "unrot": [] },
  "U_R": { "rot": ["Uw", "Dw'"], "unrot": ["Uw'", "Dw"] },
  "U_B": { "rot": ["Uw2", "Dw2"], "unrot": ["Uw2", "Dw2"] },
  "U_L": { "rot": ["Uw'", "Dw"], "unrot": ["Uw", "Dw'"] },
  "F_D": { "rot": ["Rw", "Lw'"], "unrot": ["Rw'", "Lw"] },
  "F_R": { "rot": ["Rw", "Lw'", "Uw", "Dw'"], "unrot": ["Uw'", "Dw", "Rw'", "Lw"] },
  "F_U": { "rot": ["Rw", "Lw'", "Uw2", "Dw2"], "unrot": ["Uw2", "Dw2", "Rw'", "Lw"] },
  "F_L": { "rot": ["Rw", "Lw'", "Uw'", "Dw"], "unrot": ["Uw", "Dw'", "Rw'", "Lw"] },
  "D_B": { "rot": ["Rw2", "Lw2"], "unrot": ["Rw2", "Lw2"] },
  "D_R": { "rot": ["Rw2", "Lw2", "Uw", "Dw'"], "unrot": ["Uw'", "Dw", "Rw2", "Lw2"] },
  "D_F": { "rot": ["Rw2", "Lw2", "Uw2", "Dw2"], "unrot": ["Uw2", "Dw2", "Rw2", "Lw2"] },
  "D_L": { "rot": ["Rw2", "Lw2", "Uw'", "Dw"], "unrot": ["Uw", "Dw'", "Rw2", "Lw2"] },
  "B_U": { "rot": ["Rw'", "Lw"], "unrot": ["Rw", "Lw'"] },
  "B_R": { "rot": ["Rw'", "Lw", "Uw", "Dw'"], "unrot": ["Uw'", "Dw", "Rw", "Lw'"] },
  "B_D": { "rot": ["Rw'", "Lw", "Uw2", "Dw2"], "unrot": ["Uw2", "Dw2", "Rw", "Lw'"] },
  "B_L": { "rot": ["Rw'", "Lw", "Uw'", "Dw"], "unrot": ["Uw", "Dw'", "Rw", "Lw'"] },
  "L_F": { "rot": ["Fw", "Bw'"], "unrot": ["Fw'", "Bw"] },
  "L_U": { "rot": ["Fw", "Bw'", "Uw", "Dw'"], "unrot": ["Uw'", "Dw", "Fw'", "Bw"] },
  "L_B": { "rot": ["Fw", "Bw'", "Uw2", "Dw2"], "unrot": ["Uw2", "Dw2", "Fw'", "Bw"] },
  "L_D": { "rot": ["Fw", "Bw'", "Uw'", "Dw"], "unrot": ["Uw", "Dw'", "Fw'", "Bw"] },
  "R_F": { "rot": ["Fw'", "Bw"], "unrot": ["Fw", "Bw'"] },
  "R_D": { "rot": ["Fw'", "Bw", "Uw", "Dw'"], "unrot": ["Uw'", "Dw", "Fw", "Bw'"] },
  "R_B": { "rot": ["Fw'", "Bw", "Uw2", "Dw2"], "unrot": ["Uw2", "Dw2", "Fw", "Bw'"] },
  "R_U": { "rot": ["Fw'", "Bw", "Uw'", "Dw"], "unrot": ["Uw", "Dw'", "Fw", "Bw'"] }
};

const OPPOSITE_FACES: Record<FaceName3x3, FaceName3x3> = {
  U: 'D', D: 'U',
  F: 'B', B: 'F',
  R: 'L', L: 'R',
};

const ADJACENT_FACES: Record<FaceName3x3, FaceName3x3[]> = {
  U: ['F', 'R', 'B', 'L'],
  D: ['F', 'R', 'B', 'L'],
  F: ['U', 'D', 'R', 'L'],
  B: ['U', 'D', 'R', 'L'],
  R: ['U', 'D', 'F', 'B'],
  L: ['U', 'D', 'F', 'B'],
};

// Cached lookup of where slots rotate to
const ROT_CACHE: Record<string, { slotU: Record<number, number>; slotF: Record<number, number> }> = {};

function getRotSlots(pairKey: string) {
  if (!ROT_CACHE[pairKey]) {
    const [faceU, faceF] = pairKey.split('_') as [FaceName3x3, FaceName3x3];
    const rotObj = ROT_MAP[pairKey];
    let test = getStandardSolved4x4State();
    for (const f of CUBE4X4_FACES) {
      for (let i = 0; i < 16; i++) test[f][i] = `${f}${i}` as any;
    }
    for (const m of rotObj.rot) test = apply4x4Move(test, m);

    const sU: Record<number, number> = {};
    const sF: Record<number, number> = {};
    for (const i of CENTER_INDICES) {
      sU[i] = CENTER_INDICES.find(idx => test.U[idx] === `${faceU}${i}`)!;
      sF[i] = CENTER_INDICES.find(idx => test.F[idx] === `${faceF}${i}`)!;
    }
    ROT_CACHE[pairKey] = { slotU: sU, slotF: sF };
  }
  return ROT_CACHE[pairKey];
}

for (const k of Object.keys(ROT_MAP)) getRotSlots(k);

/**
 * Stage 1: Solve All 6 Centres (Deterministic Commutator Reduction)
 */
export function solve4x4Centres(
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
      stage: 'Stage 1 of 4: Build the Centres',
    });
  }

  function doMoves(seq: string[]) {
    for (const m of seq) doMove(m);
  }

  function transferAdjacent(faceDst: FaceName3x3, idxDst: number, faceSrc: FaceName3x3, idxSrc: number) {
    const pairKey = `${faceDst}_${faceSrc}`;
    const rotObj = ROT_MAP[pairKey];
    const { slotU, slotF } = getRotSlots(pairKey);

    const uSt = getSetupTo10('U', slotU[idxDst]);
    const fSt = getSetupTo10('F', slotF[idxSrc]);

    const seq = [
      ...rotObj.rot,
      ...uSt.setup,
      ...fSt.setup,
      ...COMM_UF,
      ...fSt.unsetup,
      ...uSt.unsetup,
      ...rotObj.unrot,
    ];
    doMoves(seq);
  }

  function isFaceSolved(f: FaceName3x3): boolean {
    const t = targetColors[f];
    return CENTER_INDICES.every(i => cur[f][i] === t);
  }

  // Multi-pass solver: while any face is unsolved
  let totalPasses = 0;
  while (totalPasses++ < 30) {
    let madeProgress = false;

    for (const f of CUBE4X4_FACES) {
      if (isFaceSolved(f)) continue;
      const targetCol = targetColors[f];

      for (const dstIdx of CENTER_INDICES) {
        if (cur[f][dstIdx] === targetCol) continue;

        // Find a piece with targetCol
        let bestSrc: { face: FaceName3x3; idx: number } | null = null;

        for (const adj of ADJACENT_FACES[f]) {
          if (!isFaceSolved(adj)) {
            for (const sIdx of CENTER_INDICES) {
              if (cur[adj][sIdx] === targetCol) {
                bestSrc = { face: adj, idx: sIdx };
                break;
              }
            }
          }
          if (bestSrc) break;
        }

        if (!bestSrc) {
          for (const adj of ADJACENT_FACES[f]) {
            for (const sIdx of CENTER_INDICES) {
              if (cur[adj][sIdx] === targetCol) {
                bestSrc = { face: adj, idx: sIdx };
                break;
              }
            }
            if (bestSrc) break;
          }
        }

        if (bestSrc) {
          transferAdjacent(f, dstIdx, bestSrc.face, bestSrc.idx);
          madeProgress = true;
          break;
        } else {
          // On opposite face
          const opp = OPPOSITE_FACES[f];
          const oppIdx = CENTER_INDICES.find(i => cur[opp][i] === targetCol);
          if (oppIdx !== undefined) {
            const bridge = ADJACENT_FACES[f].find(af => !isFaceSolved(af)) || ADJACENT_FACES[f][0];
            const bridgeIdx = CENTER_INDICES.find(i => cur[bridge][i] !== targetColors[bridge]) ?? 10;
            transferAdjacent(bridge, bridgeIdx, opp, oppIdx);
            transferAdjacent(f, dstIdx, bridge, bridgeIdx);
            madeProgress = true;
            break;
          }
        }
      }
    }

    if (CUBE4X4_FACES.every(isFaceSolved)) break;
    if (!madeProgress) break;
  }

  return { moves, state: cur };
}

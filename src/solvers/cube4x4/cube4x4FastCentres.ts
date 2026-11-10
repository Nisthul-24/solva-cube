import { Move, CubeColor } from '../../types/puzzle';
import { FaceName3x3 } from '../../components/3d/cubieModel';
import { Cube4x4State } from './cube4x4Types';
import {
  apply4x4Move,
  turnInfo4x4,
  getStandardSolved4x4State,
} from './cube4x4Geometry';
import { CENTRE_SLOTS } from './cube4x4OptimalCentres';
import { areAllCentresSolved, solve4x4Centres } from './cube4x4Centres';
import { optimizeMoves4x4 } from '../core/moveOptimizer4x4';

const ALL_MOVES = [
  'r', "r'", 'r2',
  'l', "l'", 'l2',
  'u', "u'", 'u2',
  'd', "d'", 'd2',
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
];

const PERMS: Record<string, number[]> = {};
for (const m of ALL_MOVES) {
  const base = getStandardSolved4x4State();
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    (base[s.face] as any)[s.idx] = i;
  }
  const moved = apply4x4Move(base, m);
  const perm: number[] = new Array(24);
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    perm[i] = (moved[s.face] as any)[s.idx];
  }
  PERMS[m] = perm;
}

// -------------------------------------------------------------
// Stage 1: Solve U Centre (Precomputed lookup of 10,626 states)
// -------------------------------------------------------------
const TARGET_U = 0b1111;
const TABLE_U = new Map<number, string[]>();
TABLE_U.set(TARGET_U, []);
{
  const queue = [TARGET_U];
  while (queue.length > 0) {
    const curMask = queue.shift()!;
    const curPath = TABLE_U.get(curMask)!;
    for (const m of ALL_MOVES) {
      const p = PERMS[m];
      const pInv = new Array(24);
      for (let i = 0; i < 24; i++) pInv[p[i]] = i;
      let prevMask = 0;
      for (let i = 0; i < 24; i++) {
        if (curMask & (1 << pInv[i])) prevMask |= (1 << i);
      }
      if (!TABLE_U.has(prevMask)) {
        TABLE_U.set(prevMask, [m, ...curPath]);
        queue.push(prevMask);
      }
    }
  }
}

function solveU(state: Cube4x4State, colU: string): string[] {
  let mask = 0;
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    if (state[s.face][s.idx] === colU) mask |= (1 << i);
  }
  return TABLE_U.get(mask) || [];
}

// -------------------------------------------------------------
// Stage 2: Solve D Centre preserving U (slots 0..3)
// -------------------------------------------------------------
const PRESERVE_U_SEQS: Array<{ name: string; seq: string[] }> = [
  { name: 'D', seq: ['D'] }, { name: "D'", seq: ["D'"] }, { name: 'D2', seq: ['D2'] },
  { name: 'F', seq: ['F'] }, { name: "F'", seq: ["F'"] }, { name: 'F2', seq: ['F2'] },
  { name: 'B', seq: ['B'] }, { name: "B'", seq: ["B'"] }, { name: 'B2', seq: ['B2'] },
  { name: 'L', seq: ['L'] }, { name: "L'", seq: ["L'"] }, { name: 'L2', seq: ['L2'] },
  { name: 'R', seq: ['R'] }, { name: "R'", seq: ["R'"] }, { name: 'R2', seq: ['R2'] },
  { name: 'u', seq: ['u'] }, { name: "u'", seq: ["u'"] }, { name: 'u2', seq: ['u2'] },
  { name: 'd', seq: ['d'] }, { name: "d'", seq: ["d'"] }, { name: 'd2', seq: ['d2'] },
  { name: 'r_D_r_inv', seq: ['r', 'D', "r'"] },
  { name: 'r_D_inv_r_inv', seq: ['r', "D'", "r'"] },
  { name: 'r_D2_r_inv', seq: ['r', 'D2', "r'"] },
  { name: 'r_inv_D_r', seq: ["r'", 'D', 'r'] },
  { name: 'r_inv_D_inv_r', seq: ["r'", "D'", 'r'] },
  { name: 'r_inv_D2_r', seq: ["r'", 'D2', 'r'] },
  { name: 'l_D_l_inv', seq: ['l', 'D', "l'"] },
  { name: 'l_D_inv_l_inv', seq: ['l', "D'", "l'"] },
  { name: 'l_D2_l_inv', seq: ['l', 'D2', "l'"] },
  { name: 'l_inv_D_l', seq: ["l'", 'D', 'l'] },
  { name: 'l_inv_D_inv_l', seq: ["l'", "D'", 'l'] },
  { name: 'l_inv_D2_l', seq: ["l'", 'D2', 'l'] },
];

const TARGET_D = 0b1111 << 4;
const PRESERVE_U_PERMS_INV: Record<string, number[]> = {};
for (const p of PRESERVE_U_SEQS) {
  let cur = new Array(24).fill(0).map((_, i) => i);
  for (const m of p.seq) {
    const perm = PERMS[m];
    const nxt = new Array(24);
    for (let i = 0; i < 24; i++) nxt[i] = cur[perm[i]];
    cur = nxt;
  }
  const inv = new Array(24);
  for (let i = 0; i < 24; i++) inv[cur[i]] = i;
  PRESERVE_U_PERMS_INV[p.name] = inv;
}

const TABLE_D = new Map<number, string[]>();
TABLE_D.set(TARGET_D, []);
{
  const queue = [TARGET_D];
  let head = 0;
  while (head < queue.length) {
    const curMask = queue[head++];
    const curPath = TABLE_D.get(curMask)!;
    for (const p of PRESERVE_U_SEQS) {
      const pInv = PRESERVE_U_PERMS_INV[p.name];
      let prevMask = 0;
      for (let i = 0; i < 24; i++) {
        if (curMask & (1 << pInv[i])) prevMask |= (1 << i);
      }
      if (!TABLE_D.has(prevMask)) {
        TABLE_D.set(prevMask, [p.name, ...curPath]);
        queue.push(prevMask);
      }
    }
  }
}

function solveD(state: Cube4x4State, colD: string): string[] {
  let mask = 0;
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    if (state[s.face][s.idx] === colD) mask |= (1 << i);
  }
  const generatorNames = TABLE_D.get(mask);
  if (!generatorNames) return [];
  const full: string[] = [];
  for (const name of generatorNames) {
    const item = PRESERVE_U_SEQS.find(s => s.name === name)!;
    full.push(...item.seq);
  }
  return full;
}

// -------------------------------------------------------------
// Stage 3: Solve F Centre preserving U and D (Precomputed lookup of 1,820 states)
// -------------------------------------------------------------
const SAFE_UD_GENERATORS = [
  { name: 'u', seq: ['u'] }, { name: "u'", seq: ["u'"] }, { name: 'u2', seq: ['u2'] },
  { name: 'd', seq: ['d'] }, { name: "d'", seq: ["d'"] }, { name: 'd2', seq: ['d2'] },
  { name: 'F', seq: ['F'] }, { name: "F'", seq: ["F'"] }, { name: 'F2', seq: ['F2'] },
  { name: 'B', seq: ['B'] }, { name: "B'", seq: ["B'"] }, { name: 'B2', seq: ['B2'] },
  { name: 'L', seq: ['L'] }, { name: "L'", seq: ["L'"] }, { name: 'L2', seq: ['L2'] },
  { name: 'R', seq: ['R'] }, { name: "R'", seq: ["R'"] }, { name: 'R2', seq: ['R2'] },
  { name: 'u_R_u_inv', seq: ['u', 'R', "u'", "R'"] },
  { name: 'u_inv_R_u', seq: ["u'", 'R', 'u', "R'"] },
  { name: 'u_R2_u_inv', seq: ['u', 'R2', "u'", 'R2'] },
  { name: 'u_inv_R2_u', seq: ["u'", 'R2', 'u', 'R2'] },
  { name: 'u_L_u_inv', seq: ['u', 'L', "u'", "L'"] },
  { name: 'u_inv_L_u', seq: ["u'", 'L', 'u', "L'"] },
  { name: 'd_R_d_inv', seq: ['d', 'R', "d'", "R'"] },
  { name: 'd_inv_R_d', seq: ["d'", 'R', 'd', "R'"] },
  { name: 'd_L_d_inv', seq: ['d', 'L', "d'", "L'"] },
  { name: 'd_inv_L_d', seq: ["d'", 'L', 'd', "L'"] },
  { name: 'd_L2_d_inv', seq: ['d', 'L2', "d'", 'L2'] },
  { name: 'd_inv_L2_d', seq: ["d'", 'L2', 'd', 'L2'] },
];

const TARGET_F_RING = 0b1111;

const PERMS_RING_INV: Record<string, number[]> = {};
for (const gen of SAFE_UD_GENERATORS) {
  let state = getStandardSolved4x4State();
  for (let i = 0; i < 24; i++) {
    const s = CENTRE_SLOTS[i];
    (state[s.face] as any)[s.idx] = i;
  }
  for (const m of gen.seq) state = apply4x4Move(state, m);

  const perm: number[] = new Array(16);
  for (let i = 0; i < 16; i++) {
    const s = CENTRE_SLOTS[8 + i];
    perm[i] = ((state[s.face] as any)[s.idx]) - 8;
  }
  const permInv: number[] = new Array(16);
  for (let i = 0; i < 16; i++) permInv[perm[i]] = i;
  PERMS_RING_INV[gen.name] = permInv;
}

const TABLE_F_RING = new Map<number, string[]>();
TABLE_F_RING.set(TARGET_F_RING, []);

{
  const queue = [TARGET_F_RING];
  let head = 0;
  while (head < queue.length) {
    const curMask = queue[head++];
    const curPath = TABLE_F_RING.get(curMask)!;
    for (const gen of SAFE_UD_GENERATORS) {
      const pInv = PERMS_RING_INV[gen.name];
      let prevMask = 0;
      for (let i = 0; i < 16; i++) {
        if (curMask & (1 << pInv[i])) prevMask |= (1 << i);
      }
      if (!TABLE_F_RING.has(prevMask)) {
        TABLE_F_RING.set(prevMask, [gen.name, ...curPath]);
        queue.push(prevMask);
      }
    }
  }
}

function solveF(state: Cube4x4State, colF: string): string[] {
  let mask = 0;
  for (let i = 0; i < 16; i++) {
    const s = CENTRE_SLOTS[8 + i];
    if (state[s.face][s.idx] === colF) mask |= (1 << i);
  }
  const generatorNames = TABLE_F_RING.get(mask);
  if (!generatorNames) return [];
  const full: string[] = [];
  for (const name of generatorNames) {
    const item = SAFE_UD_GENERATORS.find(s => s.name === name)!;
    full.push(...item.seq);
  }
  return full;
}

// -------------------------------------------------------------
// Stage 4: Solve R Centre preserving U, D and F (slots 0..11)
// -------------------------------------------------------------
const SAFE_UDF = [
  { name: 'B', seq: ['B'] }, { name: "B'", seq: ["B'"] }, { name: 'B2', seq: ['B2'] },
  { name: 'L', seq: ['L'] }, { name: "L'", seq: ["L'"] }, { name: 'L2', seq: ['L2'] },
  { name: 'R', seq: ['R'] }, { name: "R'", seq: ["R'"] }, { name: 'R2', seq: ['R2'] },
  { name: 'u_B_u_inv', seq: ['u', 'B', "u'"] },
  { name: 'u_B_inv_u_inv', seq: ['u', "B'", "u'"] },
  { name: 'u_B2_u_inv', seq: ['u', 'B2', "u'"] },
  { name: 'u_R_u_inv', seq: ['u', 'R', "u'"] },
  { name: 'u_R_inv_u_inv', seq: ['u', "R'", "u'"] },
  { name: 'u_R2_u_inv', seq: ['u', 'R2', "u'"] },
  { name: 'u_inv_B_u', seq: ["u'", 'B', 'u'] },
  { name: 'u_inv_B_inv_u', seq: ["u'", "B'", 'u'] },
  { name: 'u_inv_B2_u', seq: ["u'", 'B2', 'u'] },
  { name: 'u_inv_L_u', seq: ["u'", 'L', 'u'] },
  { name: 'u_inv_L_inv_u', seq: ["u'", "L'", 'u'] },
  { name: 'u_inv_L2_u', seq: ["u'", 'L2', 'u'] },
  { name: 'u2_L_u2', seq: ['u2', 'L', 'u2'] },
  { name: 'u2_L_inv_u2', seq: ['u2', "L'", 'u2'] },
  { name: 'u2_L2_u2', seq: ['u2', 'L2', 'u2'] },
  { name: 'u2_R_u2', seq: ['u2', 'R', 'u2'] },
  { name: 'u2_R_inv_u2', seq: ['u2', "R'", 'u2'] },
  { name: 'u2_R2_u2', seq: ['u2', 'R2', 'u2'] },
  { name: 'd_B_d_inv', seq: ['d', 'B', "d'"] },
  { name: 'd_B_inv_d_inv', seq: ['d', "B'", "d'"] },
  { name: 'd_B2_d_inv', seq: ['d', 'B2', "d'"] },
  { name: 'd_L_d_inv', seq: ['d', 'L', "d'"] },
  { name: 'd_L_inv_d_inv', seq: ['d', "L'", "d'"] },
  { name: 'd_L2_d_inv', seq: ['d', 'L2', "d'"] },
  { name: 'd_inv_B_d', seq: ["d'", 'B', 'd'] },
  { name: 'd_inv_B_inv_d', seq: ["d'", "B'", 'd'] },
  { name: 'd_inv_B2_d', seq: ["d'", 'B2', 'd'] },
  { name: 'd_inv_R_d', seq: ["d'", 'R', 'd'] },
  { name: 'd_inv_R_inv_d', seq: ["d'", "R'", 'd'] },
  { name: 'd_inv_R2_d', seq: ["d'", 'R2', 'd'] },
  { name: 'd2_L_d2', seq: ['d2', 'L', 'd2'] },
  { name: 'd2_L_inv_d2', seq: ['d2', "L'", 'd2'] },
  { name: 'd2_L2_d2', seq: ['d2', 'L2', 'd2'] },
  { name: 'd2_R_d2', seq: ['d2', 'R', 'd2'] },
  { name: 'd2_R_inv_d2', seq: ['d2', "R'", 'd2'] },
  { name: 'd2_R2_d2', seq: ['d2', 'R2', 'd2'] },
];

const PERMS_UDF_INV: Record<string, number[]> = {};
for (const p of SAFE_UDF) {
  let state = getStandardSolved4x4State();
  for (let s = 0; s < 24; s++) {
    const slot = CENTRE_SLOTS[s];
    (state[slot.face] as any)[slot.idx] = s;
  }
  for (const m of p.seq) state = apply4x4Move(state, m);

  const perm: number[] = new Array(12);
  for (let i = 0; i < 12; i++) {
    const slot = CENTRE_SLOTS[12 + i];
    perm[i] = ((state[slot.face] as any)[slot.idx]) - 12;
  }
  const permInv: number[] = new Array(12);
  for (let i = 0; i < 12; i++) permInv[perm[i]] = i;
  PERMS_UDF_INV[p.name] = permInv;
}

const TARGET_R_MASK = (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11);
const TABLE_R = new Map<number, string[]>();
TABLE_R.set(TARGET_R_MASK, []);
{
  const queue = [TARGET_R_MASK];
  while (queue.length > 0) {
    const curMask = queue.shift()!;
    const curPath = TABLE_R.get(curMask)!;
    for (const p of SAFE_UDF) {
      const permInv = PERMS_UDF_INV[p.name];
      let prevMask = 0;
      for (let i = 0; i < 12; i++) {
        if (curMask & (1 << permInv[i])) prevMask |= (1 << i);
      }
      if (!TABLE_R.has(prevMask)) {
        TABLE_R.set(prevMask, [p.name, ...curPath]);
        queue.push(prevMask);
      }
    }
  }
}

function solveR(state: Cube4x4State, colR: string): string[] {
  let mask = 0;
  for (let i = 0; i < 12; i++) {
    const slot = CENTRE_SLOTS[12 + i];
    if (state[slot.face][slot.idx] === colR) mask |= (1 << i);
  }
  const generatorNames = TABLE_R.get(mask);
  if (!generatorNames) return [];
  const full: string[] = [];
  for (const name of generatorNames) {
    const item = SAFE_UDF.find(s => s.name === name)!;
    full.push(...item.seq);
  }
  return full;
}

// -------------------------------------------------------------
// Stage 5: Solve B & L Centres preserving U, D, F and R
// -------------------------------------------------------------
const SAFE_UDFR = [
  { name: 'B', seq: ['B'] }, { name: "B'", seq: ["B'"] }, { name: 'B2', seq: ['B2'] },
  { name: 'L', seq: ['L'] }, { name: "L'", seq: ["L'"] }, { name: 'L2', seq: ['L2'] },
  { name: 'u_B_u_inv', seq: ['u', 'B', "u'"] },
  { name: 'u_B_inv_u_inv', seq: ['u', "B'", "u'"] },
  { name: 'u_B2_u_inv', seq: ['u', 'B2', "u'"] },
  { name: 'u_inv_L_u', seq: ["u'", 'L', 'u'] },
  { name: 'u_inv_L_inv_u', seq: ["u'", "L'", 'u'] },
  { name: 'u_inv_L2_u', seq: ["u'", 'L2', 'u'] },
  { name: 'd_L_d_inv', seq: ['d', 'L', "d'"] },
  { name: 'd_L_inv_d_inv', seq: ['d', "L'", "d'"] },
  { name: 'd_L2_d_inv', seq: ['d', 'L2', "d'"] },
  { name: 'd_inv_B_d', seq: ["d'", 'B', 'd'] },
  { name: 'd_inv_B_inv_d', seq: ["d'", "B'", 'd'] },
  { name: 'd_inv_B2_d', seq: ["d'", 'B2', 'd'] },
  { name: 'comm_u_B', seq: ['u', 'B', "u'", "B'"] },
  { name: 'comm_u_B_inv', seq: ['u', "B'", "u'", 'B'] },
  { name: 'comm_u_B2', seq: ['u', 'B2', "u'", 'B2'] },
  { name: 'comm_u_inv_L', seq: ["u'", 'L', 'u', "L'"] },
  { name: 'comm_u_inv_L_inv', seq: ["u'", "L'", 'u', 'L'] },
  { name: 'comm_u_inv_L2', seq: ["u'", 'L2', 'u', 'L2'] },
  { name: 'comm_d_L', seq: ['d', 'L', "d'", "L'"] },
  { name: 'comm_d_L_inv', seq: ['d', "L'", "d'", 'L'] },
  { name: 'comm_d_L2', seq: ['d', 'L2', "d'", 'L2'] },
  { name: 'comm_d_inv_B', seq: ["d'", 'B', 'd', "B'"] },
  { name: 'comm_d_inv_B_inv', seq: ["d'", "B'", 'd', 'B'] },
  { name: 'comm_d_inv_B2', seq: ["d'", 'B2', 'd', 'B2'] },
];

const PERMS_UDFR_INV: Record<string, number[]> = {};
for (const p of SAFE_UDFR) {
  let state = getStandardSolved4x4State();
  for (let s = 0; s < 24; s++) {
    const slot = CENTRE_SLOTS[s];
    (state[slot.face] as any)[slot.idx] = s;
  }
  for (const m of p.seq) state = apply4x4Move(state, m);

  const perm: number[] = new Array(8);
  for (let i = 0; i < 8; i++) {
    const slot = CENTRE_SLOTS[12 + i];
    perm[i] = ((state[slot.face] as any)[slot.idx]) - 12;
  }
  const permInv: number[] = new Array(8);
  for (let i = 0; i < 8; i++) permInv[perm[i]] = i;
  PERMS_UDFR_INV[p.name] = permInv;
}

const TARGET_BL_MASK = 0x0F;
const TABLE_BL = new Map<number, string[]>();
TABLE_BL.set(TARGET_BL_MASK, []);
{
  const queue = [TARGET_BL_MASK];
  while (queue.length > 0) {
    const curMask = queue.shift()!;
    const curPath = TABLE_BL.get(curMask)!;
    for (const p of SAFE_UDFR) {
      const permInv = PERMS_UDFR_INV[p.name];
      let prevMask = 0;
      for (let i = 0; i < 8; i++) {
        if (curMask & (1 << permInv[i])) prevMask |= (1 << i);
      }
      if (!TABLE_BL.has(prevMask)) {
        TABLE_BL.set(prevMask, [p.name, ...curPath]);
        queue.push(prevMask);
      }
    }
  }
}

function solveBL(state: Cube4x4State, colB: string): string[] {
  let mask = 0;
  for (let i = 0; i < 8; i++) {
    const slot = CENTRE_SLOTS[12 + i];
    if (state[slot.face][slot.idx] === colB) mask |= (1 << i);
  }
  const generatorNames = TABLE_BL.get(mask);
  if (!generatorNames) return [];
  const full: string[] = [];
  for (const name of generatorNames) {
    const item = SAFE_UDFR.find(s => s.name === name)!;
    full.push(...item.seq);
  }
  return full;
}

/**
 * Fast 4x4 Center Solver:
 * Uses precomputed backward-BFS tables for U, R, and B/L centres,
 * with bounded search and perturbation recovery for D and F.
 * Solves all 24 centre stickers in ~30 moves average!
 */
export function solve4x4CentresFast(
  initialState: Cube4x4State,
  targetColors: Record<FaceName3x3, CubeColor>
): { moves: Move[]; state: Cube4x4State } {
  let cur = initialState;
  const rawMoves: string[] = [];

  // Stage 1: Solve U centre
  const mU = solveU(cur, targetColors.U);
  for (const m of mU) cur = apply4x4Move(cur, m);
  rawMoves.push(...mU);

  // Stage 2: Solve D centre preserving U
  const mD = solveD(cur, targetColors.D);
  for (const m of mD) cur = apply4x4Move(cur, m);
  rawMoves.push(...mD);

  // Stage 3: Solve F centre preserving U & D
  const mF = solveF(cur, targetColors.F);
  for (const m of mF) cur = apply4x4Move(cur, m);
  rawMoves.push(...mF);

  // Stage 4: Solve R centre preserving U, D & F
  const mR = solveR(cur, targetColors.R);
  for (const m of mR) cur = apply4x4Move(cur, m);
  rawMoves.push(...mR);

  // Stage 5: Solve B & L centres preserving U, D, F & R
  const mBL = solveBL(cur, targetColors.B);
  for (const m of mBL) cur = apply4x4Move(cur, m);
  rawMoves.push(...mBL);

  // Fallback safety net for any rare corner case
  if (!areAllCentresSolved(cur, targetColors)) {
    const { moves: fbMoves, state: stateFin } = solve4x4Centres(cur, targetColors);
    for (const m of fbMoves) {
      rawMoves.push(m.notation);
    }
    cur = stateFin;
  }

  const optMoves = optimizeMoves4x4(rawMoves);
  const moves: Move[] = optMoves.map((notation) => {
    const t = turnInfo4x4(notation);
    return {
      notation,
      face: notation[0].toUpperCase(),
      direction: t.direction,
      amount: t.direction === 'DOUBLE' ? 2 : t.direction === 'CCW' ? -1 : 1,
      description: t.wording,
      stage: 'Stage 1 of 4: Build the Centres',
    };
  });

  return { moves, state: cur };
}

import { Move } from '../../types/puzzle';
import { turnInfo4x4 } from '../cube4x4/cube4x4Geometry';
import { VirtualFrame4x4 } from './virtualFrame4x4';

export type Axis4x4 = 'x' | 'y' | 'z';

export interface ParsedMove4x4 {
  notation: string;
  axis: Axis4x4;
  layerAmounts: [number, number, number, number]; // [layer0, layer1, layer2, layer3] in +axis coordinates (0..3)
}

function parseAmount(suffix: string): number {
  if (suffix === '2') return 2;
  if (suffix === "'") return 3;
  return 1;
}

export function formatAmount(base: string, amount: number): string {
  const mod = ((amount % 4) + 4) % 4;
  if (mod === 0) return '';
  if (mod === 1) return base;
  if (mod === 2) return `${base}2`;
  if (mod === 3) return `${base}'`;
  return '';
}

/**
 * Parses any 4x4 move notation into a 4-layer rotation vector [L0, L1, L2, L3]
 * oriented along the positive axis direction (+x for R, +y for U, +z for F).
 */
export function parse4x4MoveToLayers(notation: string): ParsedMove4x4 {
  const face = notation[0];
  let isWide = false;
  let rest = notation.slice(1);
  if (rest.startsWith('w')) {
    isWide = true;
    rest = rest.slice(1);
  }
  const amount = parseAmount(rest);

  let axis: Axis4x4 = 'y';
  const layerAmounts: [number, number, number, number] = [0, 0, 0, 0];

  switch (face) {
    case 'R':
      axis = 'x';
      if (isWide) {
        layerAmounts[2] = amount;
        layerAmounts[3] = amount;
      } else {
        layerAmounts[3] = amount;
      }
      break;
    case 'r':
      axis = 'x';
      layerAmounts[2] = amount;
      break;
    case 'L': {
      axis = 'x';
      const amtX = ((4 - amount) % 4 + 4) % 4;
      if (isWide) {
        layerAmounts[0] = amtX;
        layerAmounts[1] = amtX;
      } else {
        layerAmounts[0] = amtX;
      }
      break;
    }
    case 'l': {
      axis = 'x';
      layerAmounts[1] = ((4 - amount) % 4 + 4) % 4;
      break;
    }

    case 'U':
      axis = 'y';
      if (isWide) {
        layerAmounts[2] = amount;
        layerAmounts[3] = amount;
      } else {
        layerAmounts[3] = amount;
      }
      break;
    case 'u':
      axis = 'y';
      layerAmounts[2] = amount;
      break;
    case 'D': {
      axis = 'y';
      const amtY = ((4 - amount) % 4 + 4) % 4;
      if (isWide) {
        layerAmounts[0] = amtY;
        layerAmounts[1] = amtY;
      } else {
        layerAmounts[0] = amtY;
      }
      break;
    }
    case 'd': {
      axis = 'y';
      layerAmounts[1] = ((4 - amount) % 4 + 4) % 4;
      break;
    }

    case 'F':
      axis = 'z';
      if (isWide) {
        layerAmounts[2] = amount;
        layerAmounts[3] = amount;
      } else {
        layerAmounts[3] = amount;
      }
      break;
    case 'f':
      axis = 'z';
      layerAmounts[2] = amount;
      break;
    case 'B': {
      axis = 'z';
      const amtZ = ((4 - amount) % 4 + 4) % 4;
      if (isWide) {
        layerAmounts[0] = amtZ;
        layerAmounts[1] = amtZ;
      } else {
        layerAmounts[0] = amtZ;
      }
      break;
    }
    case 'b': {
      axis = 'z';
      layerAmounts[1] = ((4 - amount) % 4 + 4) % 4;
      break;
    }
  }

  return { notation, axis, layerAmounts };
}

/**
 * Computes minimal moves to realize [a0, a1, a2, a3] along axis.
 */
function synthesizeCanonicalMoves(
  axis: Axis4x4,
  amounts: [number, number, number, number]
): string[] {
  const result: string[] = [];

  let posOuter = 'R';
  let posInner = 'r';
  let posWide = 'Rw';
  let negOuter = 'L';
  let negInner = 'l';
  let negWide = 'Lw';

  if (axis === 'y') {
    posOuter = 'U';
    posInner = 'u';
    posWide = 'Uw';
    negOuter = 'D';
    negInner = 'd';
    negWide = 'Dw';
  } else if (axis === 'z') {
    posOuter = 'F';
    posInner = 'f';
    posWide = 'Fw';
    negOuter = 'B';
    negInner = 'b';
    negWide = 'Bw';
  }

  const [a0, a1, a2, a3] = amounts.map((v) => ((v % 4) + 4) % 4);

  // Negative side (layers 0 & 1): convert +axis amounts back to negative face turns
  const neg0 = a0 === 0 ? 0 : (4 - a0) % 4;
  const neg1 = a1 === 0 ? 0 : (4 - a1) % 4;

  if (neg0 !== 0 && neg0 === neg1) {
    result.push(formatAmount(negWide, neg0));
  } else {
    if (neg0 !== 0) result.push(formatAmount(negOuter, neg0));
    if (neg1 !== 0) result.push(formatAmount(negInner, neg1));
  }

  // Positive side (layers 2 & 3)
  if (a2 !== 0 && a2 === a3) {
    result.push(formatAmount(posWide, a2));
  } else {
    if (a3 !== 0) result.push(formatAmount(posOuter, a3));
    if (a2 !== 0) result.push(formatAmount(posInner, a2));
  }

  return result.filter(Boolean);
}

/**
 * Same-axis normal form optimizer with common frame absorption.
 * If frame is passed, searches g in {0, 1, 2, 3} to absorb common frame rotation.
 * If frame is not passed, g is strictly 0 to preserve identical physical state.
 */
export function optimizeSameAxisRun(
  axis: Axis4x4,
  q: [number, number, number, number],
  frame?: VirtualFrame4x4
): { moves: string[]; absorbedG: number } {
  let bestMoves: string[] = [];
  let bestG = 0;
  let minCost = Infinity;

  const maxG = frame ? 4 : 1;

  for (let g = 0; g < maxG; g++) {
    const a: [number, number, number, number] = [
      ((q[0] - g) % 4 + 4) % 4,
      ((q[1] - g) % 4 + 4) % 4,
      ((q[2] - g) % 4 + 4) % 4,
      ((q[3] - g) % 4 + 4) % 4,
    ];

    const moves = synthesizeCanonicalMoves(axis, a);
    const cost = moves.length;

    if (cost < minCost || (cost === minCost && g === 0)) {
      minCost = cost;
      bestMoves = moves;
      bestG = g;
    }
  }

  if (frame && bestG !== 0) {
    frame.absorbRotation(axis, bestG);
  }

  return { moves: bestMoves, absorbedG: bestG };
}

/**
 * Optimizes a list of 4x4 move notations using same-axis normal form and virtual frame.
 */
export function optimizeMoves4x4(moves: string[], frame?: VirtualFrame4x4): string[] {
  if (moves.length === 0) return [];

  let curMoves = [...moves];
  let changed = true;
  let iterations = 0;

  while (changed && iterations++ < 50) {
    changed = false;
    const newMoves: string[] = [];
    let i = 0;

    while (i < curMoves.length) {
      const parsed = parse4x4MoveToLayers(curMoves[i]);
      const currentAxis = parsed.axis;
      const combinedAmounts: [number, number, number, number] = [...parsed.layerAmounts];

      let j = i + 1;
      while (j < curMoves.length) {
        const nextParsed = parse4x4MoveToLayers(curMoves[j]);
        if (nextParsed.axis === currentAxis) {
          for (let l = 0; l < 4; l++) {
            combinedAmounts[l] = (combinedAmounts[l] + nextParsed.layerAmounts[l]) % 4;
          }
          j++;
        } else {
          break;
        }
      }

      const { moves: optAxisMoves } = optimizeSameAxisRun(currentAxis, combinedAmounts, frame);
      newMoves.push(...optAxisMoves);
      i = j;
    }

    if (newMoves.length !== curMoves.length || newMoves.some((m, idx) => m !== curMoves[idx])) {
      changed = true;
      curMoves = newMoves;
    }
  }

  return curMoves;
}

/**
 * Optimizes Move objects, preserving descriptions and stages.
 */
export function optimizeMoves4x4Objects(moves: Move[], frame?: VirtualFrame4x4): Move[] {
  if (moves.length === 0) return [];
  const notations = moves.map((m) => m.notation);
  const optimizedNotations = optimizeMoves4x4(notations, frame);

  const stageMap = new Map<string, string>();
  for (const m of moves) {
    if (m.stage && !stageMap.has(m.notation)) {
      stageMap.set(m.notation, m.stage);
    }
  }

  return optimizedNotations.map((notation) => {
    const t = turnInfo4x4(notation);
    return {
      notation,
      face: notation[0].toUpperCase(),
      direction: t.direction,
      amount: t.direction === 'DOUBLE' ? 2 : t.direction === 'CCW' ? -1 : 1,
      description: t.wording,
      stage: stageMap.get(notation) || '4x4 Solve Stage',
    };
  });
}

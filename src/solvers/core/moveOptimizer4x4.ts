import { Move } from '../../types/puzzle';
import { turnInfo4x4 } from '../cube4x4/cube4x4Geometry';

export type Axis4x4 = 'x' | 'y' | 'z';

interface ParsedMove4x4 {
  notation: string;
  axis: Axis4x4;
  layerAmounts: [number, number, number, number]; // [layer0, layer1, layer2, layer3] amounts in 0..3
}

// Amount parser: '' -> 1, '2' -> 2, "'" -> 3
function parseAmount(suffix: string): number {
  if (suffix === '2') return 2;
  if (suffix === "'") return 3;
  return 1;
}

function formatAmount(base: string, amount: number): string {
  const mod = ((amount % 4) + 4) % 4;
  if (mod === 0) return '';
  if (mod === 1) return base;
  if (mod === 2) return `${base}2`;
  if (mod === 3) return `${base}'`;
  return '';
}

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
    case 'L':
      axis = 'x';
      if (isWide) {
        layerAmounts[0] = amount;
        layerAmounts[1] = amount;
      } else {
        layerAmounts[0] = amount;
      }
      break;
    case 'l':
      axis = 'x';
      layerAmounts[1] = amount;
      break;

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
    case 'D':
      axis = 'y';
      if (isWide) {
        layerAmounts[0] = amount;
        layerAmounts[1] = amount;
      } else {
        layerAmounts[0] = amount;
      }
      break;
    case 'd':
      axis = 'y';
      layerAmounts[1] = amount;
      break;

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
    case 'B':
      axis = 'z';
      if (isWide) {
        layerAmounts[0] = amount;
        layerAmounts[1] = amount;
      } else {
        layerAmounts[0] = amount;
      }
      break;
    case 'b':
      axis = 'z';
      layerAmounts[1] = amount;
      break;
  }

  return { notation, axis, layerAmounts };
}

function synthesizeAxisMoves(
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

  // Positive side (layers 2 & 3)
  if (a2 !== 0 && a2 === a3) {
    result.push(formatAmount(posWide, a2));
  } else {
    if (a3 !== 0) result.push(formatAmount(posOuter, a3));
    if (a2 !== 0) result.push(formatAmount(posInner, a2));
  }

  // Negative side (layers 0 & 1)
  if (a0 !== 0 && a0 === a1) {
    result.push(formatAmount(negWide, a0));
  } else {
    if (a0 !== 0) result.push(formatAmount(negOuter, a0));
    if (a1 !== 0) result.push(formatAmount(negInner, a1));
  }

  return result.filter(Boolean);
}

/**
 * Optimizes a list of 4x4 move notations:
 * 1. Merges consecutive and commuting same-axis moves.
 * 2. Merges outer + inner into wide moves (e.g. R + r -> Rw).
 * 3. Cancels inverse moves (e.g. U + U' -> null).
 * 4. Iterates to fixed point.
 */
export function optimizeMoves4x4(moves: string[]): string[] {
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

      const synthesized = synthesizeAxisMoves(currentAxis, combinedAmounts);
      newMoves.push(...synthesized);
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
export function optimizeMoves4x4Objects(moves: Move[]): Move[] {
  if (moves.length === 0) return [];
  const notations = moves.map((m) => m.notation);
  const optimizedNotations = optimizeMoves4x4(notations);

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


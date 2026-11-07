import { Move } from '../../types/puzzle';

export const FACE_NAMES: Record<string, string> = {
  U: 'TOP (White)',
  D: 'BOTTOM (Yellow)',
  F: 'FRONT (Green)',
  B: 'BACK (Blue)',
  L: 'LEFT (Orange)',
  R: 'RIGHT (Red)',
  u: 'Top Tip',
  l: 'Left Tip',
  r: 'Right Tip',
  b: 'Back Tip',
};

export const FACE_NAMES_SIMPLE: Record<string, string> = {
  U: 'TOP',
  D: 'BOTTOM',
  F: 'FRONT',
  B: 'BACK',
  L: 'LEFT',
  R: 'RIGHT',
  u: 'Top Tip',
  l: 'Left Tip',
  r: 'Right Tip',
  b: 'Back Tip',
};

/**
 * Parses a standard move notation (e.g., "R", "U'", "F2", "u", "l'")
 * and returns a rich Move object with plain-English instructions.
 */
export function parseMoveNotation(notation: string, stage?: string): Move {
  const trimmed = notation.trim();
  if (!trimmed) {
    throw new Error('Empty move notation');
  }

  const face = trimmed[0];
  const modifier = trimmed.slice(1);

  let direction: 'CW' | 'CCW' | 'DOUBLE' = 'CW';
  let amount: 1 | -1 | 2 = 1;
  let dirWord = 'clockwise 90°';

  if (modifier === "'") {
    direction = 'CCW';
    amount = -1;
    dirWord = 'counter-clockwise 90°';
  } else if (modifier === '2') {
    direction = 'DOUBLE';
    amount = 2;
    dirWord = '180°';
  }

  const faceDesc = FACE_NAMES_SIMPLE[face] || face;
  const isTip = face === 'u' || face === 'l' || face === 'r' || face === 'b';
  const description = isTip
    ? `Turn ${faceDesc} ${dirWord}`
    : `Turn the ${faceDesc} face ${dirWord}`;

  return {
    notation: trimmed,
    face,
    direction,
    amount,
    description,
    stage,
  };
}

export function parseMoveSequence(sequence: string, stage?: string): Move[] {
  const tokens = sequence.trim().split(/\s+/).filter(Boolean);
  return tokens.map((token) => parseMoveNotation(token, stage));
}

/**
 * Normalizes an array of moves (e.g., collapses R R -> R2, R R' -> none, R2 R' -> R)
 */
export function simplifyMoves(moves: Move[]): Move[] {
  if (moves.length <= 1) return moves;

  const result: Move[] = [];
  for (const move of moves) {
    if (result.length === 0) {
      result.push(move);
      continue;
    }

    const prev = result[result.length - 1];
    if (prev.face === move.face) {
      // Calculate net turn mod 4 (in range 0..3)
      const prevQuarter = prev.amount === 2 ? 2 : prev.amount === -1 ? 3 : 1;
      const curQuarter = move.amount === 2 ? 2 : move.amount === -1 ? 3 : 1;
      const combined = (prevQuarter + curQuarter) % 4;

      result.pop();
      if (combined === 1) {
        result.push(parseMoveNotation(`${prev.face}`, prev.stage || move.stage));
      } else if (combined === 2) {
        result.push(parseMoveNotation(`${prev.face}2`, prev.stage || move.stage));
      } else if (combined === 3) {
        result.push(parseMoveNotation(`${prev.face}'`, prev.stage || move.stage));
      }
      // If combined === 0, move is cancelled out!
    } else {
      result.push(move);
    }
  }

  return result;
}


import { CubeColor, PuzzleColor } from '../../types/puzzle';

export type FaceName3x3 = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

/**
 * Requirement 2: Canonical PALETTE defined once and used everywhere:
 * white:  #F5F5F5
 * yellow: #FFD500
 * green:  #009B48
 * blue:   #0051BA
 * red:    #C41E3A
 * orange: #FF5800
 */
export const PALETTE: Record<CubeColor, string> = {
  white: '#F5F5F5',
  yellow: '#FFD500',
  green: '#009B48',
  blue: '#0051BA',
  red: '#C41E3A',
  orange: '#FF5800',
};

/**
 * Requirement 2: Brightness scaling only for dimming.
 * Multiplies RGB by a factor (e.g. 0.8 for non-active layers, 1.0 for active).
 * Preserves exact hue and saturation with zero color tint or lerp.
 */
export function scaleBrightness(hex: string, factor: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;

  const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
  const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
  const nb = Math.min(255, Math.max(0, Math.round(b * factor)));

  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * ============================================================================
 * CANONICAL STICKER LAYOUT & ORIENTATION CONVENTION (Issue 1)
 * ============================================================================
 * Face order: U R F D L B (standard Kociemba / Rubik's order).
 *
 * Orientation convention (standard hold):
 * - U (Up):    White center, points toward +Y (normal [0, 1, 0])
 * - D (Down):  Yellow center, points toward -Y (normal [0, -1, 0])
 * - F (Front): Green center, points toward +Z (normal [0, 0, 1])
 * - B (Back):  Blue center, points toward -Z (normal [0, 0, -1])
 * - R (Right): Red center, points toward +X (normal [1, 0, 0])
 * - L (Left):  Orange center, points toward -X (normal [-1, 0, 0])
 *
 * Each face has 9 stickers arranged row-major (indices 0..8):
 *   0  1  2
 *   3  4  5   (4 is the fixed center sticker)
 *   6  7  8
 *
 * 3D Integer coordinate space: x in {-1, 0, 1}, y in {-1, 0, 1}, z in {-1, 0, 1}
 * Right-handed coordinate system: +X right, +Y up, +Z toward viewer (front).
 * ============================================================================
 */

export const FACE_ORDER: FaceName3x3[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export const FACE_CENTER_COLORS: Record<FaceName3x3, CubeColor> = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

/**
 * Maps 3D coordinate (x, y, z) and outer face to its facelet index 0..8.
 */
export function getFaceletIndex(
  face: FaceName3x3,
  x: number,
  y: number,
  z: number
): number {
  switch (face) {
    case 'U': {
      // Row 0 is Back (z=-1), Row 2 is Front (z=1). Col 0 is Left (x=-1), Col 2 is Right (x=1).
      const r = z + 1;
      const c = x + 1;
      return r * 3 + c;
    }
    case 'R': {
      // Row 0 is Top (y=1), Row 2 is Bottom (y=-1). Col 0 is Front (z=1), Col 2 is Back (z=-1).
      const r = 1 - y;
      const c = 1 - z;
      return r * 3 + c;
    }
    case 'F': {
      // Row 0 is Top (y=1), Row 2 is Bottom (y=-1). Col 0 is Left (x=-1), Col 2 is Right (x=1).
      const r = 1 - y;
      const c = x + 1;
      return r * 3 + c;
    }
    case 'D': {
      // Looking up at Down face: Row 0 is Front (z=1), Row 2 is Back (z=-1). Col 0 is Left (x=-1), Col 2 is Right (x=1).
      const r = 1 - z;
      const c = x + 1;
      return r * 3 + c;
    }
    case 'L': {
      // Row 0 is Top (y=1), Row 2 is Bottom (y=-1). Col 0 is Back (z=-1), Col 2 is Front (z=1).
      const r = 1 - y;
      const c = z + 1;
      return r * 3 + c;
    }
    case 'B': {
      // Looking at Back face from behind: Row 0 is Top (y=1), Row 2 is Bottom (y=-1). Col 0 is Right (+X), Col 2 is Left (-X).
      const r = 1 - y;
      const c = 1 - x;
      return r * 3 + c;
    }
  }
}

/**
 * Given face and index 0..8, returns the 3D integer cubie coordinate [x, y, z].
 */
export function getCubieCoords(
  face: FaceName3x3,
  index: number
): [number, number, number] {
  const r = Math.floor(index / 3);
  const c = index % 3;

  switch (face) {
    case 'U':
      return [c - 1, 1, r - 1];
    case 'R':
      return [1, 1 - r, 1 - c];
    case 'F':
      return [c - 1, 1 - r, 1];
    case 'D':
      return [c - 1, -1, 1 - r];
    case 'L':
      return [-1, 1 - r, c - 1];
    case 'B':
      return [1 - c, 1 - r, -1];
  }
}

/**
 * Normal vector for each face in standard orientation.
 */
export const FACE_NORMALS: Record<FaceName3x3, [number, number, number]> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};


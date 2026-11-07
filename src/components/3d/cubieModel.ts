import { CubeColor } from '../../types/puzzle';
import {
  PALETTE,
  scaleBrightness,
  FaceName3x3,
  getFaceletIndex,
  getCubieCoords,
  FACE_ORDER,
  FACE_NORMALS,
} from './stickerLayout';

export { PALETTE, scaleBrightness, FaceName3x3, getFaceletIndex, getCubieCoords, FACE_ORDER, FACE_NORMALS };

export type Axis = 'x' | 'y' | 'z';

export interface MoveTurnDef {
  axis: Axis;
  layer: 1 | -1;
  baseAngleDeg: number; // in degrees: -90 or +90
}

/**
 * Move definition table matching requirement A.2:
 * Right-handed coordinates: x right, y up, z toward viewer.
 * R: axis x, layer +1, angle -90°
 * L: axis x, layer -1, angle +90°
 * U: axis y, layer +1, angle -90°
 * D: axis y, layer -1, angle +90°
 * F: axis z, layer +1, angle -90°
 * B: axis z, layer -1, angle +90°
 */
export const MOVE_TURN_TABLE: Record<string, MoveTurnDef> = {
  R: { axis: 'x', layer: 1, baseAngleDeg: -90 },
  L: { axis: 'x', layer: -1, baseAngleDeg: 90 },
  U: { axis: 'y', layer: 1, baseAngleDeg: -90 },
  D: { axis: 'y', layer: -1, baseAngleDeg: 90 },
  F: { axis: 'z', layer: 1, baseAngleDeg: -90 },
  B: { axis: 'z', layer: -1, baseAngleDeg: 90 },
};

export interface TurnInfo {
  axis: Axis;
  layer: 1 | -1;
  angle: number; // in radians
}

/**
 * Single source of truth for move turn info (Issue 1)
 */
export function turnInfo(move: string): TurnInfo {
  const clean = move.trim();
  const face = clean[0]?.toUpperCase() || 'U';
  const isPrime = clean.includes("'");
  const isDouble = clean.includes('2');

  const base = MOVE_TURN_TABLE[face] || MOVE_TURN_TABLE.U;
  let angleDeg = base.baseAngleDeg;
  if (isPrime) angleDeg = -angleDeg;
  if (isDouble) angleDeg = angleDeg * 2;
  const angle = (angleDeg * Math.PI) / 180;

  return {
    axis: base.axis,
    layer: base.layer,
    angle,
  };
}

export interface ArrowBasis {
  A: [number, number, number];
  U: [number, number, number];
  V: [number, number, number];
}

/**
 * Orthonormal basis (A, U, V) with V = A × U where:
 * U is y for x, z for y, and x for z.
 * A positive angle moves a point from U toward V.
 */
export function getArrowBasis(axis: Axis): ArrowBasis {
  switch (axis) {
    case 'x':
      return {
        A: [1, 0, 0],
        U: [0, 1, 0],
        V: [0, 0, 1], // [1,0,0] × [0,1,0] = [0,0,1]
      };
    case 'y':
      return {
        A: [0, 1, 0],
        U: [0, 0, 1],
        V: [1, 0, 0], // [0,1,0] × [0,0,1] = [1,0,0]
      };
    case 'z':
      return {
        A: [0, 0, 1],
        U: [1, 0, 0],
        V: [0, 1, 0], // [0,0,1] × [1,0,0] = [0,1,0]
      };
  }
}

/**
 * Computes parametric arc points and tangent for an arrow (Issue 1).
 * p(t) = A*d + r*(U cos t + V sin t)
 * where t increases for positive angle and decreases for negative angle.
 */
export function computeArrowArc(
  move: string,
  radius = 1.15,
  dOverride?: number
): {
  points: [number, number, number][];
  endPos: [number, number, number];
  endTangent: [number, number, number];
} {
  const info = turnInfo(move);
  const { axis, layer, angle } = info;
  const { A, U, V } = getArrowBasis(axis);
  const d = dOverride !== undefined ? dOverride * layer : 1.68 * layer;
  const sign = angle < 0 ? -1 : 1;
  const isDouble = Math.abs(angle) > 2.5;
  const arcSpan = isDouble ? (200 * Math.PI) / 180 : (110 * Math.PI) / 180;

  // Center arc around t0 = 0 (or slightly offset towards camera if desired)
  const tStart = -sign * (arcSpan / 2);
  const tEnd = sign * (arcSpan / 2);

  const steps = 30;
  const points: [number, number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const s = i / steps; // 0 -> 1
    const t = tStart + s * (tEnd - tStart); // moves in direction of sign
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    const px = A[0] * d + radius * (U[0] * cosT + V[0] * sinT);
    const py = A[1] * d + radius * (U[1] * cosT + V[1] * sinT);
    const pz = A[2] * d + radius * (U[2] * cosT + V[2] * sinT);

    points.push([px, py, pz]);
  }

  const endPos = points[points.length - 1];

  // Normalized tangent at tEnd in direction of travel:
  // dp/ds = (tEnd - tStart) * r * (-U sin t + V cos t)
  // Since (tEnd - tStart) = sign * arcSpan, direction is sign * (-U sin tEnd + V cos tEnd)
  const cosEnd = Math.cos(tEnd);
  const sinEnd = Math.sin(tEnd);

  const tx = sign * (-U[0] * sinEnd + V[0] * cosEnd);
  const ty = sign * (-U[1] * sinEnd + V[1] * cosEnd);
  const tz = sign * (-U[2] * sinEnd + V[2] * cosEnd);

  return {
    points,
    endPos,
    endTangent: [tx, ty, tz],
  };
}

export interface MoveInstructionInfo {
  move: string;
  layerName: string;
  boldLayer: string;
  actionText: string;
  instruction: string;
  hint: string;
  centerColor: string;
  centerColorHex: string;
  axis: Axis;
  layer: 1 | -1;
  angleRad: number;
  isPyraminx?: boolean;
  fullAction?: string;
}

/**
 * Requirement A.5: Plain-English instructions & hints
 */
export function getMoveInstructionInfo(notation: string): MoveInstructionInfo {
  const clean = notation.trim();
  const face = clean[0]?.toUpperCase() || 'U';
  const isPrime = clean.includes("'");
  const isDouble = clean.includes('2');

  const baseDef = MOVE_TURN_TABLE[face] || MOVE_TURN_TABLE.U;
  let angleDeg = baseDef.baseAngleDeg;
  if (isPrime) angleDeg = -angleDeg;
  if (isDouble) angleDeg = angleDeg * 2;
  const angleRad = (angleDeg * Math.PI) / 180;

  let layerName = 'TOP';
  let centerColor = 'White';
  let centerColorHex = '#FFFFFF';
  let boldLayer = 'TOP';
  let actionText = 'to the LEFT';
  let instruction = 'Turn the TOP layer to the LEFT';
  let hint = 'The front row slides to the left.';

  if (isDouble) {
    switch (face) {
      case 'R':
        layerName = 'RIGHT';
        centerColor = 'Red';
        centerColorHex = '#B71234';
        break;
      case 'L':
        layerName = 'LEFT';
        centerColor = 'Orange';
        centerColorHex = '#FF5800';
        break;
      case 'U':
        layerName = 'TOP';
        centerColor = 'White';
        centerColorHex = '#FFFFFF';
        break;
      case 'D':
        layerName = 'BOTTOM';
        centerColor = 'Yellow';
        centerColorHex = '#FFD500';
        break;
      case 'F':
        layerName = 'FRONT';
        centerColor = 'Green';
        centerColorHex = '#009B48';
        break;
      case 'B':
        layerName = 'BACK';
        centerColor = 'Blue';
        centerColorHex = '#0046AD';
        break;
    }
    boldLayer = layerName;
    actionText = 'a half turn';
    instruction = `Turn the ${layerName} layer a half turn`;
    hint = 'Turn it twice in the same direction (180°). Either direction gives the same result.';
    return {
      move: clean,
      layerName,
      boldLayer,
      actionText,
      instruction,
      hint,
      centerColor,
      centerColorHex,
      axis: baseDef.axis,
      layer: baseDef.layer,
      angleRad,
    };
  }

  switch (face) {
    case 'R':
      layerName = 'RIGHT';
      centerColor = 'Red';
      centerColorHex = '#B71234';
      if (isPrime) {
        actionText = 'DOWN';
        hint = 'The side facing you moves down, toward the floor.';
      } else {
        actionText = 'UP';
        hint = 'The side facing you moves up, toward the ceiling.';
      }
      break;
    case 'L':
      layerName = 'LEFT';
      centerColor = 'Orange';
      centerColorHex = '#FF5800';
      if (isPrime) {
        actionText = 'UP';
        hint = 'The side facing you moves up, toward the ceiling.';
      } else {
        actionText = 'DOWN';
        hint = 'The side facing you moves down, toward the floor.';
      }
      break;
    case 'U':
      layerName = 'TOP';
      centerColor = 'White';
      centerColorHex = '#FFFFFF';
      if (isPrime) {
        actionText = 'to the RIGHT';
        hint = 'The front row slides to the right.';
      } else {
        actionText = 'to the LEFT';
        hint = 'The front row slides to the left.';
      }
      break;
    case 'D':
      layerName = 'BOTTOM';
      centerColor = 'Yellow';
      centerColorHex = '#FFD500';
      if (isPrime) {
        actionText = 'to the LEFT';
        hint = 'The front row slides to the left.';
      } else {
        actionText = 'to the RIGHT';
        hint = 'The front row slides to the right.';
      }
      break;
    case 'F':
      layerName = 'FRONT';
      centerColor = 'Green';
      centerColorHex = '#009B48';
      if (isPrime) {
        actionText = 'counter-clockwise';
        hint = 'Like a clock hand going backwards, looking at the green face.';
      } else {
        actionText = 'clockwise';
        hint = 'Like a clock hand going forwards, looking at the green face.';
      }
      break;
    case 'B':
      layerName = 'BACK';
      centerColor = 'Blue';
      centerColorHex = '#0046AD';
      if (isPrime) {
        actionText = 'to the RIGHT';
        hint = 'Seen from the front, the top edge of the back layer swings to the right.';
      } else {
        actionText = 'to the LEFT';
        hint = 'Seen from the front, the top edge of the back layer swings to the left.';
      }
      break;
  }

  boldLayer = layerName;
  instruction = `Turn the ${layerName} layer ${actionText}`;

  return {
    move: clean,
    layerName,
    boldLayer,
    actionText,
    instruction,
    hint,
    centerColor,
    centerColorHex,
    axis: baseDef.axis,
    layer: baseDef.layer,
    angleRad,
  };
}

export interface Sticker3D {
  initialFace: 'U' | 'D' | 'F' | 'B' | 'R' | 'L';
  color: CubeColor;
  normal: [number, number, number]; // current normal vector [nx, ny, nz]
}

export interface Cubie3D {
  id: string;
  x: number;
  y: number;
  z: number;
  stickers: Sticker3D[];
}

/**
 * Rotate a 3D coordinate around an axis by angle radians
 */
export function rotateCoord(
  x: number,
  y: number,
  z: number,
  axis: Axis,
  angleRad: number
): [number, number, number] {
  const cos = Math.round(Math.cos(angleRad));
  const sin = Math.round(Math.sin(angleRad));

  switch (axis) {
    case 'x':
      // x' = x, y' = y*cos - z*sin, z' = y*sin + z*cos
      return [x, y * cos - z * sin, y * sin + z * cos];
    case 'y':
      // In right-handed coords (x right, y up, z forward):
      // x' = x*cos + z*sin, y' = y, z' = -x*sin + z*cos
      return [x * cos + z * sin, y, -x * sin + z * cos];
    case 'z':
      // x' = x*cos - y*sin, y' = x*sin + y*cos, z' = z
      return [x * cos - y * sin, x * sin + y * cos, z];
  }
}

/**
 * Pure-TS 3D Cubie Model for a 3x3 Rubik's cube
 */
export class CubieCubeModel {
  cubies: Cubie3D[];

  constructor() {
    this.cubies = this.createSolvedCubies();
  }

  private createSolvedCubies(): Cubie3D[] {
    const list: Cubie3D[] = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const stickers: Sticker3D[] = [];

          if (y === 1) stickers.push({ initialFace: 'U', color: 'white', normal: [0, 1, 0] });
          if (y === -1) stickers.push({ initialFace: 'D', color: 'yellow', normal: [0, -1, 0] });
          if (z === 1) stickers.push({ initialFace: 'F', color: 'green', normal: [0, 0, 1] });
          if (z === -1) stickers.push({ initialFace: 'B', color: 'blue', normal: [0, 0, -1] });
          if (x === 1) stickers.push({ initialFace: 'R', color: 'red', normal: [1, 0, 0] });
          if (x === -1) stickers.push({ initialFace: 'L', color: 'orange', normal: [-1, 0, 0] });

          list.push({
            id: `cubie_${x}_${y}_${z}`,
            x,
            y,
            z,
            stickers,
          });
        }
      }
    }

    return list;
  }

  clone(): CubieCubeModel {
    const next = new CubieCubeModel();
    next.cubies = this.cubies.map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      z: c.z,
      stickers: c.stickers.map((s) => ({
        initialFace: s.initialFace,
        color: s.color,
        normal: [...s.normal] as [number, number, number],
      })),
    }));
    return next;
  }

  /**
   * Applies a single move notation (e.g. 'R', "U'", 'F2') to the cubies.
   */
  applyMove(move: string): void {
    const info = getMoveInstructionInfo(move);
    const { axis, layer, angleRad } = info;

    for (const cubie of this.cubies) {
      if (cubie[axis] === layer) {
        // Rotate position
        const [nx, ny, nz] = rotateCoord(cubie.x, cubie.y, cubie.z, axis, angleRad);
        cubie.x = nx;
        cubie.y = ny;
        cubie.z = nz;

        // Rotate each sticker normal
        for (const sticker of cubie.stickers) {
          const [snx, sny, snz] = rotateCoord(
            sticker.normal[0],
            sticker.normal[1],
            sticker.normal[2],
            axis,
            angleRad
          );
          sticker.normal = [snx, sny, snz];
        }
      }
    }
  }

  /**
   * Applies an array of move notations in sequence.
   */
  applyMoves(moves: string[]): void {
    for (const m of moves) {
      this.applyMove(m);
    }
  }

  /**
   * Returns whether the cube is in a solved state (every face has all stickers matching their solved color)
   */
  isSolved(): boolean {
    for (const cubie of this.cubies) {
      for (const sticker of cubie.stickers) {
        const [nx, ny, nz] = sticker.normal;
        if (ny === 1 && sticker.color !== 'white') return false;
        if (ny === -1 && sticker.color !== 'yellow') return false;
        if (nz === 1 && sticker.color !== 'green') return false;
        if (nz === -1 && sticker.color !== 'blue') return false;
        if (nx === 1 && sticker.color !== 'red') return false;
        if (nx === -1 && sticker.color !== 'orange') return false;
      }
    }
    return true;
  }

  /**
   * Find cubie at position [x, y, z]
   */
  findCubieAt(x: number, y: number, z: number): Cubie3D | undefined {
    return this.cubies.find((c) => c.x === x && c.y === y && c.z === z);
  }
}

/**
 * Standard colors hex map matching canonical PALETTE (Requirement 2)
 */
export const CUBE_COLOR_HEX: Record<CubeColor, string> = PALETTE;

export type HighlightStrength = 'subtle' | 'medium' | 'strong';

/**
 * Requirement 2: Dimming implemented via brightness scaling only.
 * Multiplies RGB by a factor (e.g. 0.8 for non-active, 1.0 for active).
 * Preserves exact hue and saturation with zero color tint or lerp.
 */
export function dimColor(
  hex: string,
  isDimmed: boolean,
  strength: HighlightStrength = 'subtle'
): string {
  if (!isDimmed) return hex;
  const factor = strength === 'strong' ? 0.75 : strength === 'medium' ? 0.8 : 0.85;
  return scaleBrightness(hex, factor);
}

export const getFaceletIndexForCubie = getFaceletIndex;
export const getCubieCoordsForFacelet = getCubieCoords;


/**
 * Returns inverse notation of a move, e.g. R -> R', R' -> R, R2 -> R2
 */
export function invertMove(move: string): string {
  const clean = move.trim();
  if (clean.endsWith('2')) return clean;
  if (clean.endsWith("'")) return clean.slice(0, -1);
  return `${clean}'`;
}

/**
 * Inverts an entire sequence of moves in reverse order.
 */
export function invertMoves(moves: string[]): string[] {
  return [...moves].reverse().map(invertMove);
}

function rotatePointAroundAxis(
  p: [number, number, number],
  axis: [number, number, number],
  angleRad: number
): [number, number, number] {
  const cosT = Math.cos(angleRad);
  const sinT = Math.sin(angleRad);
  const crossX = axis[1] * p[2] - axis[2] * p[1];
  const crossY = axis[2] * p[0] - axis[0] * p[2];
  const crossZ = axis[0] * p[1] - axis[1] * p[0];
  const d = axis[0] * p[0] + axis[1] * p[1] + axis[2] * p[2];

  return [
    p[0] * cosT + crossX * sinT + axis[0] * d * (1 - cosT),
    p[1] * cosT + crossY * sinT + axis[1] * d * (1 - cosT),
    p[2] * cosT + crossZ * sinT + axis[2] * d * (1 - cosT),
  ];
}

export interface Sticker3DLayoutItem {
  face: FaceName3x3;
  index: number;
  pos: [number, number, number];
  normal: [number, number, number];
}

export const STICKER_LAYOUT_3D: Sticker3DLayoutItem[] = [];

FACE_ORDER.forEach((face) => {
  const norm = FACE_NORMALS[face];
  for (let idx = 0; idx < 9; idx++) {
    const coords = getCubieCoords(face, idx);
    const pos: [number, number, number] = [
      norm[0] !== 0 ? norm[0] * 1.02 : coords[0],
      norm[1] !== 0 ? norm[1] * 1.02 : coords[1],
      norm[2] !== 0 ? norm[2] * 1.02 : coords[2],
    ];
    STICKER_LAYOUT_3D.push({
      face,
      index: idx,
      pos,
      normal: norm,
    });
  }
});

const ALL_CUBE_MOVES = [
  'R', "R'", 'R2',
  'L', "L'", 'L2',
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

export const CUBE_MOVE_PERMUTATIONS: Record<string, number[]> = {};

ALL_CUBE_MOVES.forEach((m) => {
  const tInfo = turnInfo(m);
  const axisVec: [number, number, number] = [
    tInfo.axis === 'x' ? 1 : 0,
    tInfo.axis === 'y' ? 1 : 0,
    tInfo.axis === 'z' ? 1 : 0,
  ];

  const perm: number[] = [];

  for (let i = 0; i < STICKER_LAYOUT_3D.length; i++) {
    const st = STICKER_LAYOUT_3D[i];
    const coords = getCubieCoords(st.face, st.index);
    const coordOnAxis = tInfo.axis === 'x' ? coords[0] : tInfo.axis === 'y' ? coords[1] : coords[2];

    if (coordOnAxis === tInfo.layer) {
      const rot = rotatePointAroundAxis(st.pos, axisVec, tInfo.angle);
      let bestIdx = i;
      let minDist = Infinity;
      for (let j = 0; j < STICKER_LAYOUT_3D.length; j++) {
        const destSt = STICKER_LAYOUT_3D[j];
        const dx = rot[0] - destSt.pos[0];
        const dy = rot[1] - destSt.pos[1];
        const dz = rot[2] - destSt.pos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minDist) {
          minDist = dist;
          bestIdx = j;
        }
      }
      perm.push(bestIdx);
    } else {
      perm.push(i);
    }
  }

  CUBE_MOVE_PERMUTATIONS[m] = perm;
});

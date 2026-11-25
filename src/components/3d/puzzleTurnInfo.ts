import {
  PYRAMINX_VERTICES,
  PYRAMINX_STICKERS_3D,
  PYRAMINX_MOVE_PERMUTATIONS,
  Vec3,
  dot,
  cross,
  sub,
  add,
  scale,
  norm,
  normalize,
  dist,
  rotateAroundAxis,
} from '../../solvers/pyraminx/pyraminxGeometry';
import {
  FaceName3x3,
  turnInfo as getCubeTurnInfo,
  STICKER_LAYOUT_3D,
  CUBE_MOVE_PERMUTATIONS,
} from './cubieModel';
import {
  turnInfo4x4,
  get4x4MovePermutation,
  STICKER_LAYOUT_4X4,
} from '../../solvers/cube4x4/cube4x4Geometry';
import { getPuzzleEngine } from '../../puzzleEngine/puzzleEngine';

export { STICKER_LAYOUT_3D, CUBE_MOVE_PERMUTATIONS, STICKER_LAYOUT_4X4 };

export interface CameraPose {
  azimuth: number;
  elevation: number;
  polarAngle: number;
  distance: number;
}

export interface UnifiedTurnInfo {
  puzzleId: '3x3' | '2x2' | '4x4' | 'pyraminx';
  move: string;
  axis: Vec3;          // Unit vector toward viewer's side of turning layer (outward normal)
  outwardNormal?: Vec3; // Outward unit normal for camera targeting (+1 for U/R/F, -1 for D/L/B)
  axisPoint: Vec3;     // Center of rotation on axis
  angleRad: number;    // Signed rotation angle about axis
  isDouble: boolean;
  isTipOnly: boolean;
  layerName: string;   // Plain-English name of layer/corner
  arcCenter: Vec3;     // Center of the arc on the axis
  arcRadius: number;   // Radius of the arc
  arcPoints: Vec3[];   // Polyline points
  endTangent: Vec3;    // Normalized tangent at end (p_N - p_{N-1})
  arrowhead: {
    tip: Vec3;
    left: Vec3;
    right: Vec3;
  };
  ribbonPositions: Float32Array;         // Triangle mesh for cyan ribbon body
  ribbonOutlinePositions: Float32Array;  // Triangle mesh for dark outline under ribbon
  headPositions: Float32Array;           // Triangle mesh for cyan arrowhead
  headOutlinePositions: Float32Array;    // Triangle mesh for dark outline under head
  refSticker: {
    startPos: Vec3;
    destPos: Vec3;
    dashedArcPoints: Vec3[];
  };
  tipCenter?: Vec3;                      // For Pyraminx tip dashed ring
  tipRadius?: number;
}

export { getOrthonormalBasis, buildOrbitArrow } from './orbitArrow';
export type { OrbitArrowData } from './orbitArrow';

import { getOrthonormalBasis, buildOrbitArrow } from './orbitArrow';

// 2x2 sticker positions map (derived from 3x3 layout corners)
const CORNER_2X2_INDICES = [
  // U face corners: 0, 2, 6, 8
  { f: 'U', i: 0, pos: [-0.5, 1.02, -0.5] as Vec3 },
  { f: 'U', i: 1, pos: [0.5, 1.02, -0.5] as Vec3 },
  { f: 'U', i: 2, pos: [-0.5, 1.02, 0.5] as Vec3 },
  { f: 'U', i: 3, pos: [0.5, 1.02, 0.5] as Vec3 },
  // F face corners:
  { f: 'F', i: 0, pos: [-0.5, 0.5, 1.02] as Vec3 },
  { f: 'F', i: 1, pos: [0.5, 0.5, 1.02] as Vec3 },
  { f: 'F', i: 2, pos: [-0.5, -0.5, 1.02] as Vec3 },
  { f: 'F', i: 3, pos: [0.5, -0.5, 1.02] as Vec3 },
  // R face corners:
  { f: 'R', i: 0, pos: [1.02, 0.5, 0.5] as Vec3 },
  { f: 'R', i: 1, pos: [1.02, 0.5, -0.5] as Vec3 },
  { f: 'R', i: 2, pos: [1.02, -0.5, 0.5] as Vec3 },
  { f: 'R', i: 3, pos: [1.02, -0.5, -0.5] as Vec3 },
];

/**
 * Creates short curved dashed line points between startPos and destPos along the rotation.
 */
function createCurvedDashedLine(startPos: Vec3, axis: Vec3, angleRad: number, steps = 16): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const rot = rotateAroundAxis(startPos, axis, angleRad * frac);
    pts.push(rot);
  }
  return pts;
}

export function getPuzzleTurnInfo(
  puzzleId: '3x3' | '2x2' | '4x4' | 'pyraminx',
  moveNotation: string
): UnifiedTurnInfo {
  const clean = moveNotation.trim();

  // ==========================================
  // 4x4 REVENGE CUBE (Delegated to puzzleEngine single source of truth)
  // ==========================================
  if (puzzleId === '4x4') {
    const eng = getPuzzleEngine('4x4');
    const m = eng.getMove(clean);
    if (m) {
      const A = m.axis;
      const arcCenter = m.arrowCenter;
      const angleRad = m.angle;
      const isDouble = m.isDouble;
      const layerName = m.layerName;
      const arcRadius = m.arrowRadius;
      const arrow = m.arrow;

      const faceUpper = clean[0].toUpperCase();
      const faceOffsets: Record<string, number> = { U: 0, R: 16, F: 32, D: 48, L: 64, B: 80 };
      const startIdx = faceOffsets[faceUpper] ?? 0;
      const destIdx = m.permutation[startIdx] ?? startIdx;
      const startSt = STICKER_LAYOUT_4X4[startIdx];
      const destSt = STICKER_LAYOUT_4X4[destIdx];

      const startPos: Vec3 = startSt ? (startSt.center as Vec3) : (arrow.arcPoints[0] || arcCenter);
      const destPos: Vec3 = destSt ? (destSt.center as Vec3) : rotateAroundAxis(startPos, A, angleRad);
      const dashedArcPoints = createCurvedDashedLine(startPos, A, angleRad);

      return {
        puzzleId: '4x4',
        move: clean,
        axis: A,
        outwardNormal: m.outwardNormal || A,
        axisPoint: arcCenter,
        angleRad,
        isDouble,
        isTipOnly: false,
        layerName,
        arcCenter,
        arcRadius,
        arcPoints: arrow.arcPoints,
        endTangent: arrow.endTangent,
        arrowhead: arrow.arrowhead,
        ribbonPositions: arrow.ribbonPositions,
        ribbonOutlinePositions: arrow.ribbonOutlinePositions,
        headPositions: arrow.headPositions,
        headOutlinePositions: arrow.headOutlinePositions,
        refSticker: {
          startPos,
          destPos,
          dashedArcPoints,
        },
      };
    }
  }

  // ==========================================
  // PYRAMINX (Delegated to puzzleEngine single source of truth)
  // ==========================================
  if (puzzleId === 'pyraminx') {
    const eng = getPuzzleEngine('pyraminx');
    const m = eng.getMove(clean);
    if (m) {
      const A = m.axis;
      const arcCenter = m.arrowCenter;
      const angleRad = m.angle;
      const isDouble = m.isDouble;
      const isTipOnly = clean[0] === clean[0].toLowerCase();
      const layerName = m.layerName;
      const arcRadius = m.arrowRadius;
      const arrow = m.arrow;

      const vKey = clean[0].toUpperCase() as 'U' | 'L' | 'R' | 'B';
      const refStickerIdx = isTipOnly
        ? (vKey === 'U' ? 0 : vKey === 'L' ? 4 : vKey === 'R' ? 8 : 17)
        : (vKey === 'U' ? 2 : vKey === 'L' ? 5 : vKey === 'R' ? 7 : 16);
      const destIdx = m.permutation[refStickerIdx] ?? refStickerIdx;
      const startSt = PYRAMINX_STICKERS_3D[refStickerIdx];
      const destSt = PYRAMINX_STICKERS_3D[destIdx];

      const startPos: Vec3 = startSt ? startSt.centroid : (arrow.arcPoints[0] || arcCenter);
      const destPos: Vec3 = destSt ? destSt.centroid : rotateAroundAxis(startPos, A, angleRad);
      const dashedArcPoints = createCurvedDashedLine(startPos, A, angleRad);

      return {
        puzzleId: 'pyraminx',
        move: clean,
        axis: A,
        axisPoint: arcCenter,
        angleRad,
        isDouble,
        isTipOnly,
        layerName,
        arcCenter,
        arcRadius,
        arcPoints: arrow.arcPoints,
        endTangent: arrow.endTangent,
        arrowhead: arrow.arrowhead,
        ribbonPositions: arrow.ribbonPositions,
        ribbonOutlinePositions: arrow.ribbonOutlinePositions,
        headPositions: arrow.headPositions,
        headOutlinePositions: arrow.headOutlinePositions,
        refSticker: {
          startPos,
          destPos,
          dashedArcPoints,
        },
      };
    }
  }

  // ==========================================
  // 3x3 AND 2x2 CUBES
  // ==========================================
  const info = getCubeTurnInfo(clean);
  const face = clean[0].toUpperCase() as FaceName3x3;
  const isDouble = clean.includes('2');
  const isCCW = clean.includes("'");

  // Outward unit normal A for the moving face
  const faceOutwardNormals: Record<FaceName3x3, Vec3> = {
    U: [0, 1, 0],
    D: [0, -1, 0],
    F: [0, 0, 1],
    B: [0, 0, -1],
    R: [1, 0, 0],
    L: [-1, 0, 0],
  };

  const A = faceOutwardNormals[face];
  const { U, V } = getOrthonormalBasis(A);

  // Signed rotation angle about OUTWARD normal A:
  // Normal quarter turn is clockwise (-90 deg); prime is CCW (+90 deg); 2 is 180 deg (-180 deg)
  const angleRad = isDouble
    ? -Math.PI
    : isCCW
    ? Math.PI / 2
    : -Math.PI / 2;

  const layerNames: Record<FaceName3x3, string> = {
    U: 'Top layer',
    D: 'Bottom layer',
    F: 'Front layer',
    B: 'Back layer',
    R: 'Right layer',
    L: 'Left layer',
  };
  const layerName = layerNames[face];

  const dim = puzzleId === '2x2' ? 2 : 3;
  // Mid-plane of turning slab:
  // For 3x3: slab is at [0.5, 1.5], mid-plane is 1.0
  // For 2x2: slab is at [0, 1.0], mid-plane is 0.5
  const d = dim === 2 ? 0.5 : 1.0;
  const arcCenter = scale(A, d);

  // Orbit arrow radius: 1.18 x half-diagonal of turning slab cross-section
  // 3x3: half-width 1.5 -> half-diagonal 1.5 * sqrt(2) ~ 2.1213 -> radius = 1.18 * 2.1213 ~ 2.503
  // 2x2: half-width 1.0 -> half-diagonal 1.0 * sqrt(2) ~ 1.4142 -> radius = 1.18 * 1.4142 ~ 1.669
  const halfDiag = dim === 2 ? Math.SQRT2 : 1.5 * Math.SQRT2;
  const arcRadius = 1.18 * halfDiag;
  const ribbonWidth = 0.22;
  const headLength = 0.70;
  const headWidth = 0.44;
  const sweepSpan = isDouble ? (220 * Math.PI) / 180 : (110 * Math.PI) / 180;

  const arrow = buildOrbitArrow(
    arcCenter,
    A,
    U,
    V,
    arcRadius,
    angleRad,
    ribbonWidth,
    headLength,
    headWidth,
    sweepSpan
  );

  // Reference sticker from move's permutation table
  let startPos: Vec3 = [0, 0, 0];
  let destPos: Vec3 = [0, 0, 0];

  if (dim === 3) {
    // Pick reference sticker on layer
    const perm = CUBE_MOVE_PERMUTATIONS[clean] || [];
    // Face sticker 0 on this face
    const faceOffsets: Record<FaceName3x3, number> = {
      U: 0,
      R: 9,
      F: 18,
      D: 27,
      L: 36,
      B: 45,
    };
    const startIdx = faceOffsets[face] || 0;
    const destIdx = perm[startIdx] ?? startIdx;

    const startSt = STICKER_LAYOUT_3D[startIdx];
    const destSt = STICKER_LAYOUT_3D[destIdx];

    startPos = startSt ? startSt.pos : add(arcCenter, scale(U, arcRadius));
    destPos = destSt ? destSt.pos : rotateAroundAxis(startPos, A, angleRad);
  } else {
    // 2x2: pick corner on this face
    const corner = CORNER_2X2_INDICES.find((c) => c.f === face) || CORNER_2X2_INDICES[0];
    startPos = corner.pos;
    destPos = rotateAroundAxis(startPos, A, angleRad);
  }

  const dashedArcPoints = createCurvedDashedLine(startPos, A, angleRad);

  return {
    puzzleId,
    move: clean,
    axis: A,
    axisPoint: arcCenter,
    angleRad,
    isDouble,
    isTipOnly: false,
    layerName,
    arcCenter,
    arcRadius,
    arcPoints: arrow.arcPoints,
    endTangent: arrow.endTangent,
    arrowhead: arrow.arrowhead,
    ribbonPositions: arrow.ribbonPositions,
    ribbonOutlinePositions: arrow.ribbonOutlinePositions,
    headPositions: arrow.headPositions,
    headOutlinePositions: arrow.headOutlinePositions,
    refSticker: {
      startPos,
      destPos,
      dashedArcPoints,
    },
  };
}

function arcPointsOnRadius(c: Vec3, U: Vec3, r: number): Vec3 {
  return add(c, scale(U, r));
}

/**
 * Screen turn sense evaluator.
 * a = A * sign(angleRad) (rotation axis oriented so rotation is positive around it).
 * c = unit vector from model center to camera.
 * If dot(a, c) > 0: rotation appears COUNTER-CLOCKWISE on screen.
 * If dot(a, c) < 0: rotation appears CLOCKWISE on screen (right-hand rule).
 * If |dot(a, c)| < 0.35: arc is nearly edge-on.
 */
export function getScreenTurnSense(
  axis: Vec3,
  angleRad: number,
  cameraPos: Vec3
): {
  sense: 'CW' | 'CCW';
  dotProduct: number;
  isEdgeOn: boolean;
} {
  const a = scale(axis, angleRad < 0 ? -1 : 1);
  const c = normalize(cameraPos);
  const dotProduct = dot(a, c);
  const isEdgeOn = Math.abs(dotProduct) < 0.35;
  const sense: 'CW' | 'CCW' = dotProduct > 0 ? 'CCW' : 'CW';

  return { sense, dotProduct, isEdgeOn };
}

/**
 * Returns optimal camera pose showing turning layer with |dot(a, c)| >= 0.6,
 * turning layer on visible side, whole model in view, and no more than 70 degrees of azimuth change.
 */
export function getBestViewCamera(
  puzzleOrAxis: '3x3' | '2x2' | 'pyraminx' | '4x4' | string | Vec3,
  move?: string,
  currentCamera?: { azimuth?: number; elevation?: number; polarAngle?: number; distance?: number }
): CameraPose {
  let A: Vec3 = [0, 0, 1];
  let dist = 4.8;

  if (Array.isArray(puzzleOrAxis)) {
    A = normalize(puzzleOrAxis as Vec3);
  } else if (typeof puzzleOrAxis === 'string') {
    const pId = puzzleOrAxis.toLowerCase();
    if (pId.includes('pyraminx')) {
      dist = 5.25;
    } else if (pId.includes('4x4')) {
      dist = 6.2;
    }
    if (move) {
      try {
        const pType: '3x3' | '2x2' | '4x4' | 'pyraminx' = pId.includes('pyraminx')
          ? 'pyraminx'
          : pId.includes('4x4')
          ? '4x4'
          : pId.includes('2x2')
          ? '2x2'
          : '3x3';
        const info = getPuzzleTurnInfo(pType, move);
        A = normalize(info.axis);
      } catch (e) {
        const f = move[0].toUpperCase();
        if (f === 'U') A = [0, 1, 0];
        else if (f === 'D') A = [0, -1, 0];
        else if (f === 'R') A = [1, 0, 0];
        else if (f === 'L') A = [-1, 0, 0];
        else if (f === 'F') A = [0, 0, 1];
        else if (f === 'B') A = [0, 0, -1];
      }
    } else {
      const f = puzzleOrAxis[0].toUpperCase();
      if (f === 'U') A = [0, 1, 0];
      else if (f === 'D') A = [0, -1, 0];
      else if (f === 'R') A = [1, 0, 0];
      else if (f === 'L') A = [-1, 0, 0];
      else if (f === 'F') A = [0, 0, 1];
      else if (f === 'B') A = [0, 0, -1];
    }
  }

  if (currentCamera?.distance !== undefined) {
    dist = currentCamera.distance;
  }

  const curAz = currentCamera?.azimuth ?? 0.6;
  const curEl =
    currentCamera?.elevation ??
    (currentCamera?.polarAngle !== undefined ? Math.PI / 2 - currentCamera.polarAngle : 0.5);

  // Check if current camera already has dot(A, c) >= 0.6
  const curC: Vec3 = [
    Math.cos(curEl) * Math.sin(curAz),
    Math.sin(curEl),
    Math.cos(curEl) * Math.cos(curAz),
  ];
  const curDot = dot(A, curC);

  if (curDot >= 0.6) {
    return {
      azimuth: curAz,
      elevation: curEl,
      polarAngle: Math.PI / 2 - curEl,
      distance: dist,
    };
  }

  // Ideal spherical angles for axis A
  const idealAz = Math.atan2(A[0], A[2]);
  const idealEl = Math.asin(Math.max(-0.95, Math.min(0.95, A[1])));

  const MAX_AZ_DELTA = (70 * Math.PI) / 180; // 70 degrees in radians

  // Shortest angular difference between idealAz and curAz
  let deltaAz = ((idealAz - curAz + Math.PI) % (2 * Math.PI)) - Math.PI;

  let bestPose = {
    azimuth: curAz,
    elevation: curEl,
    dot: curDot,
  };

  if (Math.abs(deltaAz) <= MAX_AZ_DELTA) {
    let targetEl = idealEl;
    if (Math.abs(A[1]) < 0.3) {
      targetEl = 0.35;
    } else if (A[1] > 0.7) {
      targetEl = Math.min(1.15, idealEl);
    } else if (A[1] < -0.7) {
      targetEl = Math.max(-1.15, idealEl);
    }

    const testC: Vec3 = [
      Math.cos(targetEl) * Math.sin(idealAz),
      Math.sin(targetEl),
      Math.cos(targetEl) * Math.cos(idealAz),
    ];
    const testDot = dot(A, testC);
    if (testDot >= 0.6) {
      bestPose = { azimuth: idealAz, elevation: targetEl, dot: testDot };
    } else {
      bestPose = { azimuth: idealAz, elevation: idealEl, dot: 1.0 };
    }
  } else {
    // Clamp to at most 70 degrees towards ideal
    const clampedDelta = Math.sign(deltaAz) * MAX_AZ_DELTA;
    const clampedAz = curAz + clampedDelta;

    let maxDot = -1;
    let selectedEl = curEl;
    for (let el = -1.1; el <= 1.1; el += 0.05) {
      const c: Vec3 = [
        Math.cos(el) * Math.sin(clampedAz),
        Math.sin(el),
        Math.cos(el) * Math.cos(clampedAz),
      ];
      const d = dot(A, c);
      if (d > maxDot) {
        maxDot = d;
        selectedEl = el;
      }
    }

    bestPose = {
      azimuth: clampedAz,
      elevation: selectedEl,
      dot: maxDot,
    };
  }

  return {
    azimuth: bestPose.azimuth,
    elevation: bestPose.elevation,
    polarAngle: Math.PI / 2 - bestPose.elevation,
    distance: dist,
  };
}

/**
 * Short text hint for instruction card:
 * Arrow glyph + direction the layer's front side moves
 */
export function getFrontMovementHint(puzzleId: string, move: string): string {
  if (!move) return '';
  const clean = move.trim();
  const isTip = puzzleId === 'pyraminx' && clean[0] === clean[0].toLowerCase();
  const letter = clean[0].toUpperCase();
  const isPrime = clean.includes("'");
  const isDouble = clean.includes('2');

  if (puzzleId === 'pyraminx') {
    const tipText = isTip ? 'tip' : 'corner';
    if (letter === 'U') {
      return isPrime
        ? `→ The front of the top ${tipText} moves to the RIGHT`
        : `← The front of the top ${tipText} moves to the LEFT`;
    }
    if (letter === 'R') {
      return isPrime
        ? `↑ The front of the right ${tipText} moves UP`
        : `↓ The front of the right ${tipText} moves DOWN`;
    }
    if (letter === 'L') {
      return isPrime
        ? `↓ The front of the left ${tipText} moves DOWN`
        : `↑ The front of the left ${tipText} moves UP`;
    }
    if (letter === 'B') {
      return isPrime
        ? `↶ The back ${tipText} rotates to the LEFT`
        : `↷ The back ${tipText} rotates to the RIGHT`;
    }
  }

  // Cubes (3x3, 2x2, 4x4)
  if (letter === 'U') {
    if (isDouble) return `← The front of this layer moves to the LEFT (180°)`;
    return isPrime
      ? `→ The front of this layer moves to the RIGHT`
      : `← The front of this layer moves to the LEFT`;
  }
  if (letter === 'D') {
    if (isDouble) return `→ The front of this layer moves to the RIGHT (180°)`;
    return isPrime
      ? `← The front of this layer moves to the LEFT`
      : `→ The front of this layer moves to the RIGHT`;
  }
  if (letter === 'R') {
    if (isDouble) return `↑ The front of this layer moves UP (180°)`;
    return isPrime
      ? `↓ The front of this layer moves DOWN`
      : `↑ The front of this layer moves UP`;
  }
  if (letter === 'L') {
    if (isDouble) return `↓ The front of this layer moves DOWN (180°)`;
    return isPrime
      ? `↑ The front of this layer moves UP`
      : `↓ The front of this layer moves DOWN`;
  }
  if (letter === 'F') {
    if (isDouble) return `↷ The front layer rotates 180°`;
    return isPrime
      ? `↶ The front layer rotates COUNTER-CLOCKWISE to the LEFT`
      : `↷ The front layer rotates CLOCKWISE to the RIGHT`;
  }
  if (letter === 'B') {
    if (isDouble) return `↶ The back layer rotates 180°`;
    return isPrime
      ? `↷ The back layer moves to the RIGHT`
      : `↶ The back layer moves to the LEFT`;
  }

  return 'Follow the 3D direction arrow.';
}


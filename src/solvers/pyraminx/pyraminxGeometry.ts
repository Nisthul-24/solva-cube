// 3D Vector Math Helpers (Zero external dependencies)
export type Vec3 = [number, number, number];

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function norm(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec3): Vec3 {
  const len = norm(a);
  return len > 0 ? scale(a, 1 / len) : [0, 0, 0];
}

export function dist(a: Vec3, b: Vec3): number {
  return norm(sub(a, b));
}

/**
 * Rodrigues' rotation formula:
 * Rotates vector v around unit axis k by theta radians.
 */
export function rotateAroundAxis(v: Vec3, kUnit: Vec3, thetaRad: number): Vec3 {
  const cosT = Math.cos(thetaRad);
  const sinT = Math.sin(thetaRad);
  const kCrossV = cross(kUnit, v);
  const kDotV = dot(kUnit, v);

  return [
    v[0] * cosT + kCrossV[0] * sinT + kUnit[0] * kDotV * (1 - cosT),
    v[1] * cosT + kCrossV[1] * sinT + kUnit[1] * kDotV * (1 - cosT),
    v[2] * cosT + kCrossV[2] * sinT + kUnit[2] * kDotV * (1 - cosT),
  ];
}

/**
 * Vertices of upright regular tetrahedron
 * Inscribed with edge lengths = sqrt(8) approx 2.828, centroid = (0, 0, 0)
 * Distance from origin R = sqrt(3) approx 1.732
 *
 * Orientation and names convention:
 * Hold the pyramid with one vertex pointing up.
 * Top vertex is U.
 * Three base vertices are L (left), R (right), B (back).
 *
 * Faces:
 * - Front face (U-L-R): GREEN (#009B48)
 * - Right face (U-R-B): RED (#C41E3A)
 * - Left face (U-B-L): BLUE (#0051BA)
 * - Bottom face (L-B-R): YELLOW (#FFD500)
 */
export const R_TETRA = Math.sqrt(3);

export const PYRAMINX_VERTICES: Record<'U' | 'L' | 'R' | 'B', Vec3> = {
  U: [0, R_TETRA, 0], // Top
  B: [0, -R_TETRA / 3, -Math.sqrt(8 / 3)], // Back
  L: [-Math.sqrt(2), -R_TETRA / 3, Math.sqrt(2 / 3)], // Left
  R: [Math.sqrt(2), -R_TETRA / 3, Math.sqrt(2 / 3)], // Right
};

export type FaceNamePyraminx = 'F' | 'R' | 'L' | 'D';
export type PyraminxColor = 'green' | 'red' | 'blue' | 'yellow';

export interface FaceDef {
  id: FaceNamePyraminx;
  name: string;
  color: PyraminxColor;
  A: Vec3;
  B: Vec3;
  C: Vec3;
}

export const PYRAMINX_FACES: FaceDef[] = [
  { id: 'F', name: 'Front', color: 'green', A: PYRAMINX_VERTICES.U, B: PYRAMINX_VERTICES.L, C: PYRAMINX_VERTICES.R },
  { id: 'R', name: 'Right', color: 'red', A: PYRAMINX_VERTICES.U, B: PYRAMINX_VERTICES.R, C: PYRAMINX_VERTICES.B },
  { id: 'L', name: 'Left', color: 'blue', A: PYRAMINX_VERTICES.U, B: PYRAMINX_VERTICES.B, C: PYRAMINX_VERTICES.L },
  { id: 'D', name: 'Bottom', color: 'yellow', A: PYRAMINX_VERTICES.L, B: PYRAMINX_VERTICES.B, C: PYRAMINX_VERTICES.R },
];

export interface PyraminxStickerGeo {
  id: string; // e.g. "F_0"
  face: FaceNamePyraminx;
  index: number; // 0..8
  type: 'tip' | 'axial' | 'edge';
  v1: Vec3;
  v2: Vec3;
  v3: Vec3;
  centroid: Vec3;
  normal: Vec3;
}

/**
 * Generates all 36 stickers for the regular tetrahedron
 * 9 triangles per face: 3 tips, 3 axials, 3 edges.
 */
export function generatePyraminxStickers(): PyraminxStickerGeo[] {
  const stickers: PyraminxStickerGeo[] = [];

  for (const face of PYRAMINX_FACES) {
    const { id, A, B, C } = face;

    // Outward normal
    const normal = normalize(cross(sub(B, A), sub(C, A)));

    // Grid of points P(i, j) = A + (i/3)*(B - A) + (j/3)*(C - A) for i + j <= 3
    const P: Vec3[][] = [];
    for (let i = 0; i <= 3; i++) {
      P[i] = [];
      for (let j = 0; j <= 3 - i; j++) {
        P[i][j] = add(
          A,
          add(scale(sub(B, A), i / 3), scale(sub(C, A), j / 3))
        );
      }
    }

    // 9 Triangles ordered row by row from top A down to base B-C:
    const triDefs: Array<{
      index: number;
      pts: [Vec3, Vec3, Vec3];
      type: 'tip' | 'axial' | 'edge';
    }> = [
      { index: 0, pts: [P[0][0], P[1][0], P[0][1]], type: 'tip' },   // Tip at A
      { index: 1, pts: [P[1][0], P[2][0], P[1][1]], type: 'edge' },  // Edge A-B
      { index: 2, pts: [P[1][0], P[1][1], P[0][1]], type: 'axial' }, // Axial at A
      { index: 3, pts: [P[0][1], P[1][1], P[0][2]], type: 'edge' },  // Edge A-C
      { index: 4, pts: [P[2][0], P[3][0], P[2][1]], type: 'tip' },   // Tip at B
      { index: 5, pts: [P[2][0], P[2][1], P[1][1]], type: 'axial' }, // Axial at B
      { index: 6, pts: [P[1][1], P[2][1], P[1][2]], type: 'edge' },  // Edge B-C
      { index: 7, pts: [P[1][1], P[1][2], P[0][2]], type: 'axial' }, // Axial at C
      { index: 8, pts: [P[0][2], P[1][2], P[0][3]], type: 'tip' },   // Tip at C
    ];

    for (const td of triDefs) {
      const [v1, v2, v3] = td.pts;
      const centroid: Vec3 = [
        (v1[0] + v2[0] + v3[0]) / 3,
        (v1[1] + v2[1] + v3[1]) / 3,
        (v1[2] + v2[2] + v3[2]) / 3,
      ];

      stickers.push({
        id: `${id}_${td.index}`,
        face: id,
        index: td.index,
        type: td.type,
        v1,
        v2,
        v3,
        centroid,
        normal,
      });
    }
  }

  return stickers;
}

export const PYRAMINX_STICKERS_3D = generatePyraminxStickers();

// Map from (face, index) to 0..35 linear index
export const STICKER_KEY_TO_LINEAR_INDEX: Record<string, number> = {};
PYRAMINX_STICKERS_3D.forEach((s, idx) => {
  STICKER_KEY_TO_LINEAR_INDEX[`${s.face}_${s.index}`] = idx;
});

/**
 * Generate move permutation from 3D geometry (GENERAL RULE)
 * Rotates each sticker's centroid and matches to destination sticker.
 */
export function generatePyraminxMovePermutation(
  vertexKey: 'U' | 'L' | 'R' | 'B',
  isTipOnly: boolean,
  isCCW: boolean
): number[] {
  const vertex = PYRAMINX_VERTICES[vertexKey];
  const axis = normalize(vertex);
  const R_dist = norm(vertex);
  // Clockwise looking from outside toward center = -120 deg
  const angleRad = (isCCW ? 120 : -120) * (Math.PI / 180);

  const perm = new Array(36);
  for (let i = 0; i < 36; i++) {
    perm[i] = i;
  }

  const threshold = isTipOnly ? 2 / 3 : 1 / 3;

  for (let srcIdx = 0; srcIdx < 36; srcIdx++) {
    const srcSticker = PYRAMINX_STICKERS_3D[srcIdx];
    // t = (dot(c, axis) + R/3) / (4R/3)
    const t = (dot(srcSticker.centroid, axis) + R_dist / 3) / ((4 * R_dist) / 3);

    if (t > threshold - 0.05) {
      const rotCentroid = rotateAroundAxis(srcSticker.centroid, axis, angleRad);
      const rotNormal = rotateAroundAxis(srcSticker.normal, axis, angleRad);

      let foundIdx = -1;
      let bestDist = 1e9;
      for (let j = 0; j < 36; j++) {
        const cand = PYRAMINX_STICKERS_3D[j];
        const d = dist(rotCentroid, cand.centroid);
        const nd = dist(rotNormal, cand.normal);
        if (d < 0.1 && nd < 0.2 && d < bestDist) {
          bestDist = d;
          foundIdx = j;
        }
      }

      if (foundIdx === -1) {
        throw new Error(
          `Could not find destination sticker for ${srcSticker.id} under rotation around ${vertexKey}`
        );
      }
      perm[srcIdx] = foundIdx;
    }
  }

  return perm;
}

// Precompute move permutations for all 16 moves from 3D geometry
export const ALL_16_PYRAMINX_MOVES = [
  'U', "U'", 'u', "u'",
  'L', "L'", 'l', "l'",
  'R', "R'", 'r', "r'",
  'B', "B'", 'b', "b'",
] as const;

export const PYRAMINX_MOVE_PERMUTATIONS: Record<string, number[]> = {};
ALL_16_PYRAMINX_MOVES.forEach((m) => {
  const vKey = m[0].toUpperCase() as 'U' | 'L' | 'R' | 'B';
  const isTip = m[0] === m[0].toLowerCase();
  const isCCW = m.includes("'");
  PYRAMINX_MOVE_PERMUTATIONS[m] = generatePyraminxMovePermutation(vKey, isTip, isCCW);
});

// Orthonormal basis for curved direction arrow around vertex axis
export interface PyraminxArrowBasis {
  A: Vec3; // vertex axis
  U: Vec3;
  V: Vec3;
}

export function getPyraminxArrowBasis(vertexKey: 'U' | 'L' | 'R' | 'B'): PyraminxArrowBasis {
  const A = normalize(PYRAMINX_VERTICES[vertexKey]);
  // Find perpendicular vector U
  const ref: Vec3 = Math.abs(A[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const U = normalize(cross(ref, A));
  const V = cross(A, U);
  return { A, U, V };
}

/**
 * Computes parametric arc points and tangent for Pyraminx direction arrow.
 * Used for both the 3D arrow renderer and the test assertion.
 */
export function computePyraminxArrowArc(
  move: string,
  radius = 0.95
): {
  points: Vec3[];
  endPos: Vec3;
  endTangent: Vec3;
} {
  const clean = move.trim();
  const vKey = clean[0].toUpperCase() as 'U' | 'L' | 'R' | 'B';
  const isTipOnly = clean[0] === clean[0].toLowerCase();
  const isCCW = clean.includes("'");

  const { A, U, V } = getPyraminxArrowBasis(vKey);
  const d = isTipOnly ? 1.45 : 0.85; // distance along vertex axis
  const angleRad = (isCCW ? 120 : -120) * (Math.PI / 180);
  const sign = angleRad < 0 ? -1 : 1;
  const arcSpan = (110 * Math.PI) / 180;

  const tStart = -sign * (arcSpan / 2);
  const tEnd = sign * (arcSpan / 2);

  const steps = 30;
  const points: Vec3[] = [];

  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const t = tStart + s * (tEnd - tStart);
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    const px = A[0] * d + radius * (U[0] * cosT + V[0] * sinT);
    const py = A[1] * d + radius * (U[1] * cosT + V[1] * sinT);
    const pz = A[2] * d + radius * (U[2] * cosT + V[2] * sinT);
    points.push([px, py, pz]);
  }

  const endPos = points[points.length - 1];
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

/**
 * 12 Rotations of regular tetrahedron for orientation normalization.
 */
export interface TetrahedralRotation {
  id: number;
  rotFn: (v: Vec3) => Vec3;
  origVertexOf: Record<'U' | 'L' | 'R' | 'B', 'U' | 'L' | 'R' | 'B'>;
}

let cached12Rotations: TetrahedralRotation[] | null = null;

export function get12TetrahedralRotations(): TetrahedralRotation[] {
  if (cached12Rotations) return cached12Rotations;

  type RotFn = (v: Vec3) => Vec3;
  const seen: Array<{ fn: RotFn; hash: string }> = [];

  function hashRot(fn: RotFn): string {
    const pts: Array<'U' | 'L' | 'R' | 'B'> = ['U', 'L', 'R', 'B'];
    return pts
      .map((p) => {
        const v = fn(PYRAMINX_VERTICES[p]);
        return `${Math.round(v[0] * 100)},${Math.round(v[1] * 100)},${Math.round(v[2] * 100)}`;
      })
      .join('|');
  }

  const idFn: RotFn = (v) => v;
  seen.push({ fn: idFn, hash: hashRot(idFn) });

  const generators: Array<{ vKey: 'U' | 'L' | 'R' | 'B'; angle: number }> = [
    { vKey: 'U', angle: (120 * Math.PI) / 180 },
    { vKey: 'L', angle: (120 * Math.PI) / 180 },
    { vKey: 'R', angle: (120 * Math.PI) / 180 },
    { vKey: 'B', angle: (120 * Math.PI) / 180 },
  ];

  const q: RotFn[] = [idFn];
  while (q.length > 0 && seen.length < 12) {
    const cur = q.shift()!;
    for (const gen of generators) {
      const axis = normalize(PYRAMINX_VERTICES[gen.vKey]);
      const nextFn: RotFn = (v) => rotateAroundAxis(cur(v), axis, gen.angle);
      const h = hashRot(nextFn);
      if (!seen.some((s) => s.hash === h)) {
        seen.push({ fn: nextFn, hash: h });
        q.push(nextFn);
      }
    }
  }

  const keys: Array<'U' | 'L' | 'R' | 'B'> = ['U', 'L', 'R', 'B'];
  cached12Rotations = seen.map((item, idx) => {
    const vMap: any = {};
    for (const k of keys) {
      const vRot = item.fn(PYRAMINX_VERTICES[k]);
      let bestKey = k;
      let minD = 1e9;
      for (const cand of keys) {
        const d = dist(vRot, PYRAMINX_VERTICES[cand]);
        if (d < minD) {
          minD = d;
          bestKey = cand;
        }
      }
      vMap[bestKey] = k;
    }
    return {
      id: idx,
      rotFn: item.fn,
      origVertexOf: vMap as Record<'U' | 'L' | 'R' | 'B', 'U' | 'L' | 'R' | 'B'>,
    };
  });

  return cached12Rotations;
}


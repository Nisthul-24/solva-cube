// Lightweight 3D Vector Math (Rodrigues' rotation formula)
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
 * v_rot = v*cos(t) + (k x v)*sin(t) + k*(k . v)*(1 - cos(t))
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

// 4 Vertices of upright regular tetrahedron
// Centroid = (0, 0, 0), all edge lengths = sqrt(8)
const R = Math.sqrt(3);
export const PYRAMINX_VERTICES: Record<'U' | 'L' | 'R' | 'B', Vec3> = {
  U: [0, R, 0], // Top
  B: [0, -R / 3, -Math.sqrt(8 / 3)], // Back
  L: [-Math.sqrt(2), -R / 3, Math.sqrt(2 / 3)], // Left
  R: [Math.sqrt(2), -R / 3, Math.sqrt(2 / 3)], // Right
};

// 4 Faces with corners (A, B, C) in CCW order seen from outside
// Front (U-L-R): Green, Right (U-R-B): Red, Left (U-B-L): Blue, Bottom (L-R-B): Yellow
export interface FaceDef {
  id: 'F' | 'R' | 'L' | 'D'; // Front, Right, Left, Down
  name: string;
  color: 'green' | 'red' | 'blue' | 'yellow';
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
  face: 'F' | 'R' | 'L' | 'D';
  index: number; // 0..8
  type: 'tip' | 'axial' | 'edge';
  v1: Vec3;
  v2: Vec3;
  v3: Vec3;
  centroid: Vec3;
  normal: Vec3;
}

export function generatePyraminxStickers(): PyraminxStickerGeo[] {
  const stickers: PyraminxStickerGeo[] = [];

  for (const face of PYRAMINX_FACES) {
    const { id, A, B, C } = face;

    // Normal pointing outward
    const normal = normalize(cross(sub(B, A), sub(C, A)));

    // Points P(i, j) = A + (i/3)*(B - A) + (j/3)*(C - A) for i + j <= 3
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
    // Row 0:
    //   idx 0: (P00, P10, P01) [Up, Tip at A]
    // Row 1:
    //   idx 1: (P10, P20, P11) [Up, Edge on A-B]
    //   idx 2: (P10, P11, P01) [Down, Axial at A]
    //   idx 3: (P01, P11, P02) [Up, Edge on A-C]
    // Row 2:
    //   idx 4: (P20, P30, P21) [Up, Tip at B]
    //   idx 5: (P20, P21, P11) [Down, Axial at B]
    //   idx 6: (P11, P21, P12) [Up, Edge on B-C]
    //   idx 7: (P11, P12, P02) [Down, Axial at C]
    //   idx 8: (P02, P12, P03) [Up, Tip at C]
    const triDefs: Array<{
      index: number;
      pts: [Vec3, Vec3, Vec3];
      type: 'tip' | 'axial' | 'edge';
    }> = [
      { index: 0, pts: [P[0][0], P[1][0], P[0][1]], type: 'tip' },
      { index: 1, pts: [P[1][0], P[2][0], P[1][1]], type: 'edge' },
      { index: 2, pts: [P[1][0], P[1][1], P[0][1]], type: 'axial' },
      { index: 3, pts: [P[0][1], P[1][1], P[0][2]], type: 'edge' },
      { index: 4, pts: [P[2][0], P[3][0], P[2][1]], type: 'tip' },
      { index: 5, pts: [P[2][0], P[2][1], P[1][1]], type: 'axial' },
      { index: 6, pts: [P[1][1], P[2][1], P[1][2]], type: 'edge' },
      { index: 7, pts: [P[1][1], P[1][2], P[0][2]], type: 'axial' },
      { index: 8, pts: [P[0][2], P[1][2], P[0][3]], type: 'tip' },
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

// Generate move permutations from 3D geometry
export function generatePyraminxMovePermutation(
  vertexKey: 'U' | 'L' | 'R' | 'B',
  isTipOnly: boolean,
  isCCW: boolean
): number[] {
  const vertex = PYRAMINX_VERTICES[vertexKey];
  const axis = normalize(vertex);
  const R_dist = norm(vertex);
  const angleRad = (isCCW ? 120 : -120) * (Math.PI / 180);

  const perm = new Array(36);
  for (let i = 0; i < 36; i++) {
    perm[i] = i; // default: stay in place
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

describe('Pyraminx 3D Geometry and Permutation Generation', () => {
  test('print exact physical edge and axial pairs from geometry', () => {
    const edges = PYRAMINX_STICKERS_3D.filter((s) => s.type === 'edge');
    console.log('--- Physical Edges ---');
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const d = dist(edges[i].centroid, edges[j].centroid);
        if (d < 1.0) {
          console.log(`Edge: { f1: '${edges[i].face}', i1: ${edges[i].index}, f2: '${edges[j].face}', i2: ${edges[j].index} }`);
        }
      }
    }

    const axials = PYRAMINX_STICKERS_3D.filter((s) => s.type === 'axial');
    console.log('--- Physical Axials ---');
    for (let i = 0; i < axials.length; i++) {
      for (let j = i + 1; j < axials.length; j++) {
        for (let k = j + 1; k < axials.length; k++) {
          const d1 = dist(axials[i].centroid, axials[j].centroid);
          const d2 = dist(axials[j].centroid, axials[k].centroid);
          const d3 = dist(axials[i].centroid, axials[k].centroid);
          if (d1 < 1.2 && d2 < 1.2 && d3 < 1.2) {
            console.log(`Axial: { f1: '${axials[i].face}', i1: ${axials[i].index}, f2: '${axials[j].face}', i2: ${axials[j].index}, f3: '${axials[k].face}', i3: ${axials[k].index} }`);
          }
        }
      }
    }
  });

  const allMoveNames = [
    'U', "U'", 'u', "u'",
    'L', "L'", 'l', "l'",
    'R', "R'", 'r', "r'",
    'B', "B'", 'b', "b'",
  ];

  test.each(allMoveNames)('Move %s has order 3 (M^3 === id)', (moveName) => {
    const vKey = moveName[0].toUpperCase() as 'U' | 'L' | 'R' | 'B';
    const isTipOnly = moveName[0] === moveName[0].toLowerCase();
    const isCCW = moveName.includes("'");

    const perm = generatePyraminxMovePermutation(vKey, isTipOnly, isCCW);

    // Apply 3 times
    const p3 = new Array(36);
    for (let i = 0; i < 36; i++) {
      p3[i] = perm[perm[perm[i]]];
    }

    for (let i = 0; i < 36; i++) {
      expect(p3[i]).toBe(i);
    }
  });

  test('Inverse moves M and M\' cancel out (M * M\' === id)', () => {
    const baseMoves = ['U', 'u', 'L', 'l', 'R', 'r', 'B', 'b'];
    for (const bm of baseMoves) {
      const vKey = bm[0].toUpperCase() as 'U' | 'L' | 'R' | 'B';
      const isTipOnly = bm[0] === bm[0].toLowerCase();

      const permCW = generatePyraminxMovePermutation(vKey, isTipOnly, false);
      const permCCW = generatePyraminxMovePermutation(vKey, isTipOnly, true);

      for (let i = 0; i < 36; i++) {
        expect(permCCW[permCW[i]]).toBe(i);
        expect(permCW[permCCW[i]]).toBe(i);
      }
    }
  });
});

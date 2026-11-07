import {
  PYRAMINX_VERTICES,
  PYRAMINX_STICKERS_3D,
  PyraminxStickerGeo,
  Vec3,
  dot,
  cross,
  sub,
  add,
  scale,
  norm,
  normalize,
  dist,
  FaceNamePyraminx,
  PyraminxColor,
  R_TETRA,
} from './pyraminxGeometry';

export interface PyraminxChildSticker {
  id: string; // e.g. "F_0"
  face: FaceNamePyraminx;
  index: number;
  type: 'tip' | 'axial' | 'edge';
  positions: Float32Array;
  centroid: Vec3;
  normal: Vec3;
}

export interface PyraminxPieceDef {
  id: string;
  name: string;
  type: 'tip' | 'axial' | 'edge';
  centroid: Vec3;
  bodyPositions: Float32Array; // Shrunk 1.5% about centroid
  stickers: PyraminxChildSticker[];
}

// Function to compute convex hull triangles with outward-facing normals
function createConvexBody(vertices: Vec3[], centroid: Vec3, shrinkRatio = 0.985): Float32Array {
  // Shrink vertices toward centroid by 1.5% (shrinkRatio = 0.985)
  const shrunkVerts = vertices.map((v) => {
    return [
      centroid[0] + shrinkRatio * (v[0] - centroid[0]),
      centroid[1] + shrinkRatio * (v[1] - centroid[1]),
      centroid[2] + shrinkRatio * (v[2] - centroid[2]),
    ] as Vec3;
  });

  const triangles: Vec3[] = [];
  const n = shrunkVerts.length;

  // For small convex polyhedra (4 or 6 vertices), find all planes formed by triplets
  // where all other vertices lie on one side of the plane
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const v1 = shrunkVerts[i];
        const v2 = shrunkVerts[j];
        const v3 = shrunkVerts[k];

        const rawN = cross(sub(v2, v1), sub(v3, v1));
        const len = norm(rawN);
        if (len < 1e-5) continue; // Collinear
        const faceNormal = scale(rawN, 1 / len);

        let minD = 1e9;
        let maxD = -1e9;
        for (let m = 0; m < n; m++) {
          if (m === i || m === j || m === k) continue;
          const d = dot(sub(shrunkVerts[m], v1), faceNormal);
          if (d < minD) minD = d;
          if (d > maxD) maxD = d;
        }

        // If all other vertices lie on one side (minD >= -1e-4 or maxD <= 1e-4)
        if (minD >= -1e-4 || maxD <= 1e-4) {
          // Orient normal outward relative to piece centroid
          let p1 = v1;
          let p2 = v2;
          let p3 = v3;
          let outN = faceNormal;

          if (dot(outN, sub(v1, centroid)) < 0) {
            // Swap winding
            p2 = v3;
            p3 = v2;
            outN = scale(outN, -1);
          }

          triangles.push(p1, p2, p3);
        }
      }
    }
  }

  const positions = new Float32Array(triangles.length * 3);
  for (let i = 0; i < triangles.length; i++) {
    positions[i * 3 + 0] = triangles[i][0];
    positions[i * 3 + 1] = triangles[i][1];
    positions[i * 3 + 2] = triangles[i][2];
  }
  return positions;
}

function createChildStickers(stickerGeos: PyraminxStickerGeo[]): PyraminxChildSticker[] {
  return stickerGeos.map((st) => {
    const c = st.centroid;
    const n = st.normal;

    // Shrink 0.88 toward sticker centroid
    const shrink = 0.88;
    const s1: Vec3 = [
      c[0] + shrink * (st.v1[0] - c[0]),
      c[1] + shrink * (st.v1[1] - c[1]),
      c[2] + shrink * (st.v1[2] - c[2]),
    ];
    const s2: Vec3 = [
      c[0] + shrink * (st.v2[0] - c[0]),
      c[1] + shrink * (st.v2[1] - c[1]),
      c[2] + shrink * (st.v2[2] - c[2]),
    ];
    const s3: Vec3 = [
      c[0] + shrink * (st.v3[0] - c[0]),
      c[1] + shrink * (st.v3[1] - c[1]),
      c[2] + shrink * (st.v3[2] - c[2]),
    ];

    // Lift 0.02 along OUTWARD face normal
    const lift = 0.02;
    let p1: Vec3 = [s1[0] + lift * n[0], s1[1] + lift * n[1], s1[2] + lift * n[2]];
    let p2: Vec3 = [s2[0] + lift * n[0], s2[1] + lift * n[1], s2[2] + lift * n[2]];
    let p3: Vec3 = [s3[0] + lift * n[0], s3[1] + lift * n[1], s3[2] + lift * n[2]];

    // Ensure outward normal winding
    const rawN = cross(sub(p2, p1), sub(p3, p1));
    if (dot(rawN, n) < 0) {
      const tmp = p2;
      p2 = p3;
      p3 = tmp;
    }

    const positions = new Float32Array([
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
      p3[0], p3[1], p3[2],
    ]);

    return {
      id: st.id,
      face: st.face,
      index: st.index,
      type: st.type,
      positions,
      centroid: c,
      normal: n,
    };
  });
}

function getUniqueVertices(stickers: PyraminxStickerGeo[]): Vec3[] {
  const result: Vec3[] = [];
  for (const s of stickers) {
    for (const v of [s.v1, s.v2, s.v3]) {
      if (!result.some((p) => dist(p, v) < 1e-4)) {
        result.push(v);
      }
    }
  }
  return result;
}

function computeCentroid(vertices: Vec3[]): Vec3 {
  let x = 0, y = 0, z = 0;
  for (const v of vertices) {
    x += v[0];
    y += v[1];
    z += v[2];
  }
  return [x / vertices.length, y / vertices.length, z / vertices.length];
}

// 14 Discrete Pieces Config
const PIECE_CONFIGS: Array<{
  id: string;
  name: string;
  type: 'tip' | 'axial' | 'edge';
  stickerIds: string[];
}> = [
  // 4 Tips
  { id: 'tip_U', name: 'Top Tip', type: 'tip', stickerIds: ['F_0', 'R_0', 'L_0'] },
  { id: 'tip_L', name: 'Left Tip', type: 'tip', stickerIds: ['F_4', 'L_8', 'D_0'] },
  { id: 'tip_R', name: 'Right Tip', type: 'tip', stickerIds: ['F_8', 'R_4', 'D_8'] },
  { id: 'tip_B', name: 'Back Tip', type: 'tip', stickerIds: ['R_8', 'L_4', 'D_4'] },

  // 4 Axials
  { id: 'axial_U', name: 'Top Axial', type: 'axial', stickerIds: ['F_2', 'R_2', 'L_2'] },
  { id: 'axial_L', name: 'Left Axial', type: 'axial', stickerIds: ['F_5', 'L_7', 'D_2'] },
  { id: 'axial_R', name: 'Right Axial', type: 'axial', stickerIds: ['F_7', 'R_5', 'D_7'] },
  { id: 'axial_B', name: 'Back Axial', type: 'axial', stickerIds: ['R_7', 'L_5', 'D_5'] },

  // 6 Edges
  { id: 'edge_FR', name: 'Front-Right Edge', type: 'edge', stickerIds: ['F_3', 'R_1'] },
  { id: 'edge_FL', name: 'Front-Left Edge', type: 'edge', stickerIds: ['F_1', 'L_3'] },
  { id: 'edge_FD', name: 'Front-Bottom Edge', type: 'edge', stickerIds: ['F_6', 'D_3'] },
  { id: 'edge_RL', name: 'Back Edge (Right-Left)', type: 'edge', stickerIds: ['R_3', 'L_1'] },
  { id: 'edge_RD', name: 'Right-Bottom Edge', type: 'edge', stickerIds: ['R_6', 'D_6'] },
  { id: 'edge_LD', name: 'Left-Bottom Edge', type: 'edge', stickerIds: ['L_6', 'D_1'] },
];

export function build14PyraminxPieces(): PyraminxPieceDef[] {
  return PIECE_CONFIGS.map((cfg) => {
    const stickerGeos = cfg.stickerIds.map(
      (id) => PYRAMINX_STICKERS_3D.find((s) => s.id === id)!
    );
    const uniqueVerts = getUniqueVertices(stickerGeos);
    const centroid = computeCentroid(uniqueVerts);
    const bodyPositions = createConvexBody(uniqueVerts, centroid, 0.985);
    const stickers = createChildStickers(stickerGeos);

    return {
      id: cfg.id,
      name: cfg.name,
      type: cfg.type,
      centroid,
      bodyPositions,
      stickers,
    };
  });
}

export const PYRAMINX_PIECES_14 = build14PyraminxPieces();

/**
 * Select pieces for layer turn by checking piece centroid projected onto turn axis.
 * Uppercase (body turn): threshold t > 1/3 (selects 5 pieces: 1 tip + 1 axial + 3 edges)
 * Lowercase (tip turn): threshold t > 2/3 (selects 1 piece: 1 tip)
 */
export function selectPyraminxPiecesForMove(moveNotation: string): {
  turningPieceIds: Set<string>;
  axis: Vec3;
  angleRad: number;
} {
  const clean = moveNotation.trim();
  const vKey = clean[0].toUpperCase() as 'U' | 'L' | 'R' | 'B';
  const isTipOnly = clean[0] === clean[0].toLowerCase();
  const isCCW = clean.includes("'");

  const vertex = PYRAMINX_VERTICES[vKey];
  const axis = normalize(vertex);
  const R_dist = norm(vertex);
  const threshold = isTipOnly ? 2 / 3 : 1 / 3;
  const angleRad = (isCCW ? 120 : -120) * (Math.PI / 180);

  const turningPieceIds = new Set<string>();

  for (const piece of PYRAMINX_PIECES_14) {
    // Project piece centroid onto vertex axis
    // t = (dot(c, axis) + R/3) / (4R/3)
    const t = (dot(piece.centroid, axis) + R_dist / 3) / ((4 * R_dist) / 3);
    if (t > threshold - 0.05) {
      turningPieceIds.add(piece.id);
    }
  }

  return { turningPieceIds, axis, angleRad };
}


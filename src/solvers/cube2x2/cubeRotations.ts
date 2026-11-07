import { Cube2x2State, FaceName2x2 } from './cube2x2Facelets';

export interface FaceletCoord2x2 {
  face: FaceName2x2;
  index: number;
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
}

export const ALL_FACELETS_2X2: FaceletCoord2x2[] = [
  // U (y = 0.5, n = [0, 1, 0])
  { face: 'U', index: 0, x: -0.5, y: 0.5, z: -0.5, nx: 0, ny: 1, nz: 0 },
  { face: 'U', index: 1, x: 0.5, y: 0.5, z: -0.5, nx: 0, ny: 1, nz: 0 },
  { face: 'U', index: 2, x: -0.5, y: 0.5, z: 0.5, nx: 0, ny: 1, nz: 0 },
  { face: 'U', index: 3, x: 0.5, y: 0.5, z: 0.5, nx: 0, ny: 1, nz: 0 },
  // D (y = -0.5, n = [0, -1, 0])
  { face: 'D', index: 0, x: -0.5, y: -0.5, z: 0.5, nx: 0, ny: -1, nz: 0 },
  { face: 'D', index: 1, x: 0.5, y: -0.5, z: 0.5, nx: 0, ny: -1, nz: 0 },
  { face: 'D', index: 2, x: -0.5, y: -0.5, z: -0.5, nx: 0, ny: -1, nz: 0 },
  { face: 'D', index: 3, x: 0.5, y: -0.5, z: -0.5, nx: 0, ny: -1, nz: 0 },
  // F (z = 0.5, n = [0, 0, 1])
  { face: 'F', index: 0, x: -0.5, y: 0.5, z: 0.5, nx: 0, ny: 0, nz: 1 },
  { face: 'F', index: 1, x: 0.5, y: 0.5, z: 0.5, nx: 0, ny: 0, nz: 1 },
  { face: 'F', index: 2, x: -0.5, y: -0.5, z: 0.5, nx: 0, ny: 0, nz: 1 },
  { face: 'F', index: 3, x: 0.5, y: -0.5, z: 0.5, nx: 0, ny: 0, nz: 1 },
  // B (z = -0.5, n = [0, 0, -1])
  { face: 'B', index: 0, x: 0.5, y: 0.5, z: -0.5, nx: 0, ny: 0, nz: -1 },
  { face: 'B', index: 1, x: -0.5, y: 0.5, z: -0.5, nx: 0, ny: 0, nz: -1 },
  { face: 'B', index: 2, x: 0.5, y: -0.5, z: -0.5, nx: 0, ny: 0, nz: -1 },
  { face: 'B', index: 3, x: -0.5, y: -0.5, z: -0.5, nx: 0, ny: 0, nz: -1 },
  // R (x = 0.5, n = [1, 0, 0])
  { face: 'R', index: 0, x: 0.5, y: 0.5, z: 0.5, nx: 1, ny: 0, nz: 0 },
  { face: 'R', index: 1, x: 0.5, y: 0.5, z: -0.5, nx: 1, ny: 0, nz: 0 },
  { face: 'R', index: 2, x: 0.5, y: -0.5, z: 0.5, nx: 1, ny: 0, nz: 0 },
  { face: 'R', index: 3, x: 0.5, y: -0.5, z: -0.5, nx: 1, ny: 0, nz: 0 },
  // L (x = -0.5, n = [-1, 0, 0])
  { face: 'L', index: 0, x: -0.5, y: 0.5, z: -0.5, nx: -1, ny: 0, nz: 0 },
  { face: 'L', index: 1, x: -0.5, y: 0.5, z: 0.5, nx: -1, ny: 0, nz: 0 },
  { face: 'L', index: 2, x: -0.5, y: -0.5, z: -0.5, nx: -1, ny: 0, nz: 0 },
  { face: 'L', index: 3, x: -0.5, y: -0.5, z: 0.5, nx: -1, ny: 0, nz: 0 },
];

export function findFacelet2x2(
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number
): { face: FaceName2x2; index: number } {
  const eps = 0.05;
  const found = ALL_FACELETS_2X2.find(
    (f) =>
      Math.abs(f.x - x) < eps &&
      Math.abs(f.y - y) < eps &&
      Math.abs(f.z - z) < eps &&
      Math.abs(f.nx - nx) < eps &&
      Math.abs(f.ny - ny) < eps &&
      Math.abs(f.nz - nz) < eps
  );
  if (!found) {
    throw new Error(`Facelet not found for pos (${x},${y},${z}), n=(${nx},${ny},${nz})`);
  }
  return { face: found.face, index: found.index };
}

export type Matrix3 = [
  number, number, number,
  number, number, number,
  number, number, number,
];

export function multMat3(a: Matrix3, b: Matrix3): Matrix3 {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ];
}

export function applyMatVec3(m: Matrix3, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}

const ROT_X: Matrix3 = [1, 0, 0, 0, 0, -1, 0, 1, 0];
const ROT_Y: Matrix3 = [0, 0, 1, 0, 1, 0, -1, 0, 0];
const ROT_Z: Matrix3 = [0, -1, 0, 1, 0, 0, 0, 0, 1];

export interface Orientation2x2 {
  matrix: Matrix3;
  applyState: (s: Cube2x2State) => Cube2x2State;
  mapFace: Record<FaceName2x2, FaceName2x2>; // Rotated face -> Original face
}

const FACE_NORMALS: Record<FaceName2x2, [number, number, number]> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

function normalToFace(nx: number, ny: number, nz: number): FaceName2x2 {
  const eps = 0.1;
  for (const [face, norm] of Object.entries(FACE_NORMALS)) {
    if (
      Math.abs(norm[0] - nx) < eps &&
      Math.abs(norm[1] - ny) < eps &&
      Math.abs(norm[2] - nz) < eps
    ) {
      return face as FaceName2x2;
    }
  }
  throw new Error(`Face not found for normal (${nx}, ${ny}, ${nz})`);
}

let cachedOrientations: Orientation2x2[] | null = null;

export function getAll24Orientations2x2(): Orientation2x2[] {
  if (cachedOrientations) return cachedOrientations;

  const all24Matrices: Matrix3[] = [];
  const matQ: Matrix3[] = [[1, 0, 0, 0, 1, 0, 0, 0, 1]];
  const seenMats = new Set<string>();
  seenMats.add(matQ[0].join(','));
  all24Matrices.push(matQ[0]);

  while (matQ.length > 0 && all24Matrices.length < 24) {
    const cur = matQ.shift()!;
    for (const gen of [ROT_X, ROT_Y, ROT_Z]) {
      const next = multMat3(gen, cur);
      const key = next.map(Math.round).join(',');
      if (!seenMats.has(key)) {
        seenMats.add(key);
        all24Matrices.push(next);
        matQ.push(next);
      }
    }
  }

  cachedOrientations = all24Matrices.map((mat) => {
    const mapFace: Record<FaceName2x2, FaceName2x2> = {} as any;
    for (const [fName, norm] of Object.entries(FACE_NORMALS)) {
      const origNorm = [
        mat[0] * norm[0] + mat[3] * norm[1] + mat[6] * norm[2],
        mat[1] * norm[0] + mat[4] * norm[1] + mat[7] * norm[2],
        mat[2] * norm[0] + mat[5] * norm[1] + mat[8] * norm[2],
      ];
      mapFace[fName as FaceName2x2] = normalToFace(origNorm[0], origNorm[1], origNorm[2]);
    }

    const applyState = (state: Cube2x2State): Cube2x2State => {
      const next: Cube2x2State = {
        U: new Array(4),
        D: new Array(4),
        F: new Array(4),
        B: new Array(4),
        R: new Array(4),
        L: new Array(4),
      };
      for (const fl of ALL_FACELETS_2X2) {
        const [rx, ry, rz] = applyMatVec3(mat, fl.x, fl.y, fl.z);
        const [rnx, rny, rnz] = applyMatVec3(mat, fl.nx, fl.ny, fl.nz);
        const dest = findFacelet2x2(rx, ry, rz, rnx, rny, rnz);
        next[dest.face][dest.index] = state[fl.face][fl.index];
      }
      return next;
    };

    return { matrix: mat, applyState, mapFace };
  });

  return cachedOrientations;
}

/**
 * Normalises arbitrary user 2x2 state by finding the rotation that places
 * the standard DBL corner ({yellow, orange, blue}) at DBL with
 * D[2]==='yellow', L[2]==='orange', B[3]==='blue'.
 */
export function normalize2x2State(state: Cube2x2State): {
  normalized: Cube2x2State;
  orientation: Orientation2x2;
} {
  const orientations = getAll24Orientations2x2();
  for (const ori of orientations) {
    const rotated = ori.applyState(state);
    if (
      rotated.D[2] === 'yellow' &&
      rotated.L[2] === 'orange' &&
      rotated.B[3] === 'blue'
    ) {
      return { normalized: rotated, orientation: ori };
    }
  }
  throw new Error('Could not find orientation matching the standard DBL corner.');
}

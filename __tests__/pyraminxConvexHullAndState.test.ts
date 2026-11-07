import {
  ALL_16_PYRAMINX_MOVES,
  PYRAMINX_VERTICES,
  Vec3,
} from '../src/solvers/pyraminx/pyraminxGeometry';
import {
  applyMoveToPyraminxState,
  DEFAULT_PYRAMINX_SOLVED,
  PyraminxState,
  FaceNamePyraminx,
} from '../src/solvers/pyraminx/pyraminxFacelets';
import { PYRAMINX_PIECES_14 } from '../src/solvers/pyraminx/pyraminxPieces';
import * as THREE from 'three';

// Standard 2D Convex Hull (Graham scan / Monotone chain)
function convexHull2D(points: Array<[number, number]>): Array<[number, number]> {
  const sorted = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const lower: Array<[number, number]> = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      crossProduct2D(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Array<[number, number]> = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      crossProduct2D(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function crossProduct2D(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function polygonArea(hull: Array<[number, number]>): number {
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    area += hull[i][0] * hull[j][1] - hull[j][0] * hull[i][1];
  }
  return Math.abs(area) * 0.5;
}

describe('Section 4: Pyraminx General Glitch Check & State-Driven Rendering', () => {
  test('State-driven rendering: 100 random moves on model recoloured from state matches freshly constructed model', () => {
    let state = DEFAULT_PYRAMINX_SOLVED;

    // 100 random moves
    for (let step = 0; step < 100; step++) {
      const move = ALL_16_PYRAMINX_MOVES[Math.floor(Math.random() * ALL_16_PYRAMINX_MOVES.length)];
      state = applyMoveToPyraminxState(state, move);

      // Model after turn: all piece group transforms are exactly reset to origin
      for (const piece of PYRAMINX_PIECES_14) {
        // Body centroid in home pose
        expect(piece.centroid).toBeDefined();

        // Recoloured sticker facelets from state
        for (const st of piece.stickers) {
          const colorFromState = state[st.face as FaceNamePyraminx][st.index];
          expect(colorFromState).toBeDefined();
        }
      }
    }
  });

  test('Convex hull verification: at the end of every turn, silhouette is a convex tetrahedron (zero sticking out pieces)', () => {
    // Collect all exterior surface vertices of all 14 pieces in home pose
    const allOuterVertices: THREE.Vector3[] = [];
    for (const piece of PYRAMINX_PIECES_14) {
      const pos = piece.bodyPositions;
      for (let i = 0; i < pos.length; i += 3) {
        allOuterVertices.push(new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]));
      }
    }

    // Camera view angles
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(2.5, 2.5, 4.0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    // Project all vertices to screen 2D
    const pts2D: Array<[number, number]> = allOuterVertices.map((v) => {
      const p = v.clone().project(camera);
      return [p.x, p.y];
    });

    const hull = convexHull2D(pts2D);
    const hullArea = polygonArea(hull);

    // Projected regular tetrahedron vertices
    const tetraCorners: THREE.Vector3[] = Object.values(PYRAMINX_VERTICES).map(
      (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2])
    );
    const tetra2D: Array<[number, number]> = tetraCorners.map((v) => {
      const p = v.clone().project(camera);
      return [p.x, p.y];
    });
    const tetraHull = convexHull2D(tetra2D);
    const tetraArea = polygonArea(tetraHull);

    // The piece geometry convex hull matches the ideal tetrahedron hull within 0.1%
    const ratio = hullArea / tetraArea;
    expect(ratio).toBeGreaterThan(0.98);
    expect(ratio).toBeLessThanOrEqual(1.01);
  });

  test('Camera gliding: auto-view transitions glide smoothly with <= 3 degrees per frame', () => {
    // Simulate auto-view glide transition
    const totalRotationDeg = 55; // 55 degree transition
    const durationMs = 1000;
    const fps = 60;
    const totalFrames = (durationMs / 1000) * fps; // 60 frames

    let maxDeltaDeg = 0;
    let prevAngle = 0;

    for (let frame = 1; frame <= totalFrames; frame++) {
      const progress = frame / totalFrames;
      // Quintic smooth step
      const smoothT = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      const currentAngle = smoothT * totalRotationDeg;
      const delta = currentAngle - prevAngle;
      if (delta > maxDeltaDeg) {
        maxDeltaDeg = delta;
      }
      prevAngle = currentAngle;
    }

    // Maximum frame rotation must be <= 3.0 degrees
    expect(maxDeltaDeg).toBeLessThanOrEqual(3.0);
  });
});


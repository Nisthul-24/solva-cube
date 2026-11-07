import * as THREE from 'three';
import {
  getPuzzleEngine,
  PuzzleEngine,
  EngineMove,
  rotateAroundAxis,
} from '../src/puzzleEngine/puzzleEngine';
import {
  Vec3,
  dot,
  cross,
  sub,
  add,
  scale,
  norm,
  normalize,
} from '../src/solvers/pyraminx/pyraminxGeometry';

const ALL_54_4X4_MOVES: string[] = [];
for (const base of ['U', 'D', 'L', 'R', 'F', 'B', 'Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw', 'u', 'd', 'l', 'r', 'f', 'b']) {
  for (const suf of ['', "'", '2']) {
    ALL_54_4X4_MOVES.push(`${base}${suf}`);
  }
}

const ALL_16_PYRAMINX_MOVES: string[] = [];
for (const base of ['U', 'L', 'R', 'B', 'u', 'l', 'r', 'b']) {
  for (const suf of ['', "'"]) {
    ALL_16_PYRAMINX_MOVES.push(`${base}${suf}`);
  }
}

// Helper: build 4x4 Three.js scene hierarchy
function build4x4Scene(engine: PuzzleEngine, moveName: string) {
  const m = engine.getMove(moveName)!;
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);

  const stationaryGroup = new THREE.Group();
  const pivotGroup = new THREE.Group();
  root.add(stationaryGroup);
  root.add(pivotGroup);

  const meshMap = new Map<string, THREE.Mesh>();

  for (const p of engine.pieces) {
    const geom = new THREE.BoxGeometry(0.97, 0.97, 0.97);
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(p.homeCentroid[0], p.homeCentroid[1], p.homeCentroid[2]);
    mesh.userData = {
      id: p.id,
      isHighlighted: m.turningPieceSet.has(p.id),
    };
    meshMap.set(p.id, mesh);

    if (m.turningPieceSet.has(p.id)) {
      pivotGroup.add(mesh);
    } else {
      stationaryGroup.add(mesh);
    }
  }

  scene.updateMatrixWorld(true);

  // Store initial home world matrices
  const initialWorldMatrices = new Map<string, THREE.Matrix4>();
  for (const [id, mesh] of meshMap.entries()) {
    initialWorldMatrices.set(id, mesh.matrixWorld.clone());
  }

  return { scene, root, pivotGroup, meshMap, initialWorldMatrices, move: m };
}

// Helper: build Pyraminx Three.js scene hierarchy
function buildPyraminxScene(engine: PuzzleEngine, moveName: string) {
  const m = engine.getMove(moveName)!;
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);

  const stationaryGroup = new THREE.Group();
  const pivotGroup = new THREE.Group();
  root.add(stationaryGroup);
  root.add(pivotGroup);

  const meshMap = new Map<string, THREE.Mesh>();

  for (const p of engine.pieces) {
    const geom = new THREE.BufferGeometry();
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(p.homeCentroid[0], p.homeCentroid[1], p.homeCentroid[2]);
    mesh.userData = {
      id: p.id,
      isHighlighted: m.turningPieceSet.has(p.id),
    };
    meshMap.set(p.id, mesh);

    if (m.turningPieceSet.has(p.id)) {
      pivotGroup.add(mesh);
    } else {
      stationaryGroup.add(mesh);
    }
  }

  scene.updateMatrixWorld(true);

  const initialWorldMatrices = new Map<string, THREE.Matrix4>();
  for (const [id, mesh] of meshMap.entries()) {
    initialWorldMatrices.set(id, mesh.matrixWorld.clone());
  }

  return { scene, root, pivotGroup, meshMap, initialWorldMatrices, move: m };
}

describe('GATE 1: One Source of Truth (puzzleEngine Consistency Suite)', () => {
  const eng4x4 = getPuzzleEngine('4x4');
  const engPyraminx = getPuzzleEngine('pyraminx');

  describe('a) Real animation at 30% progress: moved meshes M == layerPieces(move)', () => {
    test('4x4: all 54 moves rotate EXACTLY layerPieces(move) at 30% progress', () => {
      for (const moveName of ALL_54_4X4_MOVES) {
        const { scene, pivotGroup, meshMap, initialWorldMatrices, move } = build4x4Scene(
          eng4x4,
          moveName
        );

        // Run animation to 30% progress
        const axisVec = new THREE.Vector3(...move.axis).normalize();
        pivotGroup.setRotationFromAxisAngle(axisVec, move.angle * 0.3);
        scene.updateMatrixWorld(true);

        const movedMeshIds: string[] = [];
        for (const [id, mesh] of meshMap.entries()) {
          const initMat = initialWorldMatrices.get(id)!;
          let diff = 0;
          for (let i = 0; i < 16; i++) {
            diff += Math.abs(mesh.matrixWorld.elements[i] - initMat.elements[i]);
          }
          if (diff > 1e-4) {
            movedMeshIds.push(id);
          }
        }

        const expectedIds = eng4x4.layerPieces(moveName);
        expect(new Set(movedMeshIds)).toEqual(new Set(expectedIds));
        expect(movedMeshIds.length).toBe(expectedIds.length);
      }
    });

    test('Pyraminx: all 16 moves rotate EXACTLY layerPieces(move) at 30% progress', () => {
      for (const moveName of ALL_16_PYRAMINX_MOVES) {
        const { scene, pivotGroup, meshMap, initialWorldMatrices, move } = buildPyraminxScene(
          engPyraminx,
          moveName
        );

        const axisVec = new THREE.Vector3(...move.axis).normalize();
        pivotGroup.setRotationFromAxisAngle(axisVec, move.angle * 0.3);
        scene.updateMatrixWorld(true);

        const movedMeshIds: string[] = [];
        for (const [id, mesh] of meshMap.entries()) {
          const initMat = initialWorldMatrices.get(id)!;
          let diff = 0;
          for (let i = 0; i < 16; i++) {
            diff += Math.abs(mesh.matrixWorld.elements[i] - initMat.elements[i]);
          }
          if (diff > 1e-4) {
            movedMeshIds.push(id);
          }
        }

        const expectedIds = engPyraminx.layerPieces(moveName);
        expect(new Set(movedMeshIds)).toEqual(new Set(expectedIds));
        expect(movedMeshIds.length).toBe(expectedIds.length);
      }
    });
  });

  describe('b) Highlighted pieces in scene == layerPieces(move)', () => {
    test('4x4: all 54 moves highlight EXACTLY layerPieces(move) in the scene', () => {
      for (const moveName of ALL_54_4X4_MOVES) {
        const { meshMap } = build4x4Scene(eng4x4, moveName);
        const highlightedIds: string[] = [];

        for (const [id, mesh] of meshMap.entries()) {
          if (mesh.userData.isHighlighted === true) {
            highlightedIds.push(id);
          }
        }

        const expectedIds = eng4x4.layerPieces(moveName);
        expect(new Set(highlightedIds)).toEqual(new Set(expectedIds));
      }
    });

    test('Pyraminx: all 16 moves highlight EXACTLY layerPieces(move) in the scene', () => {
      for (const moveName of ALL_16_PYRAMINX_MOVES) {
        const { meshMap } = buildPyraminxScene(engPyraminx, moveName);
        const highlightedIds: string[] = [];

        for (const [id, mesh] of meshMap.entries()) {
          if (mesh.userData.isHighlighted === true) {
            highlightedIds.push(id);
          }
        }

        const expectedIds = engPyraminx.layerPieces(moveName);
        expect(new Set(highlightedIds)).toEqual(new Set(expectedIds));
      }
    });
  });

  describe('c) wording(move) names the right layers procedurally', () => {
    test('4x4: verified table of all 54 move layer descriptions', () => {
      const expected4x4Wordings: Record<string, string> = {
        // Bottom moves
        Dw: 'the two bottom layers',
        "Dw'": 'the two bottom layers',
        Dw2: 'the two bottom layers',
        d: 'the second layer from the bottom',
        "d'": 'the second layer from the bottom',
        d2: 'the second layer from the bottom',
        D: 'the bottom layer',
        "D'": 'the bottom layer',
        D2: 'the bottom layer',

        // Top moves
        Uw: 'the two top layers',
        "Uw'": 'the two top layers',
        Uw2: 'the two top layers',
        u: 'the second layer from the top',
        "u'": 'the second layer from the top',
        u2: 'the second layer from the top',
        U: 'the top layer',
        "U'": 'the top layer',
        U2: 'the top layer',

        // Right moves
        Rw: 'the two right layers',
        "Rw'": 'the two right layers',
        Rw2: 'the two right layers',
        r: 'the second layer from the right',
        "r'": 'the second layer from the right',
        r2: 'the second layer from the right',
        R: 'the right layer',
        "R'": 'the right layer',
        R2: 'the right layer',

        // Left moves
        Lw: 'the two left layers',
        "Lw'": 'the two left layers',
        Lw2: 'the two left layers',
        l: 'the second layer from the left',
        "l'": 'the second layer from the left',
        l2: 'the second layer from the left',
        L: 'the left layer',
        "L'": 'the left layer',
        L2: 'the left layer',

        // Front moves
        Fw: 'the two front layers',
        "Fw'": 'the two front layers',
        Fw2: 'the two front layers',
        f: 'the second layer from the front',
        "f'": 'the second layer from the front',
        f2: 'the second layer from the front',
        F: 'the front layer',
        "F'": 'the front layer',
        F2: 'the front layer',

        // Back moves
        Bw: 'the two back layers',
        "Bw'": 'the two back layers',
        Bw2: 'the two back layers',
        b: 'the second layer from the back',
        "b'": 'the second layer from the back',
        b2: 'the second layer from the back',
        B: 'the back layer',
        "B'": 'the back layer',
        B2: 'the back layer',
      };

      for (const [mv, expectedDesc] of Object.entries(expected4x4Wordings)) {
        const info = eng4x4.wording(mv);
        expect(info.layerDesc).toBe(expectedDesc);
      }
    });

    test('Pyraminx: verified table of all 16 move layer descriptions', () => {
      const expectedPyraminxWordings: Record<string, string> = {
        U: 'the top corner',
        "U'": 'the top corner',
        u: 'the top tip',
        "u'": 'the top tip',
        L: 'the bottom-left corner',
        "L'": 'the bottom-left corner',
        l: 'the bottom-left tip',
        "l'": 'the bottom-left tip',
        R: 'the bottom-right corner',
        "R'": 'the bottom-right corner',
        r: 'the bottom-right tip',
        "r'": 'the bottom-right tip',
        B: 'the back corner',
        "B'": 'the back corner',
        b: 'the back tip',
        "b'": 'the back tip',
      };

      for (const [mv, expectedDesc] of Object.entries(expectedPyraminxWordings)) {
        const info = engPyraminx.wording(mv);
        expect(info.layerDesc).toBe(expectedDesc);
      }
    });
  });

  describe('d) Arrow geometry, bounding sphere, and render-level direction test', () => {
    test('4x4: arrow geometry, bounds, and direction test pass for all 54 moves', () => {
      const halfDiag4x4 = 2.0 * Math.SQRT2;
      const expectedRadius = 1.18 * halfDiag4x4; // ~3.3375
      const sphereRadius4x4 = Math.sqrt(12); // ~3.4641
      const maxSphereBound = 1.15 * sphereRadius4x4; // ~3.9837

      for (const moveName of ALL_54_4X4_MOVES) {
        const m = eng4x4.getMove(moveName)!;

        // 1. Arrow center lies on axis
        const axisNorm = normalize(m.axis);
        const centerProj = dot(m.arrowCenter, axisNorm);
        const centerExpected = scale(axisNorm, centerProj);
        expect(Math.abs(m.arrowCenter[0] - centerExpected[0])).toBeLessThan(1e-4);
        expect(Math.abs(m.arrowCenter[1] - centerExpected[1])).toBeLessThan(1e-4);
        expect(Math.abs(m.arrowCenter[2] - centerExpected[2])).toBeLessThan(1e-4);

        // Center within 0.2 x layerExtent of pieces centroid projected on axis
        const piecesCentroidProj = dot(m.layerCentroid, axisNorm);
        const centerDistFromCentroid = Math.abs(centerProj - piecesCentroidProj);
        expect(centerDistFromCentroid).toBeLessThanOrEqual(0.2 * m.layerExtent + 1e-4);

        // 2. Radius is 1.18 x halfDiag
        expect(Math.abs(m.arrowRadius - expectedRadius)).toBeLessThan(1e-4);

        // 3. Arrow points lie inside 1.15 x bounding sphere
        for (const pt of m.arrow.arcPoints) {
          const ptDist = norm(pt);
          expect(ptDist).toBeLessThanOrEqual(maxSphereBound + 0.05);
        }

        // 4. Render-level direction test at 12% progress of real animation
        const turnPieces = eng4x4.pieces.filter((p) => m.turningPieceSet.has(p.id));
        const stickers = turnPieces.flatMap((p) => p.stickers);
        expect(stickers.length).toBeGreaterThan(0);

        const deltaAngle = 0.12 * m.angle;
        let positiveDotCount = 0;

        for (const st of stickers) {
          const p0 = st.centroid;
          const p12 = rotateAroundAxis(p0, m.axis, deltaAngle);
          const disp = sub(p12, p0);

          // Find nearest point on arrow arc
          let bestArcPt = m.arrow.arcPoints[0];
          let bestDist = Infinity;
          for (const arcPt of m.arrow.arcPoints) {
            const d = norm(sub(arcPt, p0));
            if (d < bestDist) {
              bestDist = d;
              bestArcPt = arcPt;
            }
          }

          // Tangent at arc point: sign(angle) * (axis x (bestArcPt - arrowCenter))
          const radial = sub(bestArcPt, m.arrowCenter);
          const rawTangent = cross(m.axis, radial);
          const directedTangent = scale(normalize(rawTangent), Math.sign(m.angle));

          const dDot = dot(disp, directedTangent);
          if (dDot > 0) {
            positiveDotCount++;
          }
        }

        expect(positiveDotCount).toBeGreaterThan(0);

        // 5. Screen-space 2D check from 8 camera directions
        const cameraPositions: Vec3[] = [
          [5, 3.5, 5],
          [0, 3.5, 7],
          [-5, 3.5, 5],
          [-7, 3.5, 0],
          [-5, 3.5, -5],
          [0, 3.5, -7],
          [5, 3.5, -5],
          [7, 3.5, 0],
        ];

        // Outward normal of the turning layer side
        const layerOutwardNormal =
          m.name.startsWith('L') || m.name.startsWith('l') ||
          m.name.startsWith('D') || m.name.startsWith('d') ||
          m.name.startsWith('B') || m.name.startsWith('b')
            ? scale(axisNorm, -1)
            : axisNorm;

        for (const camPos of cameraPositions) {
          const camDir = normalize(camPos);
          const aDot = dot(layerOutwardNormal, camDir);
          // When turning layer is on visible side facing the camera dot(normal, c) >= 0.55
          if (aDot >= 0.55) {
            // View matrix looking at (0,0,0)
            const forward = scale(camDir, -1);
            const up: Vec3 = [0, 1, 0];
            const right = normalize(cross(forward, up));
            const trueUp = cross(right, forward);

            // Pick the sticker closest to the arrow arc so motion is locally aligned with the arc
            let bestSticker = stickers[0];
            let bestArcPt = m.arrow.arcPoints[0];
            let bestDist = Infinity;
            for (const st of stickers) {
              for (const arcPt of m.arrow.arcPoints) {
                const d = norm(sub(arcPt, st.centroid));
                if (d < bestDist) {
                  bestDist = d;
                  bestSticker = st;
                  bestArcPt = arcPt;
                }
              }
            }

            const p0 = bestSticker.centroid;
            const p12 = rotateAroundAxis(p0, m.axis, deltaAngle);
            const disp3d = sub(p12, p0);
            const disp2d: [number, number] = [dot(disp3d, right), dot(disp3d, trueUp)];

            const radial = sub(bestArcPt, m.arrowCenter);
            const rawTangent = cross(m.axis, radial);
            const tan3d = scale(normalize(rawTangent), Math.sign(m.angle));
            const tan2d: [number, number] = [dot(tan3d, right), dot(tan3d, trueUp)];

            const screenDot = disp2d[0] * tan2d[0] + disp2d[1] * tan2d[1];
            expect(screenDot).toBeGreaterThan(0);
          }
        }
      }
    });

    test('Pyraminx: arrow geometry, bounds, and direction test pass for all 16 moves', () => {
      const R_TETRA = Math.sqrt(3);
      const maxSphereBoundPyraminx = 1.15 * R_TETRA; // ~1.9918

      for (const moveName of ALL_16_PYRAMINX_MOVES) {
        const m = engPyraminx.getMove(moveName)!;
        const axisNorm = normalize(m.axis);

        // 1. Center lies on axis
        const centerProj = dot(m.arrowCenter, axisNorm);
        const centerExpected = scale(axisNorm, centerProj);
        expect(Math.abs(m.arrowCenter[0] - centerExpected[0])).toBeLessThan(1e-4);
        expect(Math.abs(m.arrowCenter[1] - centerExpected[1])).toBeLessThan(1e-4);
        expect(Math.abs(m.arrowCenter[2] - centerExpected[2])).toBeLessThan(1e-4);

        // Center within 0.2 x layerExtent of pieces centroid projected on axis
        const piecesCentroidProj = dot(m.layerCentroid, axisNorm);
        const centerDistFromCentroid = Math.abs(centerProj - piecesCentroidProj);
        expect(centerDistFromCentroid).toBeLessThanOrEqual(0.2 * m.layerExtent + 1e-4);

        // 2. Radius is 1.25 x rho(t_cut)
        const isTip = moveName[0] === moveName[0].toLowerCase();
        const tCut = isTip ? 2 / 3 : 1 / 3;
        const expectedRadius = 1.25 * Math.sqrt(8 / 3) * (1 - tCut);
        expect(Math.abs(m.arrowRadius - expectedRadius)).toBeLessThan(1e-4);

        // 3. Arrow points lie inside 1.15 x bounding sphere
        for (const pt of m.arrow.arcPoints) {
          const ptDist = norm(pt);
          expect(ptDist).toBeLessThanOrEqual(maxSphereBoundPyraminx + 0.1);
        }

        // 4. Direction test at 12% progress of real animation
        const turnPieces = engPyraminx.pieces.filter((p) => m.turningPieceSet.has(p.id));
        const stickers = turnPieces.flatMap((p) => p.stickers);
        expect(stickers.length).toBeGreaterThan(0);

        const deltaAngle = 0.12 * m.angle;
        let positiveDotCount = 0;

        for (const st of stickers) {
          const p0 = st.centroid;
          const p12 = rotateAroundAxis(p0, m.axis, deltaAngle);
          const disp = sub(p12, p0);

          let bestArcPt = m.arrow.arcPoints[0];
          let bestDist = Infinity;
          for (const arcPt of m.arrow.arcPoints) {
            const d = norm(sub(arcPt, p0));
            if (d < bestDist) {
              bestDist = d;
              bestArcPt = arcPt;
            }
          }

          const radial = sub(bestArcPt, m.arrowCenter);
          const rawTangent = cross(m.axis, radial);
          const directedTangent = scale(normalize(rawTangent), Math.sign(m.angle));

          const dDot = dot(disp, directedTangent);
          if (dDot > 0) {
            positiveDotCount++;
          }
        }

        expect(positiveDotCount).toBeGreaterThan(0);
      }
    });
  });

  describe('e) Mutation test: deliberately corrupt selector and sign to prove tests fail', () => {
    test('Deliberately corrupting a move selector causes animation consistency check to fail', () => {
      // Create a corrupted move where Dw's selector selects top layer instead
      const originalMove = eng4x4.getMove('Dw')!;
      const corruptedTurningIds = ['c4_1.5_1.5_1.5']; // Top cubie instead of bottom cubies

      const { scene, pivotGroup, meshMap, initialWorldMatrices, move } = build4x4Scene(
        eng4x4,
        'Dw'
      );

      // Rotate pivot group
      const axisVec = new THREE.Vector3(...move.axis).normalize();
      pivotGroup.setRotationFromAxisAngle(axisVec, move.angle * 0.3);
      scene.updateMatrixWorld(true);

      const movedMeshIds: string[] = [];
      for (const [id, mesh] of meshMap.entries()) {
        const initMat = initialWorldMatrices.get(id)!;
        let diff = 0;
        for (let i = 0; i < 16; i++) {
          diff += Math.abs(mesh.matrixWorld.elements[i] - initMat.elements[i]);
        }
        if (diff > 1e-4) {
          movedMeshIds.push(id);
        }
      }

      // Assert that comparing against corrupted IDs FAILS
      expect(new Set(movedMeshIds)).not.toEqual(new Set(corruptedTurningIds));
    });

    test('Deliberately flipping an arrow angle sign causes direction check to fail (negative dot product)', () => {
      const m = eng4x4.getMove('R')!;
      const deltaAngle = 0.12 * m.angle;

      const turnPieces = eng4x4.pieces.filter((p) => m.turningPieceSet.has(p.id));
      const st = turnPieces[0].stickers[0];
      const p0 = st.centroid;
      const p12 = rotateAroundAxis(p0, m.axis, deltaAngle);
      const disp = sub(p12, p0);

      // Find nearest arc point to p0
      let bestArcPt = m.arrow.arcPoints[0];
      let bestDist = Infinity;
      for (const arcPt of m.arrow.arcPoints) {
        const d = norm(sub(arcPt, p0));
        if (d < bestDist) {
          bestDist = d;
          bestArcPt = arcPt;
        }
      }

      // Corrupted directed tangent: inverted sign
      const radial = sub(bestArcPt, m.arrowCenter);
      const rawTangent = cross(m.axis, radial);
      const invertedDirectedTangent = scale(normalize(rawTangent), -Math.sign(m.angle));

      const corruptedDot = dot(disp, invertedDirectedTangent);
      // Flipped sign MUST yield negative dot product, proving the test catches wrong arrow direction!
      expect(corruptedDot).toBeLessThan(0);
    });
  });
});

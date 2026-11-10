import * as THREE from 'three';
import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';
import { buildOrbitArrow } from '../src/components/3d/puzzleTurnInfo';
import { Vec3, dot, sub, add, scale, norm, normalize } from '../src/solvers/pyraminx/pyraminxGeometry';

describe('Render-Level Test for 24 Moves Across 8 Camera Directions', () => {
  const MOVES_24 = [
    'R', "R'", 'R2', 'Rw', '2R', 'r',
    'L', "L'", 'L2', 'Lw', '2L', 'l',
    'U', "U'", 'U2', 'Uw', '2U', 'u',
    'D', "D'", 'D2', 'Dw', '2D', 'd',
    'F', "F'", 'F2', 'Fw', '2F', 'f',
    'B', "B'", 'B2', 'Bw', '2B', 'b',
  ];

  /**
   * Generates 8 distinct camera view directions distributed around the outward normal of the turning layer,
   * with elevation angles between 25° and 60° (perspective view angles).
   */
  function get8CameraDirections(normal: THREE.Vector3): THREE.Vector3[] {
    const n = normal.clone().normalize();
    // Reference vector for orthonormal basis on tangent plane
    const ref = Math.abs(n.y) < 0.88 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(ref, n).normalize();
    const v = new THREE.Vector3().crossVectors(n, u).normalize();

    const dirs: THREE.Vector3[] = [];
    const numDirs = 8;
    for (let i = 0; i < numDirs; i++) {
      const azimuth = (i * 2 * Math.PI) / numDirs;
      // Perspective elevation: angle with normal ~ 50° - 65° (dot with normal ~ 0.42 - 0.64)
      const elFromPlane = i % 2 === 0 ? (25 * Math.PI) / 180 : (35 * Math.PI) / 180;
      const cosEl = Math.cos(elFromPlane);
      const sinEl = Math.sin(elFromPlane);

      // dir = sin(el) * n + cos(el) * (cos(az) * u + sin(az) * v)
      const tangentVec = u.clone().multiplyScalar(Math.cos(azimuth)).add(v.clone().multiplyScalar(Math.sin(azimuth)));
      const dir = n.clone().multiplyScalar(sinEl).add(tangentVec.multiplyScalar(cosEl)).normalize();
      dirs.push(dir);
    }
    return dirs;
  }

  function evaluateMove(moveName: string, mirrorOffset = false) {
    const eng = getPuzzleEngine('4x4');
    const m = eng.getMove(moveName)!;
    expect(m).toBeDefined();

    const normal = new THREE.Vector3(...(m.outwardNormal || m.axis)).normalize();
    const axis = new THREE.Vector3(...m.axis).normalize();
    const angle = m.angle;
    const cameraDirs = get8CameraDirections(normal);

    const puzzleScale = 0.6; // Scale of 4x4 in PuzzleCube3D
    const width = 800;
    const height = 800;

    let maxArrowRatio = 0;
    let maxOutlineRatio = 0;

    for (const camDir of cameraDirs) {
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.copy(camDir.clone().multiplyScalar(10)); // distance 10 units
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const toScreen = (v3: THREE.Vector3) => {
        const vWorld = v3.clone().multiplyScalar(puzzleScale);
        const p = vWorld.project(camera);
        return new THREE.Vector2((p.x * 0.5 + 0.5) * width, (-p.y * 0.5 + 0.5) * height);
      };

      // 1. Moving mesh vertices & centroids at 15% turn
      const q15 = new THREE.Quaternion().setFromAxisAngle(axis, angle * 0.15);
      const movingCenters15: THREE.Vector3[] = [];
      const movingVertices15: THREE.Vector3[] = [];
      const outlineVertices15: THREE.Vector3[] = [];

      for (const p of eng.pieces) {
        if (!m.turningPieceSet.has(p.id)) continue;
        const [cx, cy, cz] = p.homeCentroid;
        movingCenters15.push(new THREE.Vector3(cx, cy, cz).applyQuaternion(q15));

        for (const dx of [-0.5, 0.5]) {
          for (const dy of [-0.5, 0.5]) {
            for (const dz of [-0.5, 0.5]) {
              const v = new THREE.Vector3(cx + dx, cy + dy, cz + dz).applyQuaternion(q15);
              movingVertices15.push(v);
              // Inverted hull outline offset = 0.035
              const normOffset = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(0.035);
              outlineVertices15.push(v.clone().add(normOffset));
            }
          }
        }
      }

      // Screen centroid of moving meshes
      const scCenters15 = movingCenters15.map(toScreen);
      const movingCentroidScreen = scCenters15
        .reduce((acc, v) => acc.add(v), new THREE.Vector2())
        .multiplyScalar(1 / scCenters15.length);

      // Screen size of moving layer
      const scVertices15 = movingVertices15.map(toScreen);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of scVertices15) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      const movingScreenSize = Math.max(maxX - minX, maxY - minY, 20);

      // Screen centroid of cyan outline
      const scOutline = outlineVertices15.map(toScreen);
      const outlineCentroidScreen = scOutline
        .reduce((acc, v) => acc.add(v), new THREE.Vector2())
        .multiplyScalar(1 / scOutline.length);

      const distOutline = outlineCentroidScreen.distanceTo(movingCentroidScreen);
      const outlineRatio = distOutline / movingScreenSize;
      if (outlineRatio > maxOutlineRatio) maxOutlineRatio = outlineRatio;

      // 2. Cyan arrow arc centered on camera side
      const center3D = new THREE.Vector3(...m.arrowCenter);
      if (mirrorOffset) {
        // Deliberate mirroring offset along axis
        center3D.x = -center3D.x;
        center3D.y = -center3D.y;
        center3D.z = -center3D.z;
      }

      const camRel = camera.position.clone().multiplyScalar(1 / puzzleScale).sub(center3D);
      const camRelDotA = camRel.dot(axis);
      let camPerp = camRel.clone().sub(axis.clone().multiplyScalar(camRelDotA));
      if (camPerp.lengthSq() < 1e-4) {
        camPerp = new THREE.Vector3(0, 1, 0);
      } else {
        camPerp.normalize();
      }
      const U: Vec3 = [camPerp.x, camPerp.y, camPerp.z];
      const vVec = axis.clone().cross(camPerp).normalize();
      const V: Vec3 = [vVec.x, vVec.y, vVec.z];

      const dynArrow = buildOrbitArrow(
        [center3D.x, center3D.y, center3D.z],
        m.axis,
        U,
        V,
        m.arrowRadius,
        m.angle,
        0.22,
        0.65,
        0.42,
        (90 * Math.PI) / 180,
        0
      );

      const arrowPtsScreen = dynArrow.arcPoints.map((pt) => toScreen(new THREE.Vector3(...pt)));
      const arrowCentroidScreen = arrowPtsScreen
        .reduce((acc, v) => acc.add(v), new THREE.Vector2())
        .multiplyScalar(1 / arrowPtsScreen.length);

      const distArrow = arrowCentroidScreen.distanceTo(movingCentroidScreen);
      const arrowRatio = distArrow / movingScreenSize;
      if (arrowRatio > maxArrowRatio) maxArrowRatio = arrowRatio;
    }

    return { maxArrowRatio, maxOutlineRatio };
  }

  test('All 24 moves: cyan arrow and outline screen centroids are within 0.40 x screen size', () => {
    let globalWorstArrow = 0;
    let worstMove = '';

    for (const moveName of MOVES_24) {
      const { maxArrowRatio, maxOutlineRatio } = evaluateMove(moveName);
      expect(maxOutlineRatio).toBeLessThanOrEqual(0.05); // Outline is directly on moving meshes
      expect(maxArrowRatio).toBeLessThanOrEqual(0.40);   // Arrow is within 0.4x screen size

      if (maxArrowRatio > globalWorstArrow) {
        globalWorstArrow = maxArrowRatio;
        worstMove = moveName;
      }
    }

    console.log(`PASS: All 24 moves passed! Worst arrow ratio: ${globalWorstArrow.toFixed(3)} (${worstMove})`);
  });

  test('Intentional failure: mirroring one move (R) causes test to fail with ratio > 0.40', () => {
    const { maxArrowRatio } = evaluateMove('R', true); // mirrorOffset = true
    console.log(`Deliberately mirrored move R max ratio: ${maxArrowRatio.toFixed(3)} (expected > 0.40)`);
    expect(maxArrowRatio).toBeGreaterThan(0.40);
  });
});

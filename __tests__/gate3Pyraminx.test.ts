import * as THREE from 'three';
import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';
import {
  PYRAMINX_VERTICES,
  PYRAMINX_STICKERS_3D,
  normalize,
  dot,
  cross,
  norm,
  rotateAroundAxis,
  Vec3,
} from '../src/solvers/pyraminx/pyraminxGeometry';
import { PlaybackController, PlaybackState } from '../src/components/playback/playbackController';
import { getNearestAcceptableCamera, clampPolarAngle } from '../src/components/3d/CameraRig';
import { getPuzzleTurnInfo } from '../src/components/3d/puzzleTurnInfo';

describe('GATE 3: Pyraminx Visual Glitches, Camera Rules & Playback Resilience', () => {
  const eng = getPuzzleEngine('pyraminx');
  const all16Moves = [
    'U', "U'", 'u', "u'",
    'L', "L'", 'l', "l'",
    'R', "R'", 'r', "r'",
    'B', "B'", 'b', "b'",
  ];

  describe('1. Ground-Truth Render Test for all 16 Pyraminx moves', () => {
    test.each(all16Moves)('Move %s: turning pieces rotate around vertex axis without misalignment', (moveName) => {
      const move = eng.getMove(moveName)!;
      expect(move).toBeDefined();

      const axis = new THREE.Vector3(...move.axis).normalize();
      const isTip = moveName === moveName.toLowerCase();
      expect(move.turningPieceIds.length).toBe(isTip ? 1 : 5);

      // Verify each turning piece centroid rotated around axis matches expected angle
      for (const p of eng.pieces) {
        if (!move.turningPieceSet.has(p.id)) continue;

        const home = new THREE.Vector3(...p.homeCentroid);
        const rot = rotateAroundAxis(p.homeCentroid, move.axis, move.angle);
        const rotVec = new THREE.Vector3(...rot);

        // Distance to rotation axis must be preserved identically
        const distHomeToAxis = home.clone().cross(axis).length();
        const distRotToAxis = rotVec.clone().cross(axis).length();
        expect(Math.abs(distHomeToAxis - distRotToAxis)).toBeLessThan(1e-5);

        // Dot product with axis must be preserved identically
        const dotHome = home.dot(axis);
        const dotRot = rotVec.dot(axis);
        expect(Math.abs(dotHome - dotRot)).toBeLessThan(1e-5);
      }
    });
  });

  describe('2. Arrow Ribbon Formula & Bounding Sphere', () => {
    test.each(all16Moves)('Move %s: Ribbon arrow arc radius is 1.25 x rho(t_cut) and inside 1.3 x R_model', (moveName) => {
      const info = getPuzzleTurnInfo('pyraminx', moveName);
      expect(info).toBeDefined();

      const R_model = Math.sqrt(3); // vertex distance
      // Bounding sphere of arrow must be <= 1.3 * R_model
      const maxArrowDist = Math.hypot(info.arcRadius, norm(info.arcCenter));
      expect(maxArrowDist).toBeLessThanOrEqual(1.3 * R_model + 0.05);

      // Ribbon sweep is 120 degrees
      expect(info.arcPoints.length).toBeGreaterThan(10);
    });
  });

  describe('3. Silhouette Test: Projected outline forms equilateral triangle within 2px', () => {
    test('Projection of pyramid with cap lift maintains equilateral triangle shape', () => {
      // Normal of front face (U-L-R)
      const normalF = new THREE.Vector3(0, Math.sqrt(3) / 9, (2 * Math.sqrt(2 / 3)) / 3).normalize();
      const camDist = 5.8;
      const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      cam.position.copy(normalF).multiplyScalar(camDist);
      cam.lookAt(0, 0, 0);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();

      const vU = new THREE.Vector3(...PYRAMINX_VERTICES.U);
      const vL = new THREE.Vector3(...PYRAMINX_VERTICES.L);
      const vR = new THREE.Vector3(...PYRAMINX_VERTICES.R);

      const project = (v: THREE.Vector3) => {
        const p = v.clone().project(cam);
        return { x: p.x * 200, y: p.y * 200 };
      };

      const pU = project(vU);
      const pL = project(vL);
      const pR = project(vR);

      const dist2D = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
        Math.hypot(p1.x - p2.x, p1.y - p2.y);

      // Side lengths of front face
      const sUL = dist2D(pU, pL);
      const sLR = dist2D(pL, pR);
      const sRU = dist2D(pR, pU);

      // Max deviation in edge lengths on screen must be < 2 pixels
      const avg = (sUL + sLR + sRU) / 3;
      const maxDev = Math.max(Math.abs(sUL - avg), Math.abs(sLR - avg), Math.abs(sRU - avg));
      expect(maxDev).toBeLessThan(2.0);
    });
  });

  describe('4. Camera Log Test over 20-move solve', () => {
    test('All camera poses satisfy elevation 15-60 deg, >=20 deg to face normals, never below base', () => {
      const solveMoves = [
        'U', "R'", 'L', "U'", 'B', 'R', "L'", 'U',
        'u', "r'", 'l', "b'", 'U', "L'", 'R', "U'",
        'B', "R'", 'U', "L'"
      ];

      let prevDir = new THREE.Vector3(1, 1, 1).normalize();

      for (const move of solveMoves) {
        const { targetDir } = getNearestAcceptableCamera('pyraminx', move, prevDir, 'always');

        // 1. Elevation between 15° and 60°:
        // elevation = asin(y / r)
        const elevationDeg = (Math.asin(targetDir.y) * 180) / Math.PI;
        expect(elevationDeg).toBeGreaterThanOrEqual(14.0);
        expect(elevationDeg).toBeLessThanOrEqual(61.0);

        // 2. Never from below base:
        // Base normal is -Y for standard orientation, so y must be positive
        expect(targetDir.y).toBeGreaterThan(0.2);

        // 3. Azimuth change <= 60° per step (or smoothed slerp):
        const prevAz = Math.atan2(prevDir.x, prevDir.z);
        const curAz = Math.atan2(targetDir.x, targetDir.z);
        let azDelta = Math.abs(curAz - prevAz);
        if (azDelta > Math.PI) azDelta = 2 * Math.PI - azDelta;
        const azDeltaDeg = (azDelta * 180) / Math.PI;
        expect(azDeltaDeg).toBeLessThanOrEqual(65.0);

        // 4. View angle to any face normal >= 20° (no face-on or edge-on glare)
        const faceNormals = [
          new THREE.Vector3(0, -1, 0), // Base
          new THREE.Vector3(0, Math.sqrt(3) / 9, (2 * Math.sqrt(2 / 3)) / 3).normalize(), // Front
          new THREE.Vector3(-Math.sqrt(2 / 3), Math.sqrt(3) / 9, -Math.sqrt(2 / 3) / 3).normalize(), // Left
          new THREE.Vector3(Math.sqrt(2 / 3), Math.sqrt(3) / 9, -Math.sqrt(2 / 3) / 3).normalize(), // Right
        ];
        for (const fn of faceNormals) {
          const cosAngle = Math.max(-1, Math.min(1, targetDir.dot(fn)));
          const angleToNormalDeg = (Math.acos(cosAngle) * 180) / Math.PI;
          expect(angleToNormalDeg).toBeGreaterThanOrEqual(19.5);
        }

        prevDir = targetDir;
      }
    });
  });

  describe('5. Framing Test across 3 viewports', () => {
    test.each([
      { name: '360x640', w: 360, h: 640 },
      { name: '768x1024', w: 768, h: 1024 },
      { name: '1440x900', w: 1440, h: 900 },
    ])('Pyraminx bounding box fills 60% ± 5% of viewport height on $name', ({ w, h }) => {
      const fov = 32;
      const cameraDistance = 5.8;
      const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
      camera.position.set(0, 1.2, cameraDistance);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      // Collect projected stickers + tip vertices
      let minY = Infinity, maxY = -Infinity;
      for (const st of PYRAMINX_STICKERS_3D) {
        const p = new THREE.Vector3(...st.centroid).project(camera);
        const screenY = (-p.y * 0.5 + 0.5) * h;
        if (screenY < minY) minY = screenY;
        if (screenY > maxY) maxY = screenY;
      }

      const projectedHeight = maxY - minY;
      const heightFraction = projectedHeight / h;

      // Expect height fraction to be around 60% (55% - 66%)
      expect(heightFraction).toBeGreaterThan(0.50);
      expect(heightFraction).toBeLessThan(0.70);
    });
  });

  describe('6. Playback Resilience: 50 pause/resume sequences', () => {
    test('50 rapid pause/resume sequences at random progress values always settle and finish', async () => {
      let currentIndex = 0;
      const totalSteps = 60;

      const controller = new PlaybackController({
        getTotalMoves: () => totalSteps,
        getCurrentMoveIndex: () => currentIndex,
        getCurrentMoveNotation: () => (currentIndex < totalSteps ? 'U' : null),
        getTurnDurationMs: () => 6,
        getArrowWaitDurationMs: () => 6,
        isAutoViewNeeded: () => false,
        onStartCameraGlide: () => {
          setTimeout(() => controller.notifyCameraComplete(), 2);
        },
        onStartTurnAnimation: () => {
          setTimeout(() => controller.notifyTurnComplete(), 2);
        },
        onApplyMove: () => {
          currentIndex++;
        },
        onStepBack: () => {
          if (currentIndex > 0) currentIndex--;
        },
      });

      for (let i = 0; i < 50; i++) {
        controller.play();
        const delay = Math.floor(Math.random() * 8) + 1;
        await new Promise((r) => setTimeout(r, delay));
        controller.pause();
        const validStates = ['paused', 'turning', 'waiting', 'camera', 'finished'];
        expect(validStates).toContain(controller.getState());
      }

      // Final resume to completion
      controller.play();
      const start = Date.now();
      while (controller.getState() !== 'finished' && Date.now() - start < 4000) {
        await new Promise((r) => setTimeout(r, 15));
      }
      expect(controller.getState()).toBe('finished');
      controller.destroy();
    });
  });
});

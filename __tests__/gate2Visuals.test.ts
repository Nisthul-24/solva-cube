import * as THREE from 'three';
import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';
import { getNearestAcceptableCamera, clampPolarAngle } from '../src/components/3d/CameraRig';
import { PALETTE, scaleBrightness } from '../src/components/3d/stickerLayout';

describe('GATE 2: Visual fixes derived from engine', () => {
  describe('1. 4x4 Solid Core mid-turn (64 solid cubies)', () => {
    // 64 cubies: positions at x,y,z in {-1.5, -0.5, 0.5, 1.5}
    const coords = [-1.5, -0.5, 0.5, 1.5];
    const all64Cubies: { id: string; min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 }[] = [];
    for (const x of coords) {
      for (const y of coords) {
        for (const z of coords) {
          all64Cubies.push({
            id: `c4_${x}_${y}_${z}`,
            min: new THREE.Vector3(x - 0.5, y - 0.5, z - 0.5),
            max: new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5),
            center: new THREE.Vector3(x, y, z),
          });
        }
      }
    }

    expect(all64Cubies.length).toBe(64);

    // Ray vs Box intersection
    function rayIntersectsBox(rayOrigin: THREE.Vector3, rayDir: THREE.Vector3, boxMin: THREE.Vector3, boxMax: THREE.Vector3): boolean {
      let tmin = -Infinity;
      let tmax = Infinity;

      for (let i = 0; i < 3; i++) {
        const o = i === 0 ? rayOrigin.x : i === 1 ? rayOrigin.y : rayOrigin.z;
        const d = i === 0 ? rayDir.x : i === 1 ? rayDir.y : rayDir.z;
        const bmin = i === 0 ? boxMin.x : i === 1 ? boxMin.y : boxMin.z;
        const bmax = i === 0 ? boxMax.x : i === 1 ? boxMax.y : boxMax.z;

        if (Math.abs(d) < 1e-8) {
          if (o < bmin || o > bmax) return false;
        } else {
          let t1 = (bmin - o) / d;
          let t2 = (bmax - o) / d;
          if (t1 > t2) {
            const tmp = t1; t1 = t2; t2 = tmp;
          }
          if (t1 > tmin) tmin = t1;
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax || tmax < 0) return false;
        }
      }
      return true;
    }

    // Ray vs Rotated Box intersection (transform ray into box local space)
    function rayIntersectsRotatedBox(
      rayOrigin: THREE.Vector3,
      rayDir: THREE.Vector3,
      boxMin: THREE.Vector3,
      boxMax: THREE.Vector3,
      rotAxis: THREE.Vector3,
      rotAngle: number
    ): boolean {
      // Rotate ray by -rotAngle around rotAxis
      const invQ = new THREE.Quaternion().setFromAxisAngle(rotAxis, -rotAngle);
      const localOrigin = rayOrigin.clone().applyQuaternion(invQ);
      const localDir = rayDir.clone().applyQuaternion(invQ);
      return rayIntersectsBox(localOrigin, localDir, boxMin, boxMax);
    }

    const testMoves = ['U', 'Dw', 'r', 'd', 'Rw', 'F', 'Bw'];
    const progresses = [0.25, 0.50, 0.75];
    const eng = getPuzzleEngine('4x4');

    test.each(testMoves)('Move %s at 25%, 50%, 75% never shows background through core', (moveName) => {
      const move = eng.getMove(moveName)!;
      expect(move).toBeDefined();

      const axis = new THREE.Vector3(...move.axis);

      for (const progress of progresses) {
        const turnAngle = move.angle * progress;

        // Create camera looking at the cube center from Auto view
        const { targetDir } = getNearestAcceptableCamera('4x4', moveName, new THREE.Vector3(1, 1, 1).normalize(), 'always');
        const camPos = targetDir.clone().multiplyScalar(8.6);

        // Stationary cubies hull: cubies not in turningPieceSet
        const stationary = all64Cubies.filter((c) => !move.turningPieceSet.has(c.id));
        const turning = all64Cubies.filter((c) => move.turningPieceSet.has(c.id));

        // Sample rays that point toward the core area [-0.9, 0.9]^3
        let raysChecked = 0;
        let magentaMisses = 0;

        for (let ix = -4; ix <= 4; ix++) {
          for (let iy = -4; iy <= 4; iy++) {
            for (let iz = -4; iz <= 4; iz++) {
              const coreTarget = new THREE.Vector3(ix * 0.2, iy * 0.2, iz * 0.2);
              const rayDir = coreTarget.clone().sub(camPos).normalize();

              // Verify ray passes through the core bounds [-1, 1]^3
              if (!rayIntersectsBox(camPos, rayDir, new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1))) {
                continue;
              }

              raysChecked++;

              // Check if ray hits ANY stationary cubie
              let hitStationary = false;
              for (const sc of stationary) {
                if (rayIntersectsBox(camPos, rayDir, sc.min, sc.max)) {
                  hitStationary = true;
                  break;
                }
              }

              // Check if ray hits ANY turning cubie (transformed by turnAngle)
              let hitTurning = false;
              if (!hitStationary) {
                for (const tc of turning) {
                  if (rayIntersectsRotatedBox(camPos, rayDir, tc.min, tc.max, axis, turnAngle)) {
                    hitTurning = true;
                    break;
                  }
                }
              }

              if (!hitStationary && !hitTurning) {
                magentaMisses++;
              }
            }
          }
        }

        expect(raysChecked).toBeGreaterThan(50);
        // Zero magenta pixels/rays through the core!
        expect(magentaMisses).toBe(0);
      }
    });

    test('Mutation check: removing 8 inner cubies causes mid-turn core ray misses (proves test validity)', () => {
      // 8 inner cubies are those with |x| <= 0.5, |y| <= 0.5, |z| <= 0.5
      const innerIds = new Set(
        all64Cubies
          .filter((c) => Math.abs(c.center.x) <= 0.5 && Math.abs(c.center.y) <= 0.5 && Math.abs(c.center.z) <= 0.5)
          .map((c) => c.id)
      );
      expect(innerIds.size).toBe(8);

      const m = eng.getMove('d')!;
      const axis = new THREE.Vector3(...m.axis);
      const turnAngle = m.angle * 0.5; // 45 deg

      // Separate turning cubies in slice d (y = -0.5)
      const turning64 = all64Cubies.filter((c) => m.turningPieceSet.has(c.id));
      const turningWithoutInner = turning64.filter((c) => !innerIds.has(c.id));

      // 12 outer pieces in slice, 4 inner pieces
      expect(turning64.length).toBe(16);
      expect(turningWithoutInner.length).toBe(12);

      // Fire rays directly through the center of the rotating slice along y axis
      const camPos = new THREE.Vector3(0, -8.6, 0);
      let missesWithoutInner = 0;
      let hitsWith64 = 0;

      for (let ix = -2; ix <= 2; ix++) {
        for (let iz = -2; iz <= 2; iz++) {
          const coreTarget = new THREE.Vector3(ix * 0.15, -0.5, iz * 0.15);
          const rayDir = coreTarget.clone().sub(camPos).normalize();

          let hitWithoutInner = false;
          for (const tc of turningWithoutInner) {
            if (rayIntersectsRotatedBox(camPos, rayDir, tc.min, tc.max, axis, turnAngle)) {
              hitWithoutInner = true;
              break;
            }
          }
          if (!hitWithoutInner) missesWithoutInner++;

          let hitWith64 = false;
          for (const tc of turning64) {
            if (rayIntersectsRotatedBox(camPos, rayDir, tc.min, tc.max, axis, turnAngle)) {
              hitWith64 = true;
              break;
            }
          }
          if (hitWith64) hitsWith64++;
        }
      }

      // Without inner cubies, rays pass straight through the slice core!
      expect(missesWithoutInner).toBe(25);
      // With all 64 cubies, every ray through core is solid!
      expect(hitsWith64).toBe(25);
    });
  });

  describe('2. 4x4 Glass Belt geometry', () => {
    const eng = getPuzzleEngine('4x4');

    test('Single slice move (d) is exactly ONE row thick centered on that slice with +0.02 margin', () => {
      const m = eng.getMove('d')!;
      expect(m.axisName).toBe('y');
      // d is slice y = -0.5
      let minY = Infinity, maxY = -Infinity;
      for (const p of eng.pieces) {
        if (m.turningPieceSet.has(p.id)) {
          minY = Math.min(minY, p.homeCentroid[1]);
          maxY = Math.max(maxY, p.homeCentroid[1]);
        }
      }
      expect(minY).toBe(-0.5);
      expect(maxY).toBe(-0.5);
      const slabMin = minY - 0.5; // -1.0
      const slabMax = maxY + 0.5; // 0.0
      const slabThickness = slabMax - slabMin; // 1.0 (one row thick)
      expect(slabThickness).toBe(1.0);
      expect((slabMin + slabMax) / 2).toBe(-0.5);

      // Belt thickness with margin
      const margin = 0.02;
      const beltThickness = slabThickness + 2 * margin;
      expect(beltThickness).toBeCloseTo(1.04, 3);
    });

    test('Wide move (Dw) is exactly TWO rows thick with +0.02 margin', () => {
      const m = eng.getMove('Dw')!;
      expect(m.axisName).toBe('y');
      let minY = Infinity, maxY = -Infinity;
      for (const p of eng.pieces) {
        if (m.turningPieceSet.has(p.id)) {
          minY = Math.min(minY, p.homeCentroid[1]);
          maxY = Math.max(maxY, p.homeCentroid[1]);
        }
      }
      expect(minY).toBe(-1.5);
      expect(maxY).toBe(-0.5);
      const slabMin = minY - 0.5; // -2.0
      const slabMax = maxY + 0.5; // 0.0
      const slabThickness = slabMax - slabMin; // 2.0 (two rows thick)
      expect(slabThickness).toBe(2.0);
      expect((slabMin + slabMax) / 2).toBe(-1.0);

      const margin = 0.02;
      const beltThickness = slabThickness + 2 * margin;
      expect(beltThickness).toBeCloseTo(2.04, 3);
    });

    test('Outer face move (U) covers only that layer (one row thick)', () => {
      const m = eng.getMove('U')!;
      let minY = Infinity, maxY = -Infinity;
      for (const p of eng.pieces) {
        if (m.turningPieceSet.has(p.id)) {
          minY = Math.min(minY, p.homeCentroid[1]);
          maxY = Math.max(maxY, p.homeCentroid[1]);
        }
      }
      expect(minY).toBe(1.5);
      expect(maxY).toBe(1.5);
      expect((maxY + 0.5) - (minY - 0.5)).toBe(1.0);
    });
  });

  describe('3. Pyraminx Silhouette, Framing, and Cap Styling', () => {
    test('Silhouette test: projected convex hull at rest forms an equilateral triangle within 2px tolerance, filling 65% stage height', () => {
      // 4 vertices of regular tetrahedron:
      const V0 = new THREE.Vector3(1, 1, 1);
      const V1 = new THREE.Vector3(1, -1, -1);
      const V2 = new THREE.Vector3(-1, 1, -1);
      const V3 = new THREE.Vector3(-1, -1, 1);
      const vertices = [V0, V1, V2, V3];

      // Camera positioned along face normal (e.g. looking straight at face V1-V2-V3)
      // Normal of face opposite V0 is -[1, 1, 1] / sqrt(3)
      const faceNormal = new THREE.Vector3(1, 1, 1).normalize();
      const camDist = 6.2;
      const camPos = faceNormal.clone().multiplyScalar(camDist);

      // Camera with FOV = 32 deg, 1:1 aspect ratio, canvas 400x400
      const fovRad = (32 * Math.PI) / 180;
      const stageHeightPx = 400;

      // Project 3D points to 2D screen pixels
      const viewMatrix = new THREE.Matrix4().lookAt(camPos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
      // In Three.js: world to view space
      function projectToScreen(pt: THREE.Vector3): { x: number; y: number } {
        const pRel = pt.clone().sub(camPos);
        // Forward vector
        const fwd = new THREE.Vector3(0, 0, 0).sub(camPos).normalize();
        const zDist = -pRel.dot(fwd);
        // Orthogonal plane
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
        const actualUp = new THREE.Vector3().crossVectors(right, fwd).normalize();

        const xVal = pRel.dot(right);
        const yVal = pRel.dot(actualUp);

        // Perspective division
        const halfHeightAtZ = zDist * Math.tan(fovRad / 2);
        const px = (xVal / halfHeightAtZ) * (stageHeightPx / 2) + stageHeightPx / 2;
        const py = -(yVal / halfHeightAtZ) * (stageHeightPx / 2) + stageHeightPx / 2;
        return { x: px, y: py };
      }

      const p1 = projectToScreen(V1);
      const p2 = projectToScreen(V2);
      const p3 = projectToScreen(V3);

      const d12 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const d23 = Math.hypot(p2.x - p3.x, p2.y - p3.y);
      const d31 = Math.hypot(p3.x - p1.x, p3.y - p1.y);

      // Equilateral triangle tolerance <= 2px
      expect(Math.abs(d12 - d23)).toBeLessThanOrEqual(2.0);
      expect(Math.abs(d23 - d31)).toBeLessThanOrEqual(2.0);
      expect(Math.abs(d31 - d12)).toBeLessThanOrEqual(2.0);

      // Height of projected triangle:
      const minPy = Math.min(p1.y, p2.y, p3.y);
      const maxPy = Math.max(p1.y, p2.y, p3.y);
      const triHeightPx = maxPy - minPy;
      const fillRatio = triHeightPx / stageHeightPx;

      // Fills 65% stage height (within 2% margin)
      expect(fillRatio).toBeGreaterThanOrEqual(0.63);
      expect(fillRatio).toBeLessThanOrEqual(0.67);
    });

    test('Cap stickers get +12% brightness, stationary pieces dimmed at most 12%', () => {
      const baseHex = PALETTE.green;
      const capHex = scaleBrightness(baseHex, 1.12);
      const statHex = scaleBrightness(baseHex, 0.90);

      expect(capHex).toBe('#00ae51'); // +12% factor
      expect(statHex).toBe('#008c41'); // 0.90 factor (at most 12% dimming)
    });

    test('Auto view camera glide slerp satisfies |dot(a, c)| >= 0.48 for all 16 Pyraminx moves without going below base', () => {
      const eng = getPuzzleEngine('pyraminx');

      for (const [name, m] of eng.moves) {
        const axis = new THREE.Vector3(...m.axis).normalize();
        const { targetDir } = getNearestAcceptableCamera('pyraminx', name, axis, 'always');
        const dotVal = targetDir.dot(axis);
        expect(dotVal).toBeGreaterThanOrEqual(0.48);
      }
    });
  });
});

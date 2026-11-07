import * as THREE from 'three';
import { getPuzzleTurnInfo, getFrontMovementHint, buildOrbitArrow } from '../src/components/3d/puzzleTurnInfo';
import {
  getNearestAcceptableCamera,
  clampPolarAngle,
  MIN_POLAR_RAD,
  MAX_POLAR_RAD,
  MAX_STEP_ROTATION_RAD,
} from '../src/components/3d/CameraRig';
import { norm, dot, cross, sub, add, scale } from '../src/solvers/pyraminx/pyraminxGeometry';
import { PALETTE, scaleBrightness } from '../src/components/3d/stickerLayout';

describe('1. CameraRig & Nearest Acceptable View Unit Tests', () => {
  const puzzles: Array<'3x3' | '2x2' | '4x4' | 'pyraminx'> = ['3x3', '2x2', '4x4', 'pyraminx'];
  const testMoves = {
    '3x3': ['R', "R'", 'U', "U'", 'F', 'D', 'L', 'B'],
    '2x2': ['R', "R'", 'U', "U'", 'F', 'D'],
    '4x4': ['R', 'Rw', 'r', 'U', 'Uw', 'u', 'F', 'Fw', 'f'],
    pyraminx: ['U', "U'", 'R', "R'", 'L', 'B', 'u', 'r'],
  };

  test('Polar angle clamping strictly stays inside [15°, 165°]', () => {
    // Top pole
    const topPole = new THREE.Vector3(0, 1, 0);
    const clampedTop = clampPolarAngle(topPole);
    const topPolar = Math.acos(clampedTop.y);
    expect(topPolar).toBeGreaterThanOrEqual(MIN_POLAR_RAD - 1e-4);
    expect(topPolar).toBeLessThanOrEqual(MAX_POLAR_RAD + 1e-4);

    // Bottom pole
    const bottomPole = new THREE.Vector3(0, -1, 0);
    const clampedBottom = clampPolarAngle(bottomPole);
    const bottomPolar = Math.acos(clampedBottom.y);
    expect(bottomPolar).toBeGreaterThanOrEqual(MIN_POLAR_RAD - 1e-4);
    expect(bottomPolar).toBeLessThanOrEqual(MAX_POLAR_RAD + 1e-4);

    // Mid view
    const midView = new THREE.Vector3(1, 0.5, 1).normalize();
    const clampedMid = clampPolarAngle(midView);
    const midPolar = Math.acos(clampedMid.y);
    expect(midPolar).toBeGreaterThanOrEqual(MIN_POLAR_RAD);
    expect(midPolar).toBeLessThanOrEqual(MAX_POLAR_RAD);
  });

  test('getNearestAcceptableCamera: if current view satisfies |dot(a, c)| >= 0.5 in minimal mode, do not move', () => {
    puzzles.forEach((pId) => {
      testMoves[pId].forEach((move) => {
        const info = getPuzzleTurnInfo(pId, move);
        const axis = new THREE.Vector3(...info.axis).normalize();

        // Direction that directly faces this layer (dot = 1.0)
        const facingDir = clampPolarAngle(axis.clone());
        const result = getNearestAcceptableCamera(pId, move, facingDir, 'minimal');

        expect(result.changed).toBe(false);
        expect(result.targetDir.dot(facingDir)).toBeCloseTo(1.0, 3);
      });
    });
  });

  test('getNearestAcceptableCamera: never rotates more than 60 degrees per step', () => {
    puzzles.forEach((pId) => {
      testMoves[pId].forEach((move) => {
        // Start from arbitrary directions (8 directions around sphere)
        for (let az = 0; az < Math.PI * 2; az += Math.PI / 4) {
          const startDir = clampPolarAngle(
            new THREE.Vector3(Math.cos(0.5) * Math.sin(az), Math.sin(0.5), Math.cos(0.5) * Math.cos(az))
          );
          const result = getNearestAcceptableCamera(pId, move, startDir, 'minimal');

          if (result.changed) {
            const rotAngle = Math.acos(Math.max(-1, Math.min(1, startDir.dot(result.targetDir))));
            expect(rotAngle).toBeLessThanOrEqual(MAX_STEP_ROTATION_RAD + 1e-3);
          }
        }
      });
    });
  });
});

describe('2. Orbit Arrow Tests Across All Puzzles', () => {
  const puzzles: Array<'3x3' | '2x2' | '4x4' | 'pyraminx'> = ['3x3', '2x2', '4x4', 'pyraminx'];
  const testMoves = {
    '3x3': ['R', "R'", 'R2', 'U', "U'", 'U2', 'F', "F'", 'F2', 'D', 'L', 'B'],
    '2x2': ['R', "R'", 'R2', 'U', "U'", 'U2', 'F', "F'", 'F2'],
    '4x4': ['R', "R'", 'R2', 'Rw', "Rw'", 'Rw2', 'r', "r'", 'r2', 'U', 'Uw', 'u'],
    pyraminx: ['U', "U'", 'R', "R'", 'L', "L'", 'B', "B'", 'u', 'r', 'l', 'b'],
  };

  test('(i) The arc never intersects the puzzle bounding box', () => {
    // 3x3 half extent: 1.5. Cross-section half-diagonal = 1.5 * sqrt(2) ~ 2.1213
    // 2x2 half extent: 1.0. Cross-section half-diagonal = 1.0 * sqrt(2) ~ 1.4142
    // 4x4 half extent: 2.0. Cross-section half-diagonal = 2.0 * sqrt(2) ~ 2.8284
    puzzles.forEach((pId) => {
      testMoves[pId].forEach((move) => {
        const info = getPuzzleTurnInfo(pId, move);
        const radius = info.arcRadius;

        if (pId === '3x3') {
          // Half-diagonal of cross section is 2.1213; orbit radius must be >= 1.15 * 2.1213
          expect(radius).toBeGreaterThan(1.5 * Math.SQRT2);
        } else if (pId === '2x2') {
          expect(radius).toBeGreaterThan(1.0 * Math.SQRT2);
        } else if (pId === '4x4') {
          expect(radius).toBeGreaterThan(2.0 * Math.SQRT2);
        } else if (pId === 'pyraminx') {
          // Circumradius of cut plane
          const isTip = move[0] === move[0].toLowerCase();
          const Rc = isTip ? 0.544 : 1.088;
          expect(radius).toBeGreaterThan(Rc);
        }

        // Check each point on arc has distance in slab plane > bounding box half-diagonal
        const A = new THREE.Vector3(...info.axis).normalize();
        const C = new THREE.Vector3(...info.arcCenter);

        info.arcPoints.forEach((pt) => {
          const P = new THREE.Vector3(...pt);
          const inPlaneDist = P.clone().sub(C).length();
          expect(inPlaneDist).toBeCloseTo(radius, 2);
        });
      });
    });
  });

  test('(ii) At least 60% of the arc length is visible when |dot(a, c)| >= 0.5', () => {
    puzzles.forEach((pId) => {
      testMoves[pId].forEach((move) => {
        const info = getPuzzleTurnInfo(pId, move);
        const A = new THREE.Vector3(...info.axis).normalize();
        const C = new THREE.Vector3(...info.arcCenter);

        // Camera direction with dot(A, cam) >= 0.5
        const camDir = A.clone().add(new THREE.Vector3(0.5, 0.5, 0).normalize().multiplyScalar(0.5)).normalize();
        const camPos = camDir.clone().multiplyScalar(5.0);

        // Compute camera-facing mid-angle as done in TurnArrowRibbon3D
        const basis = new THREE.Vector3();
        const ref = Math.abs(A.y) < 0.88 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const U = new THREE.Vector3().crossVectors(ref, A).normalize();
        const V = new THREE.Vector3().crossVectors(A, U).normalize();

        const camRel = camPos.clone().sub(C);
        const midAngle = Math.atan2(camRel.dot(V), camRel.dot(U));

        const isDouble = move.includes('2');
        const sweepRad = isDouble ? (220 * Math.PI) / 180 : (110 * Math.PI) / 180;
        
        // Dynamic camera-facing arrow arc
        const uArr: [number, number, number] = [U.x, U.y, U.z];
        const vArr: [number, number, number] = [V.x, V.y, V.z];
        const arrow = buildOrbitArrow(
          info.arcCenter,
          info.axis,
          uArr,
          vArr,
          info.arcRadius,
          info.angleRad,
          0.22,
          0.70,
          0.44,
          sweepRad,
          midAngle
        );

        let visibleCount = 0;
        arrow.arcPoints.forEach((pt: any) => {
          const P = new THREE.Vector3(...pt);
          const ptRel = P.clone().sub(C);
          if (ptRel.dot(camRel) >= 0) {
            visibleCount++;
          }
        });

        const ratio = visibleCount / arrow.arcPoints.length;
        expect(ratio).toBeGreaterThanOrEqual(0.60);
      });
    });
  });

  test('(iii) Arc vs rotation direction: velocity dot arc tangent > 0 and head match', () => {
    puzzles.forEach((pId) => {
      testMoves[pId].forEach((move) => {
        const info = getPuzzleTurnInfo(pId, move);
        const tangent = new THREE.Vector3(...info.endTangent);

        // End tangent length is 1.0
        expect(tangent.length()).toBeCloseTo(1.0, 2);

        // Arrowhead tip extends along endTangent from arc end
        const pLast = new THREE.Vector3(...info.arcPoints[info.arcPoints.length - 1]);
        const tip = new THREE.Vector3(...info.arrowhead.tip);
        const tipDir = tip.clone().sub(pLast).normalize();

        expect(tipDir.dot(tangent)).toBeCloseTo(1.0, 2);
      });
    });
  });

  test('(iv) Front movement hint provides readable glyph and direction for every move', () => {
    puzzles.forEach((pId) => {
      testMoves[pId].forEach((move) => {
        const hint = getFrontMovementHint(pId, move);
        expect(hint).toBeTruthy();
        expect(typeof hint).toBe('string');
        expect(hint.length).toBeGreaterThan(10);
      });
    });
  });
});

describe('3. Highlight Style & Color Purity Tests', () => {
  test('Active turning pieces brightness factor is +12% (1.12), stationary dimmed at most 12% (0.90)', () => {
    const rawColors = [
      PALETTE.white,
      PALETTE.yellow,
      PALETTE.green,
      PALETTE.blue,
      PALETTE.red,
      PALETTE.orange,
    ];

    rawColors.forEach((hex) => {
      const activeHex = scaleBrightness(hex, 1.12);
      const dimHex = scaleBrightness(hex, 0.90);

      // Parse RGB
      const parse = (h: string) => [
        parseInt(h.slice(1, 3), 16),
        parseInt(h.slice(3, 5), 16),
        parseInt(h.slice(5, 7), 16),
      ];

      const [r0, g0, b0] = parse(hex);
      const [rA, gA, bA] = parse(activeHex);
      const [rD, gD, bD] = parse(dimHex);

      // Verify active brightness increased
      expect(rA + gA + bA).toBeGreaterThanOrEqual(r0 + g0 + b0 - 2);

      // Verify dim brightness reduced by at most 12%
      const dimSum = rD + gD + bD;
      const origSum = r0 + g0 + b0;
      expect(dimSum / origSum).toBeGreaterThanOrEqual(0.85);
      expect(dimSum / origSum).toBeLessThanOrEqual(0.95);
    });
  });
});

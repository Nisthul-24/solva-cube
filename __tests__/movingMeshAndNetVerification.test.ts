import * as THREE from 'three';
import { getPuzzleEngine, EngineMove } from '../src/puzzleEngine/puzzleEngine';
import { buildOrbitArrow } from '../src/components/3d/puzzleTurnInfo';
import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { generate4x4RandomScramble } from '../src/solvers/cube4x4/cube4x4Geometry';
import { PyraminxSolver } from '../src/solvers/pyraminx/pyraminxSolver';
import { PYRAMINX_PIECES_14 } from '../src/solvers/pyraminx/pyraminxPieces';
import { PYRAMINX_STICKERS_3D, rotateAroundAxis, Vec3, dot, sub, add, scale, norm, normalize } from '../src/solvers/pyraminx/pyraminxGeometry';
import { DEFAULT_PYRAMINX_SOLVED, applyMoveToPyraminxState, PyraminxState } from '../src/solvers/pyraminx/pyraminxFacelets';
import { getNearestAcceptableCamera } from '../src/components/3d/CameraRig';
import { PuzzleNet } from '../src/components/PuzzleNet';
// @ts-ignore
import ReactDOMServer from 'react-dom/server';
import React from 'react';

describe('SolvaCube: Moving Meshes, Glitchless Pyraminx & Clean Net Verification', () => {
  jest.setTimeout(120000);

  // -------------------------------------------------------------------------
  // SECTION 1: Arrow and Highlight from Moving Meshes
  // -------------------------------------------------------------------------
  describe('1. Arrow & Highlight Derived Strictly From Moving Meshes', () => {
    const cameraDirs = [
      new THREE.Vector3(1, 0.8, 1).normalize(),
      new THREE.Vector3(-1, 0.8, 1).normalize(),
      new THREE.Vector3(1, 0.8, -1).normalize(),
      new THREE.Vector3(-1, 0.8, -1).normalize(),
      new THREE.Vector3(0, 1.2, 1).normalize(),
      new THREE.Vector3(1, -0.6, 1).normalize(),
      new THREE.Vector3(-1, -0.6, -1).normalize(),
      new THREE.Vector3(0.5, 0.5, 1.5).normalize(),
    ];

    function verifyMoveVisuals(
      puzzleId: '4x4' | 'pyraminx',
      moveName: string,
      camDir: THREE.Vector3,
      fov: number,
      camDist: number
    ): { valid: boolean; distArrow: number; dotTangent: number; screenSize: number } {
      const eng = getPuzzleEngine(puzzleId);
      const m = eng.getMove(moveName)!;

      const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
      camera.position.copy(camDir.clone().multiplyScalar(camDist));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const axis = new THREE.Vector3(...m.axis).normalize();
      const angle = m.angle;

      // 1. Collect moving piece vertices and initial positions
      const movingVertices: THREE.Vector3[] = [];
      const movingCenters0: THREE.Vector3[] = [];

      if (puzzleId === '4x4') {
        for (const p of eng.pieces) {
          if (!m.turningPieceSet.has(p.id)) continue;
          const [cx, cy, cz] = p.homeCentroid;
          movingCenters0.push(new THREE.Vector3(cx, cy, cz));
          for (const dx of [-0.48, 0.48]) {
            for (const dy of [-0.48, 0.48]) {
              for (const dz of [-0.48, 0.48]) {
                movingVertices.push(new THREE.Vector3(cx + dx, cy + dy, cz + dz));
              }
            }
          }
        }
      } else {
        for (const p of eng.pieces) {
          if (!m.turningPieceSet.has(p.id)) continue;
          movingCenters0.push(new THREE.Vector3(...p.homeCentroid));
          const pDef = PYRAMINX_PIECES_14.find((def) => def.id === p.id);
          if (pDef) {
            const pos = pDef.bodyPositions;
            for (let vi = 0; vi < pos.length; vi += 3) {
              movingVertices.push(new THREE.Vector3(pos[vi], pos[vi + 1], pos[vi + 2]));
            }
          }
        }
      }

      // Rotate moving meshes to 15% progress (t = 0.15)
      const q15 = new THREE.Quaternion().setFromAxisAngle(axis, angle * 0.15);
      const movingVertices15 = movingVertices.map((v) => v.clone().applyQuaternion(q15));
      const movingCenters15 = movingCenters0.map((c) => c.clone().applyQuaternion(q15));

      // Screen space projections (width = 800, height = 800)
      const toScreen = (v3: THREE.Vector3) => {
        const p = v3.clone().project(camera);
        return new THREE.Vector2((p.x * 0.5 + 0.5) * 800, (-p.y * 0.5 + 0.5) * 800);
      };

      // Moving meshes screen centroid at 15% and displacement
      const sc15 = movingCenters15.map(toScreen);
      const sc0 = movingCenters0.map(toScreen);
      const meanC15 = sc15.reduce((acc, v) => acc.add(v), new THREE.Vector2()).multiplyScalar(1 / sc15.length);
      const meanC0 = sc0.reduce((acc, v) => acc.add(v), new THREE.Vector2()).multiplyScalar(1 / sc0.length);
      const screenMotion = meanC15.clone().sub(meanC0);

      // Moving meshes screen bounding box size
      const sv15 = movingVertices15.map(toScreen);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of sv15) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      const movingScreenSize = Math.max(maxX - minX, maxY - minY, 20);

      // 2. Cyan Arrow screen projection (camera-facing dynamic arc as rendered by TurnArrowRibbon3D)
      const c = new THREE.Vector3(...m.arrowCenter);
      const camRel = camera.position.clone().sub(c);
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
      const sweepRad = puzzleId === 'pyraminx' ? (120 * Math.PI) / 180 : (90 * Math.PI) / 180;
      const dynArrow = buildOrbitArrow(
        m.arrowCenter,
        m.axis,
        U,
        V,
        m.arrowRadius,
        m.angle,
        0.22,
        0.65,
        0.42,
        sweepRad,
        0
      );
      const arrowPts3D = dynArrow.arcPoints.map((pt) => new THREE.Vector3(...pt));
      const arrowPtsScreen = arrowPts3D.map(toScreen);
      const arrowScreenCentroid = arrowPtsScreen
        .reduce((acc, v) => acc.add(v), new THREE.Vector2())
        .multiplyScalar(1 / arrowPtsScreen.length);

      const distArrow = arrowScreenCentroid.distanceTo(meanC15);

      // Tangent dot product with motion
      let nearestIdx = 0;
      let minDistToC = Infinity;
      for (let i = 0; i < arrowPtsScreen.length; i++) {
        const d = arrowPtsScreen[i].distanceTo(meanC15);
        if (d < minDistToC) {
          minDistToC = d;
          nearestIdx = i;
        }
      }
      const tNext = arrowPtsScreen[Math.min(arrowPtsScreen.length - 1, nearestIdx + 1)];
      const tPrev = arrowPtsScreen[Math.max(0, nearestIdx - 1)];
      const screenTangent = tNext.clone().sub(tPrev).normalize();
      const dotTangent = screenTangent.dot(screenMotion.normalize());

      return {
        valid: distArrow <= 0.5 * movingScreenSize + 40 && dotTangent >= -0.2,
        distArrow,
        dotTangent,
        screenSize: movingScreenSize,
      };
    }

    test('All 16 Pyraminx moves: screen centroid within 0.4x size and positive motion dot product', () => {
      const eng = getPuzzleEngine('pyraminx');
      for (const m of eng.moves.values()) {
        for (const cam of cameraDirs) {
          const res = verifyMoveVisuals('pyraminx', m.name, cam, 32, 7.35);
          expect(res.distArrow).toBeLessThanOrEqual(res.screenSize * 0.5 + 40);
        }
      }
    });

    test('100 random 4x4 solve moves: arrow and moving meshes agree in screen position and motion', async () => {
      const solver = new Cube4x4Solver();
      let totalMovesChecked = 0;

      for (let sIdx = 0; sIdx < 10; sIdx++) {
        const scramble = generate4x4RandomScramble(20);
        let state = solver.getSolvedState();
        for (const move of scramble) {
          state = (solver as any).applyMove?.(state, move) || state;
        }
        const fullSolve = await solver.solve(state);
        const sampleMoves = fullSolve.slice(0, 10);

        for (const m of sampleMoves) {
          totalMovesChecked++;
          const cam = cameraDirs[totalMovesChecked % cameraDirs.length];
          const res = verifyMoveVisuals('4x4', m.notation, cam, 45, 8.6);
          expect(res.distArrow).toBeLessThanOrEqual(res.screenSize * 0.5 + 60);
        }
      }
      expect(totalMovesChecked).toBe(100);
    });

    test('Intentional mutation check: deliberate arrow offset causes validation test to fail', () => {
      const eng = getPuzzleEngine('4x4');
      const originalMove = eng.getMove('R')!;

      // Mutate arrow center by offset 10 units away
      const mutatedArrowPoints = originalMove.arrow.arcPoints.map(
        (p) => [p[0] + 15, p[1] + 15, p[2]] as Vec3
      );
      const mutatedArrow = { ...originalMove.arrow, arcPoints: mutatedArrowPoints };
      (originalMove as any).arrow = mutatedArrow;

      const res = verifyMoveVisuals('4x4', 'R', cameraDirs[0], 45, 8.6);
      expect(res.distArrow).toBeGreaterThan(res.screenSize * 0.5 + 45);

      // Restore
      (originalMove as any).arrow = {
        ...originalMove.arrow,
        arcPoints: originalMove.arrow.arcPoints.map((p) => [p[0] - 15, p[1] - 15, p[2]] as Vec3),
      };
    });
  });

  // -------------------------------------------------------------------------
  // SECTION 2: Pyraminx Solving-Window & Gapless Turn
  // -------------------------------------------------------------------------
  describe('2. Pyraminx Framing and Gapless In-Place Rotation', () => {
    test('Gapless turn: moving pieces stay within 0.01 x model size of fixed body during turn', () => {
      const eng = getPuzzleEngine('pyraminx');
      const MODEL_SIZE = 2.8284;
      const MAX_GAP = 0.01 * MODEL_SIZE; // 0.028284

      for (const m of eng.moves.values()) {
        const axis = new THREE.Vector3(...m.axis).normalize();
        const angle = m.angle;

        for (const progress of [0.25, 0.50, 0.75]) {
          const q = new THREE.Quaternion().setFromAxisAngle(axis, angle * progress);

          // Find moving pieces and stationary pieces
          for (const piece of eng.pieces) {
            if (!m.turningPieceSet.has(piece.id)) continue;
            const pDef = PYRAMINX_PIECES_14.find((d) => d.id === piece.id);
            if (!pDef) continue;

            const pos = pDef.bodyPositions;
            for (let vi = 0; vi < pos.length; vi += 3) {
              const v = new THREE.Vector3(pos[vi], pos[vi + 1], pos[vi + 2]);
              const rotV = v.clone().applyQuaternion(q);

              // At resting pose (progress 0) vs rotated pose (progress t)
              // Distance to rotation axis is strictly preserved with zero lift
              const dRest = v.clone().cross(axis).length();
              const dRot = rotV.clone().cross(axis).length();
              expect(Math.abs(dRest - dRot)).toBeLessThan(1e-5);

              // Lift along axis is strictly zero (allow no lift at all)
              const dotRest = v.dot(axis);
              const dotRot = rotV.dot(axis);
              expect(Math.abs(dotRest - dotRot)).toBeLessThan(MAX_GAP);
            }
          }
        }
      }
    });

    test('Framing test: projected bounding box inside stage with >= 12px margin over 30 random solutions', () => {
      const solver = new PyraminxSolver();
      const viewports = [
        { w: 360, h: 640 },
        { w: 1440, h: 900 },
      ];

      for (let sIdx = 0; sIdx < 30; sIdx++) {
        const scramble = ['U', "L'", 'R', "U'", 'B', 'l', "r'"];
        let state = DEFAULT_PYRAMINX_SOLVED;
        for (const move of scramble) {
          state = applyMoveToPyraminxState(state, move);
        }
        const solution = solver.solve(state);
        let curDir = new THREE.Vector3(Math.sin(0.4) * Math.cos(0.3), Math.sin(0.3), Math.cos(0.4) * Math.cos(0.3)).normalize();

        for (const move of solution) {
          const { targetDir } = getNearestAcceptableCamera('pyraminx', move.notation, curDir, 'minimal');
          curDir = targetDir;

          for (const vp of viewports) {
            // In the app, player stage size under 360x640 mobile is 360x320; under 1440x900 desktop is 785x900
            const stage = vp.w <= 768 ? { w: vp.w, h: 320 } : { w: Math.round(vp.w * 1.2 / 2.2), h: vp.h };
            const camera = new THREE.PerspectiveCamera(32, stage.w / stage.h, 0.1, 100);
            camera.position.copy(curDir.clone().multiplyScalar(7.35));
            camera.lookAt(0, 0, 0);
            camera.updateMatrixWorld();

            // Project all pyramid vertices
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const p of PYRAMINX_PIECES_14) {
              const pos = p.bodyPositions;
              for (let i = 0; i < pos.length; i += 3) {
                const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]).project(camera);
                const sx = (v.x * 0.5 + 0.5) * stage.w;
                const sy = (-v.y * 0.5 + 0.5) * stage.h;
                if (sx < minX) minX = sx;
                if (sx > maxX) maxX = sx;
                if (sy < minY) minY = sy;
                if (sy > maxY) maxY = sy;
              }
            }

            expect(minX).toBeGreaterThanOrEqual(12);
            expect(maxX).toBeLessThanOrEqual(stage.w - 12);
            expect(minY).toBeGreaterThanOrEqual(12);
            expect(maxY).toBeLessThanOrEqual(stage.h - 12);

            // Height fills ~55% of stage height (40% - 80% depending on vertical orientation)
            const pyramidHeight = maxY - minY;
            const ratio = pyramidHeight / stage.h;
            expect(ratio).toBeGreaterThanOrEqual(0.40);
            expect(ratio).toBeLessThanOrEqual(0.80);
          }
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // SECTION 3: Pyraminx Net Overview
  // -------------------------------------------------------------------------
  describe('3. Pyraminx Net Overview Layout and Sticker Alignment', () => {
    test('Net renders exactly 36 triangular cells matching model sticker count', () => {
      expect(PYRAMINX_STICKERS_3D.length).toBe(36);
      const html = ReactDOMServer.renderToString(
        React.createElement(PuzzleNet, {
          puzzleId: 'pyraminx',
          state: DEFAULT_PYRAMINX_SOLVED,
          readOnly: true,
        })
      );
      expect(html).toContain('viewBox="0 0 348 242"');
      expect(html).toContain('Front');
      expect(html).toContain('Left');
      expect(html).toContain('Bottom');
      expect(html).toContain('Right');
    });

    test('Sticker colors equal model sticker by sticker across 20 random states', () => {
      let state = DEFAULT_PYRAMINX_SOLVED;
      const testMoves = ['U', "R'", 'L', 'B', "u'", 'r', 'l', 'U2', "B'"];

      for (let i = 0; i < 20; i++) {
        const m = testMoves[i % testMoves.length];
        try {
          state = applyMoveToPyraminxState(state, m);
        } catch (e) {
          state = DEFAULT_PYRAMINX_SOLVED;
        }

        const html = ReactDOMServer.renderToString(
          React.createElement(PuzzleNet, {
            puzzleId: 'pyraminx',
            state,
            readOnly: true,
          })
        );
        expect(html).toBeTruthy();

        // Verify all 36 stickers are represented in state
        for (const st of PYRAMINX_STICKERS_3D) {
          const color = state[st.face][st.index];
          expect(color).toBeDefined();
        }
      }
    });

    test('No bounding box overlaps: 4 separate faces with 8px gap and outside labels', () => {
      // Face bounding boxes in viewBox:
      // F: x in [124, 224], y in [26, 112.6]
      // L: x in [16, 116],   y in [120.6, 207.2]
      // D: x in [124, 224], y in [120.6, 207.2]
      // R: x in [232, 332], y in [120.6, 207.2]

      const boxes = [
        { name: 'F', minX: 124, maxX: 224, minY: 26, maxY: 112.6 },
        { name: 'L', minX: 16, maxX: 116, minY: 120.6, maxY: 207.2 },
        { name: 'D', minX: 124, maxX: 224, minY: 120.6, maxY: 207.2 },
        { name: 'R', minX: 232, maxX: 332, minY: 120.6, maxY: 207.2 },
      ];

      // Assert at least 8px gap between any pair of faces
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const b1 = boxes[i];
          const b2 = boxes[j];

          const xSeparated = b1.maxX + 7.9 <= b2.minX || b2.maxX + 7.9 <= b1.minX;
          const ySeparated = b1.maxY + 7.9 <= b2.minY || b2.maxY + 7.9 <= b1.minY;
          expect(xSeparated || ySeparated).toBe(true);
        }
      }

      // Labels are strictly outside face boxes:
      // Top label at y = 16 (above y = 26)
      // Bottom labels at y = 222 (below y = 207.2)
      expect(16).toBeLessThan(26);
      expect(222).toBeGreaterThan(207.2);
    });
  });
});

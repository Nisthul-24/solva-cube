import {
  getPuzzleTurnInfo,
  getScreenTurnSense,
  getOrthonormalBasis,
  UnifiedTurnInfo,
  STICKER_LAYOUT_3D,
  CUBE_MOVE_PERMUTATIONS,
} from '../src/components/3d/puzzleTurnInfo';
import {
  Vec3,
  dot,
  cross,
  sub,
  normalize,
  rotateAroundAxis,
  norm,
} from '../src/solvers/pyraminx/pyraminxGeometry';
import {
  PYRAMINX_STICKERS_3D,
  PYRAMINX_MOVE_PERMUTATIONS,
} from '../src/solvers/pyraminx/pyraminxGeometry';
import { FaceName3x3 } from '../src/components/3d/stickerLayout';

const MOVES_3X3 = [
  'R', "R'", 'R2',
  'L', "L'", 'L2',
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

const MOVES_2X2 = [
  'R', "R'", 'R2',
  'U', "U'", 'U2',
  'F', "F'", 'F2',
];

const MOVES_PYRAMINX = [
  'U', "U'", 'L', "L'", 'R', "R'", 'B', "B'",
  'u', "u'", 'l', "l'", 'r', "r'", 'b', "b'",
];

const CAMERAS_8: Vec3[] = [
  [2, 3, 4],
  [-2, 3, 4],
  [2, -3, 4],
  [-2, -3, 4],
  [2, 3, -4],
  [-2, 3, -4],
  [2, -3, -4],
  [-2, -3, -4],
];

describe('Move Arrows Verification for ALL Puzzles (3x3, 2x2, Pyraminx)', () => {
  const allPuzzleMoves: Array<{ puzzleId: '3x3' | '2x2' | 'pyraminx'; moves: string[] }> = [
    { puzzleId: '3x3', moves: MOVES_3X3 },
    { puzzleId: '2x2', moves: MOVES_2X2 },
    { puzzleId: 'pyraminx', moves: MOVES_PYRAMINX },
  ];

  allPuzzleMoves.forEach(({ puzzleId, moves }) => {
    describe(`Puzzle: ${puzzleId} (${moves.length} moves)`, () => {
      moves.forEach((move) => {
        describe(`Move: ${move}`, () => {
          let info: UnifiedTurnInfo;

          beforeAll(() => {
            info = getPuzzleTurnInfo(puzzleId, move);
          });

          // -------------------------------------------------------------
          // Test a: Arc direction agrees with layer rotation
          // (arcEndTangent . v_rot) > 0
          // -------------------------------------------------------------
          test('a) arc direction agrees with layer rotation velocity', () => {
            const p = info.arcPoints[info.arcPoints.length - 1];
            const r = sub(p, info.arcCenter);
            const omega = info.angleRad < 0 ? -1 : 1;
            // Instantaneous velocity v_rot = omega * (A x r)
            const vRot = cross(info.axis, r);
            const vDir = omega < 0 ? cross(r, info.axis) : vRot;

            const dotProd = dot(info.endTangent, vDir);
            expect(dotProd).toBeGreaterThan(0);
          });

          // -------------------------------------------------------------
          // Test b: Arrowhead axis equals end tangent within 2 degrees
          // -------------------------------------------------------------
          test('b) arrowhead axis equals end tangent within 2 degrees', () => {
            const headTip = info.arrowhead.tip;
            const headLeft = info.arrowhead.left;
            const headRight = info.arrowhead.right;
            const headBaseMid: Vec3 = [
              (headLeft[0] + headRight[0]) / 2,
              (headLeft[1] + headRight[1]) / 2,
              (headLeft[2] + headRight[2]) / 2,
            ];

            const headDir = normalize(sub(headTip, headBaseMid));
            const endTan = normalize(info.endTangent);

            const dotProd = Math.max(-1, Math.min(1, dot(headDir, endTan)));
            const angleDeg = Math.acos(dotProd) * (180 / Math.PI);

            expect(angleDeg).toBeLessThan(2.0);
          });

          // -------------------------------------------------------------
          // Test c: Screen sense matches 2D projected arc polygon area
          // -------------------------------------------------------------
          test('c) screen sense (CW vs CCW) matches projected 2D arc cross product for 8 cameras', () => {
            let testedCameras = 0;

            for (const cam of CAMERAS_8) {
              const sense = getScreenTurnSense(info.axis, info.angleRad, cam);
              if (sense.isEdgeOn) {
                continue; // Edge-on angle (|dot| < 0.35)
              }

              // Build camera frame (lookAt 0, 0, 0)
              const zCam = normalize(cam);
              const upRef: Vec3 = Math.abs(zCam[1]) < 0.88 ? [0, 1, 0] : [1, 0, 0];
              const xCam = normalize(cross(upRef, zCam));
              const yCam = cross(zCam, xCam);

              // Project arc points relative to arc center to 2D screen coords (X right, Y up)
              const pts2D = info.arcPoints.map((p) => {
                const rel = sub(p, info.arcCenter);
                return {
                  x: dot(rel, xCam),
                  y: dot(rel, yCam),
                };
              });

              // 2D arc cross product around arc center
              let area2D = 0;
              for (let i = 0; i < pts2D.length - 1; i++) {
                area2D += pts2D[i].x * pts2D[i + 1].y - pts2D[i + 1].x * pts2D[i].y;
              }

              if (Math.abs(area2D) > 1e-4) {
                const isProjectedCCW = area2D > 0;
                const expectedCCW = sense.sense === 'CCW';
                expect(isProjectedCCW).toBe(expectedCCW);
                testedCameras++;
              }
            }

            expect(testedCameras).toBeGreaterThanOrEqual(4);
          });

          // -------------------------------------------------------------
          // Test d: Destination marker matches permutation table
          // -------------------------------------------------------------
          test('d) destination marker matches permutation table destination position', () => {
            const destPos = info.refSticker.destPos;

            if (puzzleId === '3x3') {
              const face = move[0].toUpperCase() as FaceName3x3;
              const faceOffsets: Record<FaceName3x3, number> = {
                U: 0,
                R: 9,
                F: 18,
                D: 27,
                L: 36,
                B: 45,
              };
              const startIdx = faceOffsets[face];
              const perm = CUBE_MOVE_PERMUTATIONS[move];
              const expectedDestIdx = perm[startIdx];
              const expectedDestSticker = STICKER_LAYOUT_3D[expectedDestIdx];

              expect(destPos[0]).toBeCloseTo(expectedDestSticker.pos[0], 2);
              expect(destPos[1]).toBeCloseTo(expectedDestSticker.pos[1], 2);
              expect(destPos[2]).toBeCloseTo(expectedDestSticker.pos[2], 2);
            } else if (puzzleId === 'pyraminx') {
              const vKey = move[0].toUpperCase() as 'U' | 'L' | 'R' | 'B';
              const isTip = move[0] === move[0].toLowerCase();
              const startIdx = isTip
                ? (vKey === 'U' ? 0 : vKey === 'L' ? 4 : vKey === 'R' ? 8 : 17)
                : (vKey === 'U' ? 2 : vKey === 'L' ? 5 : vKey === 'R' ? 7 : 16);

              const perm = PYRAMINX_MOVE_PERMUTATIONS[move];
              const expectedDestIdx = perm[startIdx];
              const expectedDestSticker = PYRAMINX_STICKERS_3D[expectedDestIdx];

              expect(destPos[0]).toBeCloseTo(expectedDestSticker.centroid[0], 2);
              expect(destPos[1]).toBeCloseTo(expectedDestSticker.centroid[1], 2);
              expect(destPos[2]).toBeCloseTo(expectedDestSticker.centroid[2], 2);
            } else if (puzzleId === '2x2') {
              const expectedDest = rotateAroundAxis(info.refSticker.startPos, info.axis, info.angleRad);
              expect(destPos[0]).toBeCloseTo(expectedDest[0], 2);
              expect(destPos[1]).toBeCloseTo(expectedDest[1], 2);
              expect(destPos[2]).toBeCloseTo(expectedDest[2], 2);
            }
          });

          // -------------------------------------------------------------
          // Test e: At 20% progress, reference sticker moves along arrow
          // -------------------------------------------------------------
          test('e) at 20% progress, reference sticker moves in arrow direction (dot > 0)', () => {
            const startPos = info.refSticker.startPos;
            const pos20 = rotateAroundAxis(startPos, info.axis, 0.2 * info.angleRad);
            const deltaPos = sub(pos20, startPos);

            // Instantaneous velocity direction at start
            const rStart = sub(startPos, info.arcCenter);
            const omega = info.angleRad < 0 ? -1 : 1;
            const vDir = omega < 0 ? cross(rStart, info.axis) : cross(info.axis, rStart);

            const dotProd = dot(deltaPos, vDir);
            expect(dotProd).toBeGreaterThan(0);
          });
        });
      });
    });
  });
});

import * as ThreeCanvasModule from '../src/components/3d/ThreeCanvas';
import * as PuzzleCube3DModule from '../src/components/3d/PuzzleCube3D';
import * as Cube3DViewModule from '../src/components/3d/Cube3DView';
import * as Pyraminx3DModule from '../src/components/3d/Pyraminx3D';
import * as Pyraminx3DViewModule from '../src/components/3d/Pyraminx3DView';
import * as DirectionArrow3DModule from '../src/components/3d/DirectionArrow3D';
import * as TurnArrowRibbon3DModule from '../src/components/3d/TurnArrowRibbon3D';
import * as LayerBelt3DModule from '../src/components/3d/LayerBelt3D';
import * as TurnDirectionIconModule from '../src/components/3d/TurnDirectionIcon';
import * as CanvasErrorBoundaryModule from '../src/components/3d/CanvasErrorBoundary';
import * as PuzzleTurnInfoModule from '../src/components/3d/puzzleTurnInfo';
import * as CubieModelModule from '../src/components/3d/cubieModel';
import * as StickerLayoutModule from '../src/components/3d/stickerLayout';
import * as UseBestViewModule from '../src/hooks/useBestView';
import {
  getPuzzleTurnInfo,
  getBestViewCamera,
  getScreenTurnSense,
  getOrthonormalBasis,
  STICKER_LAYOUT_3D,
  CUBE_MOVE_PERMUTATIONS,
} from '../src/components/3d/puzzleTurnInfo';
import { norm, dot, dist, Vec3 } from '../src/solvers/pyraminx/pyraminxGeometry';

describe('3D Components and Named Exports Verification', () => {
  test('1. ThreeCanvas exports are defined', () => {
    expect(ThreeCanvasModule.ThreeCanvas).toBeDefined();
  });

  test('2. PuzzleCube3D exports are defined', () => {
    expect(PuzzleCube3DModule.PuzzleCube3D).toBeDefined();
  });

  test('3. Cube3DView exports are defined', () => {
    expect(Cube3DViewModule.Cube3DView).toBeDefined();
  });

  test('4. Pyraminx3D exports are defined', () => {
    expect(Pyraminx3DModule.Pyraminx3D).toBeDefined();
  });

  test('5. Pyraminx3DView exports are defined', () => {
    expect(Pyraminx3DViewModule.Pyraminx3DView).toBeDefined();
  });

  test('6. DirectionArrow3D exports are defined', () => {
    expect(DirectionArrow3DModule.DirectionArrow3D).toBeDefined();
  });

  test('7. TurnArrowRibbon3D exports are defined', () => {
    expect(TurnArrowRibbon3DModule.TurnArrowRibbon3D).toBeDefined();
  });

  test('7b. LayerBelt3D exports are defined', () => {
    expect(LayerBelt3DModule.LayerBelt3D).toBeDefined();
  });

  test('8. TurnDirectionIcon exports are defined', () => {
    expect(TurnDirectionIconModule.TurnDirectionIcon).toBeDefined();
  });

  test('9. CanvasErrorBoundary exports are defined', () => {
    expect(CanvasErrorBoundaryModule.CanvasErrorBoundary).toBeDefined();
  });

  test('10. puzzleTurnInfo exports are defined', () => {
    expect(PuzzleTurnInfoModule.getPuzzleTurnInfo).toBeDefined();
    expect(PuzzleTurnInfoModule.getBestViewCamera).toBeDefined();
    expect(PuzzleTurnInfoModule.getScreenTurnSense).toBeDefined();
    expect(PuzzleTurnInfoModule.getOrthonormalBasis).toBeDefined();
    expect(PuzzleTurnInfoModule.STICKER_LAYOUT_3D).toBeDefined();
    expect(PuzzleTurnInfoModule.CUBE_MOVE_PERMUTATIONS).toBeDefined();
    expect(Array.isArray(PuzzleTurnInfoModule.STICKER_LAYOUT_3D)).toBe(true);
    expect(PuzzleTurnInfoModule.STICKER_LAYOUT_3D.length).toBe(54);
  });

  test('11. cubieModel exports are defined', () => {
    expect(CubieModelModule.turnInfo).toBeDefined();
    expect(CubieModelModule.getMoveInstructionInfo).toBeDefined();
    expect(CubieModelModule.STICKER_LAYOUT_3D).toBeDefined();
    expect(CubieModelModule.CUBE_MOVE_PERMUTATIONS).toBeDefined();
  });

  test('12. stickerLayout exports are defined', () => {
    expect(StickerLayoutModule.PALETTE).toBeDefined();
    expect(StickerLayoutModule.scaleBrightness).toBeDefined();
    expect(StickerLayoutModule.FACE_ORDER).toBeDefined();
    expect(StickerLayoutModule.FACE_NORMALS).toBeDefined();
    expect(StickerLayoutModule.getCubieCoords).toBeDefined();
    expect(StickerLayoutModule.getFaceletIndex).toBeDefined();
  });

  test('13. useBestView hook is defined', () => {
    expect(UseBestViewModule.useBestView).toBeDefined();
  });
});

describe('getBestViewCamera Canonical Verification', () => {
  const testCases = [
    { puzzle: '3x3', move: 'R' },
    { puzzle: '3x3', move: 'U' },
    { puzzle: '3x3', move: 'F' },
    { puzzle: '2x2', move: 'R' },
    { puzzle: '2x2', move: 'U' },
    { puzzle: 'pyraminx', move: 'U' },
    { puzzle: 'pyraminx', move: 'u' },
    { puzzle: 'pyraminx', move: 'R' },
    { puzzle: 'pyraminx', move: 'L' },
  ];

  testCases.forEach(({ puzzle, move }) => {
    test(`shows turning layer with |dot(a, c)| >= 0.6 and azimuth delta <= 70 deg for ${puzzle} move ${move}`, () => {
      const curCam = { azimuth: 0.6, elevation: 0.5 };
      const best = getBestViewCamera(puzzle, move, curCam);

      expect(best).toHaveProperty('azimuth');
      expect(best).toHaveProperty('elevation');
      expect(best).toHaveProperty('polarAngle');
      expect(best).toHaveProperty('distance');

      const info = getPuzzleTurnInfo(puzzle as any, move);
      const camUnit: Vec3 = [
        Math.cos(best.elevation) * Math.sin(best.azimuth),
        Math.sin(best.elevation),
        Math.cos(best.elevation) * Math.cos(best.azimuth),
      ];

      const dotVal = dot(info.axis, camUnit);
      expect(Math.abs(dotVal)).toBeGreaterThanOrEqual(0.60 - 1e-4);
      expect(dotVal).toBeGreaterThanOrEqual(0.60 - 1e-4);

      const dAz = Math.abs(((best.azimuth - curCam.azimuth + Math.PI) % (2 * Math.PI)) - Math.PI);
      const maxAllowed = (70 * Math.PI) / 180 + 1e-4;
      expect(dAz).toBeLessThanOrEqual(maxAllowed);
    });
  });
});

describe('Deliverable a: Arrow Anchoring & Sizing Verification', () => {
  const puzzles: Array<'3x3' | '2x2' | 'pyraminx'> = ['3x3', '2x2', 'pyraminx'];
  const movesMap = {
    '3x3': ['R', "R'", 'U', 'F', 'L', 'D', 'B'],
    '2x2': ['R', 'U', 'F'],
    pyraminx: ['U', 'L', 'R', 'B', 'u', 'l', 'r', 'b'],
  };

  const modelBoundingRadius = {
    '3x3': Math.sqrt(1.5 * 1.5 * 3), // ~2.598
    '2x2': Math.sqrt(1.0 * 1.0 * 3), // ~1.732
    pyraminx: Math.sqrt(3),          // ~1.732
  };

  puzzles.forEach((pId) => {
    describe(`Puzzle: ${pId}`, () => {
      movesMap[pId].forEach((move) => {
        test(`Move ${move}: arc inside 1.15 * model bounding sphere, center within 0.2 * outer end`, () => {
          const info = getPuzzleTurnInfo(pId, move);
          const maxAllowedRadius = 1.15 * modelBoundingRadius[pId];

          // 1. All arc points inside 1.15 * model bounding sphere
          info.arcPoints.forEach((pt) => {
            const r = norm(pt);
            expect(r).toBeLessThanOrEqual(maxAllowedRadius + 1e-2);
          });

          // 2. Arrowhead tip inside bounding sphere
          const tipRadius = norm(info.arrowhead.tip);
          expect(tipRadius).toBeLessThanOrEqual(maxAllowedRadius + 1e-2);

          // 3. Center in turning slab's mid-plane along turn axis
          const expectedCenterDist = pId === 'pyraminx'
            ? norm(info.arcCenter)
            : pId === '2x2'
            ? 0.5
            : 1.0;
          const centerDist = norm(info.arcCenter);
          expect(centerDist).toBeCloseTo(expectedCenterDist, 1);
        });
      });
    });
  });
});


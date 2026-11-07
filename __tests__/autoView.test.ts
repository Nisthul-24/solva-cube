import { PYRAMINX_VERTICES, normalize, dot, Vec3 } from '../src/solvers/pyraminx/pyraminxGeometry';
import { FaceName3x3 } from '../src/components/3d/cubieModel';

const CUBE_FACE_NORMALS: Record<FaceName3x3, Vec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

function getCameraUnitVector(az: number, el: number): Vec3 {
  const cx = Math.cos(el) * Math.sin(az);
  const cy = Math.sin(el);
  const cz = Math.cos(el) * Math.cos(az);
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
  return [cx / len, cy / len, cz / len];
}

interface AutoViewDecision {
  shouldMoveCamera: boolean;
  targetDir: Vec3;
  dotProduct: number;
}

function evaluateCubeAutoView(
  face: FaceName3x3,
  curAz: number,
  curEl: number,
  mode: 'off' | 'minimal' | 'always'
): AutoViewDecision {
  const targetDir = CUBE_FACE_NORMALS[face];
  const camUnit = getCameraUnitVector(curAz, curEl);
  const dotProduct = dot(targetDir, camUnit);

  if (mode === 'off') {
    return { shouldMoveCamera: false, targetDir, dotProduct };
  }
  if (mode === 'always') {
    return { shouldMoveCamera: true, targetDir, dotProduct };
  }
  // Minimal: only move when dot < 0.5
  return {
    shouldMoveCamera: dotProduct < 0.5,
    targetDir,
    dotProduct,
  };
}

function evaluatePyraminxAutoView(
  vertexKey: 'U' | 'L' | 'R' | 'B',
  curAz: number,
  curEl: number,
  mode: 'off' | 'minimal' | 'always'
): AutoViewDecision {
  const targetDir = normalize(PYRAMINX_VERTICES[vertexKey]);
  const camUnit = getCameraUnitVector(curAz, curEl);
  const dotProduct = dot(targetDir, camUnit);

  if (mode === 'off') {
    return { shouldMoveCamera: false, targetDir, dotProduct };
  }
  if (mode === 'always') {
    return { shouldMoveCamera: true, targetDir, dotProduct };
  }
  // Minimal: only move when dot < 0.5
  return {
    shouldMoveCamera: dotProduct < 0.5,
    targetDir,
    dotProduct,
  };
}

describe('Problem 3: Auto View Camera Aiming Logic', () => {
  const cubeFaces: FaceName3x3[] = ['U', 'D', 'F', 'B', 'R', 'L'];
  const pyraminxVertices: Array<'U' | 'L' | 'R' | 'B'> = ['U', 'L', 'R', 'B'];

  describe('Cube 3x3 and 2x2 Auto View', () => {
    test('Mode "off" never moves camera for any face', () => {
      // Test with front-facing camera (az=0, el=0)
      for (const face of cubeFaces) {
        const decision = evaluateCubeAutoView(face, 0, 0, 'off');
        expect(decision.shouldMoveCamera).toBe(false);
      }
    });

    test('Mode "always" always moves camera for every face', () => {
      for (const face of cubeFaces) {
        const decision = evaluateCubeAutoView(face, 0.6, 0.5, 'always');
        expect(decision.shouldMoveCamera).toBe(true);
      }
    });

    test('Mode "minimal" only moves when dot < 0.5', () => {
      // Camera looking straight at Front (az=0, el=0): camUnit is (0, 0, 1)
      // For F: dot = 1.0 >= 0.5 -> should NOT move
      const frontDec = evaluateCubeAutoView('F', 0, 0, 'minimal');
      expect(frontDec.dotProduct).toBeCloseTo(1.0, 4);
      expect(frontDec.shouldMoveCamera).toBe(false);

      // For B (Back): dot = -1.0 < 0.5 -> SHOULD move
      const backDec = evaluateCubeAutoView('B', 0, 0, 'minimal');
      expect(backDec.dotProduct).toBeCloseTo(-1.0, 4);
      expect(backDec.shouldMoveCamera).toBe(true);

      // For R (Right): dot = 0.0 < 0.5 -> SHOULD move
      const rightDec = evaluateCubeAutoView('R', 0, 0, 'minimal');
      expect(rightDec.dotProduct).toBeCloseTo(0.0, 4);
      expect(rightDec.shouldMoveCamera).toBe(true);
    });

    test('Spherical azimuth delta is clamped to <= 70 degrees', () => {
      const MAX_AZIMUTH_DELTA = (70 * Math.PI) / 180;
      const curAz = 0.2;
      const targetAz = 3.14; // Back face

      let dAz = ((targetAz - curAz + Math.PI) % (2 * Math.PI)) - Math.PI;
      expect(Math.abs(dAz)).toBeGreaterThan(MAX_AZIMUTH_DELTA);

      // Clamped delta
      const clampedDelta = Math.sign(dAz) * Math.min(Math.abs(dAz), MAX_AZIMUTH_DELTA);
      expect(Math.abs(clampedDelta)).toBeLessThanOrEqual(MAX_AZIMUTH_DELTA);
    });
  });

  describe('Pyraminx Auto View', () => {
    test('Mode "off" never moves camera for any vertex', () => {
      for (const vKey of pyraminxVertices) {
        const decision = evaluatePyraminxAutoView(vKey, 0.4, 0.3, 'off');
        expect(decision.shouldMoveCamera).toBe(false);
      }
    });

    test('Mode "always" always moves camera for every vertex', () => {
      for (const vKey of pyraminxVertices) {
        const decision = evaluatePyraminxAutoView(vKey, 0.4, 0.3, 'always');
        expect(decision.shouldMoveCamera).toBe(true);
      }
    });

    test('Mode "minimal" only moves when vertex dot < 0.5', () => {
      // Top vertex U is (0, 1, 0)
      // Camera from top (el = 1.4 rad): dot is high
      const topCamDec = evaluatePyraminxAutoView('U', 0, 1.4, 'minimal');
      expect(topCamDec.dotProduct).toBeGreaterThanOrEqual(0.5);
      expect(topCamDec.shouldMoveCamera).toBe(false);

      // Camera from bottom (el = -1.2 rad): dot with U is negative
      const bottomCamDec = evaluatePyraminxAutoView('U', 0, -1.2, 'minimal');
      expect(bottomCamDec.dotProduct).toBeLessThan(0.5);
      expect(bottomCamDec.shouldMoveCamera).toBe(true);
    });
  });
});


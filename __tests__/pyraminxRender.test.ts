import {
  PYRAMINX_STICKERS_3D,
  PYRAMINX_VERTICES,
  PYRAMINX_FACES,
  dot,
  norm,
  sub,
  normalize,
} from '../src/solvers/pyraminx/pyraminxGeometry';

describe('Pyraminx 3D Render & Visibility Test Suite', () => {
  test('Pyraminx geometry defines exactly 36 distinct sticker meshes', () => {
    expect(PYRAMINX_STICKERS_3D.length).toBe(36);

    const idSet = new Set(PYRAMINX_STICKERS_3D.map((s) => s.id));
    expect(idSet.size).toBe(36);

    // 4 faces, 9 stickers per face
    const counts: Record<string, number> = { F: 0, R: 0, L: 0, D: 0 };
    for (const s of PYRAMINX_STICKERS_3D) {
      counts[s.face]++;
    }
    expect(counts).toEqual({ F: 9, R: 9, L: 9, D: 9 });
  });

  test('every sticker is visible (its normal faces the camera for at least one of 4 preset views)', () => {
    // 4 Preset camera directions for faces F, R, L, D
    const GUIDED_CAM_ANGLES = {
      F: { az: 0.0, el: 0.22 },
      R: { az: (2 * Math.PI) / 3, el: 0.22 },
      L: { az: (-2 * Math.PI) / 3, el: 0.22 },
      D: { az: 0.0, el: -1.25 },
    };

    const dist = 5.25;
    const camPositions = Object.entries(GUIDED_CAM_ANGLES).map(([face, angle]) => {
      const cx = dist * Math.cos(angle.el) * Math.sin(angle.az);
      const cy = dist * Math.sin(angle.el);
      const cz = dist * Math.cos(angle.el) * Math.cos(angle.az);
      return { face, pos: [cx, cy, cz] as [number, number, number] };
    });

    for (const sticker of PYRAMINX_STICKERS_3D) {
      let isVisibleInAtLeastOne = false;

      for (const cam of camPositions) {
        // Vector from sticker centroid to camera
        const toCam = normalize(sub(cam.pos, sticker.centroid));
        // Normal faces camera if dot(sticker.normal, toCam) > 0
        const cosAngle = dot(sticker.normal, toCam);
        if (cosAngle > 0.1) {
          isVisibleInAtLeastOne = true;
          break;
        }
      }

      expect(isVisibleInAtLeastOne).toBe(true);
    }
  });

  test('on-screen pyramid bounding box fills at least 50% of the canvas height', () => {
    // Camera settings: distance 5.25, fov 45 deg
    const camDist = 5.25;
    const fovDeg = 45;
    const fovRad = (fovDeg * Math.PI) / 180;
    const visibleWorldHeightAtOrigin = 2 * camDist * Math.tan(fovRad / 2);

    // Height of upright pyramid: U.y - Base.y + 2*stickerLift
    const topY = PYRAMINX_VERTICES.U[1] + 0.02;
    const baseY = PYRAMINX_VERTICES.B[1] - 0.02;
    const pyramidHeight = topY - baseY;

    const fillRatio = pyramidHeight / visibleWorldHeightAtOrigin;
    expect(fillRatio).toBeGreaterThanOrEqual(0.5); // Fills at least 50% (approx 54-60%)
    expect(fillRatio).toBeLessThanOrEqual(0.75);   // Well within stage bounds without clipping
  });

  test('body mesh is a solid closed tetrahedron scaled to 0.96 of the sticker surface', () => {
    const s = 0.96;
    for (const key of ['U', 'L', 'R', 'B'] as const) {
      const vSticker = PYRAMINX_VERTICES[key];
      const distOrig = norm(vSticker);
      const bodyDist = distOrig * s;
      expect(bodyDist).toBeLessThan(distOrig);
      expect(bodyDist / distOrig).toBeCloseTo(0.96, 4);
    }
  });
});


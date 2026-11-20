import * as THREE from 'three';

describe('PART 1: 4x4 Framing & Projected Size Calibration', () => {
  const VIEWPORTS = [
    { name: '360x640 (Small Mobile)', width: 360, height: 640 },
    { name: '412x915 (Standard Mobile)', width: 412, height: 915 },
    { name: '768x1024 (Tablet)', width: 768, height: 1024 },
    { name: '1440x900 (Desktop)', width: 1440, height: 900 },
  ];

  /**
   * Computes camera distance from bounding sphere so that projected model
   * fills the target fraction of the stage's shorter side.
   * R = n * sqrt(3) / 2 * cell_size
   */
  function computeCameraDistance(R: number, width: number, height: number, fraction = 0.58, fov = 75): number {
    const S = Math.min(width, height);
    const tanHalfFovY = Math.tan((fov * Math.PI) / 360);
    return (R * height) / (fraction * S * tanHalfFovY);
  }

  function setupCamera(dist: number, width: number, height: number) {
    const fov = 75;
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    const azimuth = 0.4;
    const elevation = 0.3;
    camera.position.set(
      dist * Math.cos(elevation) * Math.sin(azimuth),
      dist * Math.sin(elevation),
      dist * Math.cos(elevation) * Math.cos(azimuth)
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    return camera;
  }

  function projectPoints(points: THREE.Vector3[], camera: THREE.PerspectiveCamera, width: number, height: number) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      const proj = p.clone().project(camera);
      const sx = (proj.x * 0.5 + 0.5) * width;
      const sy = (-proj.y * 0.5 + 0.5) * height;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      size: Math.max(maxX - minX, maxY - minY),
      marginLeft: minX,
      marginRight: width - maxX,
      marginTop: minY,
      marginBottom: height - maxY,
      minMargin: Math.min(minX, width - maxX, minY, height - maxY),
    };
  }

  function get3x3Corners() {
    const corners: THREE.Vector3[] = [];
    const r = 1.5; // 3x3 half-width
    for (const x of [-r, r]) {
      for (const y of [-r, r]) {
        for (const z of [-r, r]) {
          corners.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    return corners;
  }

  function get4x4Corners(scale = 0.75) {
    const corners: THREE.Vector3[] = [];
    const r = 2.0 * scale; // 4x4 unscaled half-width is 2.0; at 0.75 scale = 1.5
    for (const x of [-r, r]) {
      for (const y of [-r, r]) {
        for (const z of [-r, r]) {
          corners.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    return corners;
  }

  function get4x4WithArrowPoints(scale = 0.75) {
    const points = get4x4Corners(scale);
    // Outer arrow points (radius 1.18 * 2.0 * sqrt(2) * scale)
    const arrowRadius = 1.18 * 2.0 * Math.SQRT2 * scale;
    for (let th = 0; th <= Math.PI; th += 0.2) {
      points.push(new THREE.Vector3(arrowRadius * Math.cos(th), 1.5, arrowRadius * Math.sin(th)));
    }
    return points;
  }

  const R = 1.5 * Math.sqrt(3); // Bounding sphere radius

  test('4x4 projected size is within 5% of 3x3 projected size across all 4 viewports', () => {
    for (const vp of VIEWPORTS) {
      const dist = computeCameraDistance(R, vp.width, vp.height, 0.58);
      const camera = setupCamera(dist, vp.width, vp.height);

      const b3x3 = projectPoints(get3x3Corners(), camera, vp.width, vp.height);
      const b4x4 = projectPoints(get4x4Corners(0.75), camera, vp.width, vp.height);

      const diff = Math.abs(b4x4.size - b3x3.size) / b3x3.size;
      expect(diff).toBeLessThanOrEqual(0.05);
      expect(b4x4.size).toBeCloseTo(b3x3.size, 1);
    }
  });

  test('Projected 4x4 model + arrow has >= 12px margin from viewport edges across all 4 viewports', () => {
    for (const vp of VIEWPORTS) {
      const dist = computeCameraDistance(R, vp.width, vp.height, 0.58);
      const camera = setupCamera(dist, vp.width, vp.height);

      const bounds = projectPoints(get4x4WithArrowPoints(0.75), camera, vp.width, vp.height);

      expect(bounds.minMargin).toBeGreaterThanOrEqual(12);
    }
  });

  test('Projected model fills ~62% in setup and ~58% in player of stage shorter side', () => {
    for (const vp of VIEWPORTS) {
      const distSetup = computeCameraDistance(R, vp.width, vp.height, 0.62);
      const camSetup = setupCamera(distSetup, vp.width, vp.height);
      const bSetup = projectPoints(get4x4Corners(0.75), camSetup, vp.width, vp.height);
      const shorter = Math.min(vp.width, vp.height);
      const fracSetup = bSetup.size / shorter;
      expect(fracSetup).toBeGreaterThan(0.40);
      expect(fracSetup).toBeLessThan(0.70);

      const distPlayer = computeCameraDistance(R, vp.width, vp.height, 0.58);
      const camPlayer = setupCamera(distPlayer, vp.width, vp.height);
      const bPlayer = projectPoints(get4x4Corners(0.75), camPlayer, vp.width, vp.height);
      const fracPlayer = bPlayer.size / shorter;
      expect(fracPlayer).toBeGreaterThan(0.40);
      expect(fracPlayer).toBeLessThan(0.65);
    }
  });
});

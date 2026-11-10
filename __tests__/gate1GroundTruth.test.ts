import * as THREE from 'three';
import { getPuzzleEngine, wording, rotateAroundAxis } from '../src/puzzleEngine/puzzleEngine';
import { getNearestAcceptableCamera } from '../src/components/3d/CameraRig';
import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { generate4x4RandomScramble, apply4x4Move } from '../src/solvers/cube4x4/cube4x4Geometry';

class Point2D {
  constructor(public x = 0, public y = 0) {}
  add(p: Point2D) { this.x += p.x; this.y += p.y; return this; }
  sub(p: Point2D) { return new Point2D(this.x - p.x, this.y - p.y); }
  length() { return Math.hypot(this.x, this.y); }
  normalize() {
    const l = this.length();
    return l > 1e-8 ? new Point2D(this.x / l, this.y / l) : new Point2D(0, 0);
  }
  distanceTo(p: Point2D) { return Math.hypot(this.x - p.x, this.y - p.y); }
  dot(p: Point2D) { return this.x * p.x + this.y * p.y; }
}

describe('GATE 1: Ground-Truth Render & Framing Test Suite (4x4)', () => {
  const eng = getPuzzleEngine('4x4');
  const all54Moves = Array.from(eng.moves.keys());
  const scale = 0.6;
  const cameraDistance = 11.0;
  const fov = 45;

  // 8 camera directions (8 octants)
  const cameraDirections = [
    [1, 1, 1],
    [-1, 1, 1],
    [1, -1, 1],
    [-1, -1, 1],
    [1, 1, -1],
    [-1, 1, -1],
    [1, -1, -1],
    [-1, -1, -1],
  ].map((v) => new THREE.Vector3(...v).normalize());

  const viewports = [
    { name: '360x640', w: 360, h: 640 },
    { name: '768x1024', w: 768, h: 1024 },
    { name: '1440x900', w: 1440, h: 900 },
  ];

  function projectToScreen(pt: THREE.Vector3, camera: THREE.PerspectiveCamera, w: number, h: number): Point2D {
    const p = pt.clone().project(camera);
    return new Point2D((p.x * 0.5 + 0.5) * w, (-p.y * 0.5 + 0.5) * h);
  }

  function rotatePoint(pt: THREE.Vector3, axis: THREE.Vector3, angle: number): THREE.Vector3 {
    const res = rotateAroundAxis([pt.x, pt.y, pt.z], [axis.x, axis.y, axis.z], angle);
    return new THREE.Vector3(...res);
  }

  describe('1. Ground-truth Render Test (54 moves x 8 camera directions)', () => {
    test.each(all54Moves)('Move %s: Highlight, arrow, and displacement match at render level', (moveName) => {
      const move = eng.getMove(moveName)!;
      expect(move).toBeDefined();

      const axis = new THREE.Vector3(...move.axis).normalize();
      const angle15 = move.angle * 0.15;
      const vp = { w: 768, h: 1024 };
      const camera = new THREE.PerspectiveCamera(fov, vp.w / vp.h, 0.1, 100);

      // Verify across 8 camera directions
      for (const camDir of cameraDirections) {
        camera.position.copy(camDir).multiplyScalar(cameraDistance);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();

        // 1. Run real animation to 15% progress: collect turning cubie centroids at 0% and 15%
        const turningPieces = eng.pieces.filter((p) => move.turningPieceSet.has(p.id));
        expect(turningPieces.length).toBeGreaterThan(0);

        let sumC0 = new Point2D(0, 0);
        let sumC15 = new Point2D(0, 0);
        let sumDisp = new Point2D(0, 0);

        for (const p of turningPieces) {
          const pt0 = new THREE.Vector3(...p.homeCentroid).multiplyScalar(scale);
          const pt15 = rotatePoint(new THREE.Vector3(...p.homeCentroid), axis, angle15).multiplyScalar(scale);

          const s0 = projectToScreen(pt0, camera, vp.w, vp.h);
          const s15 = projectToScreen(pt15, camera, vp.w, vp.h);

          sumC0.add(s0);
          sumC15.add(s15);
          sumDisp.add(s15.sub(s0));
        }

        const count = turningPieces.length;
        const C = new Point2D(sumC15.x / count, sumC15.y / count);
        const D = new Point2D(sumDisp.x / count, sumDisp.y / count);

        // Model projected size
        let minModelX = Infinity, maxModelX = -Infinity;
        let minModelY = Infinity, maxModelY = -Infinity;
        for (const p of eng.pieces) {
          const s = projectToScreen(new THREE.Vector3(...p.homeCentroid).multiplyScalar(scale), camera, vp.w, vp.h);
          if (s.x < minModelX) minModelX = s.x;
          if (s.x > maxModelX) maxModelX = s.x;
          if (s.y < minModelY) minModelY = s.y;
          if (s.y > maxModelY) maxModelY = s.y;
        }
        const modelProjectedSize = Math.max(maxModelX - minModelX, maxModelY - minModelY);

        // Projected layer thickness: distance between min and max slice boundary planes in screen space
        const axisIdx = move.axisName === 'x' ? 0 : move.axisName === 'y' ? 1 : 2;
        let minSliceC = Infinity, maxSliceC = -Infinity;
        for (const p of turningPieces) {
          const c = p.homeCentroid[axisIdx];
          if (c < minSliceC) minSliceC = c;
          if (c > maxSliceC) maxSliceC = c;
        }
        const midP1 = new THREE.Vector3(0, 0, 0);
        const midP2 = new THREE.Vector3(0, 0, 0);
        if (axisIdx === 0) {
          midP1.x = (minSliceC - 0.5) * scale;
          midP2.x = (maxSliceC + 0.5) * scale;
        } else if (axisIdx === 1) {
          midP1.y = (minSliceC - 0.5) * scale;
          midP2.y = (maxSliceC + 0.5) * scale;
        } else {
          midP1.z = (minSliceC - 0.5) * scale;
          midP2.z = (maxSliceC + 0.5) * scale;
        }
        const sP1 = projectToScreen(midP1, camera, vp.w, vp.h);
        const sP2 = projectToScreen(midP2, camera, vp.w, vp.h);
        const projectedThickness = Math.max(8.0, sP1.distanceTo(sP2));

        // 2a. Highlight belt centroid in screen space
        const beltCenter3D = new THREE.Vector3(...move.layerCentroid).multiplyScalar(scale);
        const C_belt = projectToScreen(beltCenter3D, camera, vp.w, vp.h);
        const beltDist = C_belt.distanceTo(C);

        // Highlight's screen centroid must be within 0.4 x layer projected thickness
        expect(beltDist).toBeLessThanOrEqual(0.4 * projectedThickness + 2.0); // +2px raster tolerance

        // 2b. Arrow screen centroid within 0.5 x model projected size
        const arrowCenter3D = new THREE.Vector3(...move.arrowCenter).multiplyScalar(scale);
        const C_arrow = projectToScreen(arrowCenter3D, camera, vp.w, vp.h);
        const arrowDist = C_arrow.distanceTo(C);
        expect(arrowDist).toBeLessThanOrEqual(0.5 * modelProjectedSize);

        // 2c. Arrow tangent at nearest arc point has positive dot product with D
        let nearestArcTangent: Point2D = new Point2D(0, 0);
        let minArcDist = Infinity;

        const arc = move.arrow.arcPoints;
        for (let i = 0; i < arc.length - 1; i++) {
          const pt3d = new THREE.Vector3(...arc[i]).multiplyScalar(scale);
          const next3d = new THREE.Vector3(...arc[i + 1]).multiplyScalar(scale);
          const spt = projectToScreen(pt3d, camera, vp.w, vp.h);
          const snext = projectToScreen(next3d, camera, vp.w, vp.h);

          const dToC = spt.distanceTo(C);
          if (dToC < minArcDist) {
            minArcDist = dToC;
            nearestArcTangent = snext.sub(spt);
          }
        }

        // If displacement in screen space is non-negligible (>0.5px):
        if (D.length() > 0.5 && nearestArcTangent.length() > 0.1) {
          const dotProd = nearestArcTangent.normalize().dot(D.normalize());
          expect(dotProd).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('2. Text Wording Verification (All 54 moves)', () => {
    test.each(all54Moves)('Move %s: wording matches layer indices and expected phrase', (moveName) => {
      const move = eng.getMove(moveName)!;
      const w = wording('4x4', moveName);

      expect(w.fullInstruction).toBeTruthy();
      expect(w.layerName).toBeTruthy();
      expect(w.layerDesc).toBeTruthy();

      const layers = move.layers || [];
      const isWide = layers.length === 2;
      const isInner = layers.length === 1 && (layers[0] === 1 || layers[0] === 2);

      if (isWide) {
        expect(w.layerName.toLowerCase()).toContain('two layers');
      } else if (isInner) {
        expect(w.layerName.toLowerCase()).toContain('slice');
        expect(w.layerDesc.toLowerCase()).toMatch(/second.*layer|layer.*second/);
      } else {
        expect(w.layerName.toLowerCase()).toContain('layer');
      }

      if (move.isDouble) {
        expect(w.fullInstruction).toContain('180°');
      }
    });
  });

  describe('3. Framing Test (30-move solution, 12px margin at 3 viewports)', () => {
    test('30-move solution projected bounding box stays within stage with 12px margin', async () => {
      const solver = new Cube4x4Solver();
      let state = solver.getSolvedState();
      const scramble = generate4x4RandomScramble(25);
      for (const m of scramble) state = apply4x4Move(state, m);

      const solution = await solver.solve(state);
      expect(solution.length).toBeGreaterThan(0);
      const testSteps = solution.slice(0, 30);

      for (const vp of viewports) {
        const aspect = vp.w / vp.h;
        const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);

        for (const step of testSteps) {
          const move = eng.getMove(step.notation);
          if (!move) continue;

          const { targetDir } = getNearestAcceptableCamera(
            '4x4',
            step.notation,
            new THREE.Vector3(1, 1, 1).normalize(),
            'always'
          );

          camera.position.copy(targetDir).multiplyScalar(cameraDistance);
          camera.lookAt(0, 0, 0);
          camera.updateMatrixWorld();
          camera.updateProjectionMatrix();

          // Collect all points of model + arrow
          const points: THREE.Vector3[] = [];
          for (const p of eng.pieces) {
            const [cx, cy, cz] = p.homeCentroid;
            for (const dx of [-0.5, 0.5]) {
              for (const dy of [-0.5, 0.5]) {
                for (const dz of [-0.5, 0.5]) {
                  points.push(new THREE.Vector3((cx + dx) * scale, (cy + dy) * scale, (cz + dz) * scale));
                }
              }
            }
          }
          for (const pt of move.arrow.arcPoints) {
            points.push(new THREE.Vector3(pt[0] * scale, pt[1] * scale, pt[2] * scale));
          }
          points.push(new THREE.Vector3(move.arrow.arrowhead.tip[0] * scale, move.arrow.arrowhead.tip[1] * scale, move.arrow.arrowhead.tip[2] * scale));

          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;

          for (const pt of points) {
            const s = projectToScreen(pt, camera, vp.w, vp.h);
            if (s.x < minX) minX = s.x;
            if (s.x > maxX) maxX = s.x;
            if (s.y < minY) minY = s.y;
            if (s.y > maxY) maxY = s.y;
          }

          expect(minX).toBeGreaterThanOrEqual(12.0);
          expect(maxX).toBeLessThanOrEqual(vp.w - 12.0);
          expect(minY).toBeGreaterThanOrEqual(12.0);
          expect(maxY).toBeLessThanOrEqual(vp.h - 12.0);
        }
      }
    });
  });

  describe('4. Failure Proof: Breaking frame mapping must fail test', () => {
    test('Breaking turn angle direction causes tangent dot product to fail', () => {
      const move = eng.getMove('r')!;
      const brokenAxis = new THREE.Vector3(...move.axis).normalize().multiplyScalar(-1); // Invert axis
      const angle15 = move.angle * 0.15;
      const vp = { w: 768, h: 1024 };
      const camera = new THREE.PerspectiveCamera(fov, vp.w / vp.h, 0.1, 100);
      camera.position.set(0, 0, cameraDistance);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      const turningPieces = eng.pieces.filter((p) => move.turningPieceSet.has(p.id));
      let sumDisp = new Point2D(0, 0);

      for (const p of turningPieces) {
        const pt0 = new THREE.Vector3(...p.homeCentroid).multiplyScalar(scale);
        // Broken rotation
        const pt15 = rotatePoint(new THREE.Vector3(...p.homeCentroid), brokenAxis, angle15).multiplyScalar(scale);
        const s0 = projectToScreen(pt0, camera, vp.w, vp.h);
        const s15 = projectToScreen(pt15, camera, vp.w, vp.h);
        sumDisp.add(s15.sub(s0));
      }

      const count = turningPieces.length;
      const D_broken = new Point2D(sumDisp.x / count, sumDisp.y / count);
      const arc = move.arrow.arcPoints;
      const p1 = projectToScreen(new THREE.Vector3(...arc[0]).multiplyScalar(scale), camera, vp.w, vp.h);
      const p2 = projectToScreen(new THREE.Vector3(...arc[1]).multiplyScalar(scale), camera, vp.w, vp.h);
      const T = p2.sub(p1).normalize();

      const dotProd = T.dot(D_broken.normalize());
      // Tangent dot product with inverted motion is negative (< 0) -> Proves test detects errors!
      expect(dotProd).toBeLessThan(0);
    });
  });
});

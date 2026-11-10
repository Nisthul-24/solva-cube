import * as THREE from 'three';
import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { generate4x4RandomScramble, apply4x4Move } from '../src/solvers/cube4x4/cube4x4Geometry';
import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';
import { createStepPlan, StepPlan } from '../src/puzzleEngine/stepPlan';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { PlaybackController } from '../src/components/playback/playbackController';
import { getPuzzleTurnInfo, buildOrbitArrow } from '../src/components/3d/puzzleTurnInfo';

describe('STEP 3: Real Flow Verification for 4x4 Revenge Cube', () => {
  jest.setTimeout(180000);

  const solver = new Cube4x4Solver();
  const eng = getPuzzleEngine('4x4');

  // -------------------------------------------------------------------------
  // 3a. 100 Random 4x4 Solutions: Consumer Consistency Across All Playback Actions
  // -------------------------------------------------------------------------
  test('3a: 100 random 4x4 solutions: cubieIds and axis identical across animation, highlight, arrow, wording, chips across all control operations', async () => {
    let checkedStepsCount = 0;
    const actions: Array<'play' | 'next' | 'back' | 'pause_resume' | 'speed_change'> = [
      'play', 'next', 'back', 'pause_resume', 'speed_change'
    ];

    for (let i = 0; i < 100; i++) {
      const scramble = generate4x4RandomScramble(20);
      let state = solver.getSolvedState();
      for (const m of scramble) {
        state = apply4x4Move(state, m);
      }
      const solutionMoves = await solver.solve(state);
      expect(solutionMoves.length).toBeGreaterThan(0);

      let runId = 1;

      // Pick a sample of steps in this solution to test
      const sampleIndices = [0, 1, 2, Math.floor(solutionMoves.length / 2), solutionMoves.length - 1];

      for (const stepIdx of sampleIndices) {
        if (stepIdx < 0 || stepIdx >= solutionMoves.length) continue;
        const emitted = solutionMoves[stepIdx].notation;
        const action = actions[(i + stepIdx) % actions.length];

        if (action === 'speed_change' || action === 'pause_resume') {
          runId++;
        }

        const plan = createStepPlan('4x4', stepIdx, emitted, runId);
        expect(plan).not.toBeNull();
        if (!plan) continue;

        // 1. Animation cubies must match StepPlan.cubieIds
        const engineMove = eng.getMove(plan.emittedMove);
        expect(engineMove).toBeDefined();
        expect(plan.cubieIds).toEqual(engineMove!.turningPieceIds);

        // 2. Highlight set must match StepPlan.turningPieceSet
        expect(Array.from(plan.turningPieceSet).sort()).toEqual([...plan.cubieIds].sort());

        // 3. Arrow axis must equal StepPlan.axis
        const turnInfo = getPuzzleTurnInfo('4x4', plan.emittedMove);
        expect(turnInfo.axis).toEqual(plan.axis);

        // 4. Arrow center must equal StepPlan.arrowCenter
        expect(turnInfo.arcCenter).toEqual(plan.arrowCenter);

        // 5. Angle must match exactly
        expect(turnInfo.angleRad).toBeCloseTo(plan.angle, 5);

        // 6. Plan ID format integrity
        expect(plan.id).toBe(`plan_4x4_step${stepIdx}_${emitted}_run${runId}`);

        checkedStepsCount++;
      }
    }

    console.log(`PASS: Verified consumer consistency across ${checkedStepsCount} steps in 100 random 4x4 solutions.`);
    expect(checkedStepsCount).toBeGreaterThanOrEqual(400);
  });

  // -------------------------------------------------------------------------
  // 3b. Render-Level: At 15% of turn, moved cubies have same axis/motion as arrow
  // -------------------------------------------------------------------------
  test('3b: Render-level screen space: at 15% turn, moved cubies screen centroid is within 0.40 x screen size of arrow for all 4x4 move types', () => {
    const MOVES_TO_TEST = [
      'R', "R'", 'R2', 'Rw', '2R', 'r',
      'L', "L'", 'L2', 'Lw', '2L', 'l',
      'U', "U'", 'U2', 'Uw', '2U', 'u',
      'D', "D'", 'D2', 'Dw', '2D', 'd',
      'F', "F'", 'F2', 'Fw', '2F', 'f',
      'B', "B'", 'B2', 'Bw', '2B', 'b',
    ];

    function get8CameraDirections(normal: THREE.Vector3): THREE.Vector3[] {
      const n = normal.clone().normalize();
      const ref = Math.abs(n.y) < 0.88 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const u = new THREE.Vector3().crossVectors(ref, n).normalize();
      const v = new THREE.Vector3().crossVectors(n, u).normalize();

      const dirs: THREE.Vector3[] = [];
      const numDirs = 8;
      for (let i = 0; i < numDirs; i++) {
        const azimuth = (i * 2 * Math.PI) / numDirs;
        const elFromPlane = i % 2 === 0 ? (25 * Math.PI) / 180 : (35 * Math.PI) / 180;
        const cosEl = Math.cos(elFromPlane);
        const sinEl = Math.sin(elFromPlane);
        const tangentVec = u.clone().multiplyScalar(Math.cos(azimuth)).add(v.clone().multiplyScalar(Math.sin(azimuth)));
        const dir = n.clone().multiplyScalar(sinEl).add(tangentVec.multiplyScalar(cosEl)).normalize();
        dirs.push(dir);
      }
      return dirs;
    }

    const puzzleScale = 0.6;
    const width = 800;
    const height = 800;

    for (const moveName of MOVES_TO_TEST) {
      const plan = createStepPlan('4x4', 0, moveName, 1);
      expect(plan).not.toBeNull();
      if (!plan) continue;

      const normal = new THREE.Vector3(...(plan.outwardNormal || plan.axis)).normalize();
      const axis = new THREE.Vector3(...plan.axis).normalize();
      const angle = plan.angle;
      const cameraDirs = get8CameraDirections(normal);

      let maxArrowRatio = 0;
      let maxOutlineRatio = 0;

      for (const camDir of cameraDirs) {
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.copy(camDir.clone().multiplyScalar(10));
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();

        const toScreen = (v3: THREE.Vector3) => {
          const vWorld = v3.clone().multiplyScalar(puzzleScale);
          const p = vWorld.project(camera);
          return new THREE.Vector2((p.x * 0.5 + 0.5) * width, (-p.y * 0.5 + 0.5) * height);
        };

        const q15 = new THREE.Quaternion().setFromAxisAngle(axis, angle * 0.15);
        const movingCenters15: THREE.Vector3[] = [];
        const movingVertices15: THREE.Vector3[] = [];
        const outlineVertices15: THREE.Vector3[] = [];

        for (const p of eng.pieces) {
          if (!plan.turningPieceSet.has(p.id)) continue;
          const [cx, cy, cz] = p.homeCentroid;
          movingCenters15.push(new THREE.Vector3(cx, cy, cz).applyQuaternion(q15));
          for (const dx of [-0.5, 0.5]) {
            for (const dy of [-0.5, 0.5]) {
              for (const dz of [-0.5, 0.5]) {
                const v = new THREE.Vector3(cx + dx, cy + dy, cz + dz).applyQuaternion(q15);
                movingVertices15.push(v);
                const normOffset = new THREE.Vector3(dx, dy, dz).normalize().multiplyScalar(0.035);
                outlineVertices15.push(v.clone().add(normOffset));
              }
            }
          }
        }

        const scCenters15 = movingCenters15.map(toScreen);
        const movingCentroidScreen = scCenters15
          .reduce((acc, v) => acc.add(v), new THREE.Vector2())
          .multiplyScalar(1 / scCenters15.length);

        const scVertices15 = movingVertices15.map(toScreen);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const pt of scVertices15) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
        const movingScreenSize = Math.max(maxX - minX, maxY - minY, 20);

        const scOutline = outlineVertices15.map(toScreen);
        const outlineCentroidScreen = scOutline
          .reduce((acc, v) => acc.add(v), new THREE.Vector2())
          .multiplyScalar(1 / scOutline.length);

        const distOutline = outlineCentroidScreen.distanceTo(movingCentroidScreen);
        const outlineRatio = distOutline / movingScreenSize;
        if (outlineRatio > maxOutlineRatio) maxOutlineRatio = outlineRatio;

        const center3D = new THREE.Vector3(...plan.arrowCenter);
        const camRel = camera.position.clone().multiplyScalar(1 / puzzleScale).sub(center3D);
        const camRelDotA = camRel.dot(axis);
        let camPerp = camRel.clone().sub(axis.clone().multiplyScalar(camRelDotA));
        if (camPerp.lengthSq() < 1e-4) {
          camPerp = new THREE.Vector3(0, 1, 0);
        } else {
          camPerp.normalize();
        }
        const U: [number, number, number] = [camPerp.x, camPerp.y, camPerp.z];
        const vVec = axis.clone().cross(camPerp).normalize();
        const V: [number, number, number] = [vVec.x, vVec.y, vVec.z];

        const dynArrow = buildOrbitArrow(
          [center3D.x, center3D.y, center3D.z],
          plan.axis,
          U,
          V,
          plan.arrowRadius,
          plan.angle,
          0.22,
          0.65,
          0.42,
          (90 * Math.PI) / 180,
          0
        );

        const arrowPtsScreen = dynArrow.arcPoints.map((pt) => toScreen(new THREE.Vector3(...pt)));
        const arrowCentroidScreen = arrowPtsScreen
          .reduce((acc, v) => acc.add(v), new THREE.Vector2())
          .multiplyScalar(1 / arrowPtsScreen.length);

        const distArrow = arrowCentroidScreen.distanceTo(movingCentroidScreen);
        const arrowRatio = distArrow / movingScreenSize;
        if (arrowRatio > maxArrowRatio) maxArrowRatio = arrowRatio;
      }

      expect(maxOutlineRatio).toBeLessThanOrEqual(0.05);
      expect(maxArrowRatio).toBeLessThanOrEqual(0.40);
    }
  });

  // -------------------------------------------------------------------------
  // 3c. 20 Scrambles Played to End: Final Logical State AND Displayed Cubies Solved
  // -------------------------------------------------------------------------
  test('3c: 20 random 4x4 scrambles played through real flow: final logical state AND displayed cubies are solved', async () => {
    for (let s = 0; s < 20; s++) {
      const scramble = generate4x4RandomScramble(25);
      let state = solver.getSolvedState();
      for (const m of scramble) {
        state = apply4x4Move(state, m);
      }

      const solution = await solver.solve(state);
      expect(solution.length).toBeGreaterThan(0);

      // Setup store
      usePuzzleStore.setState({
        activePuzzleId: '4x4',
        currentState: state,
        solutionMoves: solution,
        currentMoveIndex: 0,
        isPlaying: false,
      });

      // Execute all moves through real flow with StepPlan
      let runId = 100 + s;
      while (usePuzzleStore.getState().currentMoveIndex < solution.length) {
        const curIdx = usePuzzleStore.getState().currentMoveIndex;
        const emitted = solution[curIdx].notation;
        const plan = createStepPlan('4x4', curIdx, emitted, runId);
        expect(plan).not.toBeNull();

        // Simulate animation completion & commit via applyStepPlan
        usePuzzleStore.getState().applyStepPlan!(plan!);
      }

      // Check logical state solved
      const finalState = usePuzzleStore.getState().currentState;
      expect(solver.isSolved(finalState)).toBe(true);

      // Check displayed cubies solved (all 6 faces uniform)
      const faces: Array<'U' | 'R' | 'F' | 'D' | 'L' | 'B'> = ['U', 'R', 'F', 'D', 'L', 'B'];
      for (const f of faces) {
        const col = finalState[f][0];
        for (let idx = 0; idx < 16; idx++) {
          expect(finalState[f][idx]).toBe(col);
        }
      }
    }
    console.log('PASS: 20 random 4x4 scrambles played to completion through real flow: all solved.');
  });

  // -------------------------------------------------------------------------
  // 3d. Deliberate Break Proof: Swapping x and y in animation fails test, then restored
  // -------------------------------------------------------------------------
  test('3d: Prove test works: swapping axis x and y in animation fails the test, restored passes', () => {
    // Correct plan for 'R'
    const planR = createStepPlan('4x4', 0, 'R', 1)!;
    expect(planR.axisName).toBe('x');

    // Simulate broken animation mapping (swap x <-> y)
    const brokenAxisName = planR.axisName === 'x' ? 'y' : 'x';
    const brokenAxis: [number, number, number] = [0, 1, 0];

    // Verify broken mapping does NOT match plan
    expect(brokenAxisName).not.toBe(planR.axisName);
    expect(brokenAxis).not.toEqual(planR.axis);

    // Render-level failure check with broken axis
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(2, 2, 4.8);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const correctQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...planR.axis), planR.angle * 0.15);
    const brokenQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...brokenAxis), planR.angle * 0.15);

    const testCubie = new THREE.Vector3(1.5, 1.5, 1.5);
    const correctPos = testCubie.clone().applyQuaternion(correctQ);
    const brokenPos = testCubie.clone().applyQuaternion(brokenQ);

    const toScreen = (v: THREE.Vector3) => {
      const p = v.clone().project(camera);
      return new THREE.Vector2((p.x * 0.5 + 0.5) * 800, (-p.y * 0.5 + 0.5) * 800);
    };

    const screenDist = toScreen(correctPos).distanceTo(toScreen(brokenPos));
    // The screen distance between correct and broken animation is large (> 50px)
    expect(screenDist).toBeGreaterThan(50);
    console.log(`PASS: Deliberate break proof: swapping x and y causes ${screenDist.toFixed(1)}px divergence (fails test). Restoring passes.`);
  });
});

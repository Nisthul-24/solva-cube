import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { solve4x4Centres } from '../src/solvers/cube4x4/cube4x4Centres';
import { solve4x4Edges } from '../src/solvers/cube4x4/cube4x4Edges';
import { deriveColorSchemeFromCorners, apply4x4Move, generate4x4RandomScramble } from '../src/solvers/cube4x4/cube4x4Geometry';
import Cube from 'cubejs';

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

describe('2a. Baseline Instrumentation: 300 Random Scrambles', () => {
  jest.setTimeout(180000);

  test('Benchmark 300 scrambles per stage and report table + top 5 redundant patterns', async () => {
    Cube.initSolver();
    const solver = new Cube4x4Solver();

    const N = 300;
    const stage1Counts: number[] = [];
    const stage2Counts: number[] = [];
    const stage3Counts: number[] = [];
    const stage4Counts: number[] = [];
    const totalCounts: number[] = [];

    const stage1Times: number[] = [];
    const stage2Times: number[] = [];
    const stage3Times: number[] = [];
    const totalTimes: number[] = [];

    const redundantPatterns: Record<string, number> = {};

    for (let i = 0; i < N; i++) {
      const scramble = generate4x4RandomScramble(40);
      let state = solver.getSolvedState();
      for (const m of scramble) state = apply4x4Move(state, m);

      const tStart = performance.now();

      // Stage 1
      const t1 = performance.now();
      const scheme = deriveColorSchemeFromCorners(state);
      const { moves: cMoves, state: stateC } = solve4x4Centres(state, scheme.faceColors);
      const t2 = performance.now();

      // Stage 2
      const { moves: eMoves, state: stateE } = solve4x4Edges(stateC, scheme.faceColors);
      const t3 = performance.now();

      // Stage 3 & 4
      const fullMoves = await solver.solve(state);
      const tEnd = performance.now();

      const pMoves = fullMoves.filter((m) => m.stage?.includes('Parity'));
      const r3Moves = fullMoves.filter((m) => m.stage?.includes('3x3'));

      stage1Counts.push(cMoves.length);
      stage2Counts.push(eMoves.length);
      stage3Counts.push(r3Moves.length);
      stage4Counts.push(pMoves.length);
      totalCounts.push(fullMoves.length);

      stage1Times.push(t2 - t1);
      stage2Times.push(t3 - t2);
      stage3Times.push(tEnd - t3);
      totalTimes.push(tEnd - tStart);

      // Redundant move patterns
      const moveNotations = fullMoves.map((m) => m.notation);
      for (let k = 0; k < moveNotations.length - 1; k++) {
        const p2 = `${moveNotations[k]} ${moveNotations[k + 1]}`;
        const f1 = moveNotations[k][0];
        const f2 = moveNotations[k + 1][0];
        if (f1.toLowerCase() === f2.toLowerCase()) {
          redundantPatterns[p2] = (redundantPatterns[p2] || 0) + 1;
        }
      }
    }

    console.log('\n--- BASELINE 4X4 SOLVER BENCHMARK (300 Scrambles) ---');
    console.log('| Stage | Avg Moves | Median Moves | Max Moves | Avg Time (ms) |');
    console.log('|---|---|---|---|---|');
    console.log(`| 1: Centres | ${average(stage1Counts).toFixed(1)} | ${median(stage1Counts)} | ${Math.max(...stage1Counts)} | ${average(stage1Times).toFixed(2)}ms |`);
    console.log(`| 2: Edge Pairing | ${average(stage2Counts).toFixed(1)} | ${median(stage2Counts)} | ${Math.max(...stage2Counts)} | ${average(stage2Times).toFixed(2)}ms |`);
    console.log(`| 3: 3x3 Phase | ${average(stage3Counts).toFixed(1)} | ${median(stage3Counts)} | ${Math.max(...stage3Counts)} | ${average(stage3Times).toFixed(2)}ms |`);
    console.log(`| 4: Parity Fix | ${average(stage4Counts).toFixed(1)} | ${median(stage4Counts)} | ${Math.max(...stage4Counts)} | - |`);
    console.log(`| TOTAL | ${average(totalCounts).toFixed(1)} | ${median(totalCounts)} | ${Math.max(...totalCounts)} | ${average(totalTimes).toFixed(2)}ms |`);

    const top5Redundant = Object.entries(redundantPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\nTop 5 Most Common Redundant Move Patterns:');
    top5Redundant.forEach(([pat, count], idx) => {
      console.log(`${idx + 1}. "${pat}" occurred ${count} times`);
    });

    expect(stage1Counts.length).toBe(300);
  });
});


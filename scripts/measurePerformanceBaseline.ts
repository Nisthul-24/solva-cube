import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { generate4x4RandomScramble, apply4x4Move } from '../src/solvers/cube4x4/cube4x4Geometry';
import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';

async function measure() {
  console.log('=== SolvaCube Performance Baseline Benchmark ===');

  // 1. Startup & Engine Load Time
  const tStart0 = Date.now();
  const eng4x4 = getPuzzleEngine('4x4');
  const tEngine = Date.now() - tStart0;
  console.log(`1. PuzzleEngine ('4x4') initialization time: ${tEngine} ms`);

  // 2. Memory baseline
  const memBefore = process.memoryUsage().heapUsed / (1024 * 1024);
  console.log(`2. Initial JS Heap: ${memBefore.toFixed(2)} MB`);

  // 3. 4x4 Solve Benchmark (100 scrambles): compute p50, p95, avg
  const solver = new Cube4x4Solver();
  const times: number[] = [];
  const N = 100;

  for (let i = 0; i < N; i++) {
    const scramble = generate4x4RandomScramble(25);
    let s = solver.getSolvedState();
    for (const m of scramble) s = apply4x4Move(s, m);

    const t0 = performance.now();
    await solver.solve(s);
    const dt = performance.now() - t0;
    times.push(dt);
  }

  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(N * 0.50)];
  const p95 = times[Math.floor(N * 0.95)];
  const avg = times.reduce((sum, v) => sum + v, 0) / N;

  console.log(`3. 4x4 Solve Time across ${N} scrambles:`);
  console.log(`   - Average: ${avg.toFixed(1)} ms`);
  console.log(`   - p50 (Median): ${p50.toFixed(1)} ms`);
  console.log(`   - p95: ${p95.toFixed(1)} ms`);
  console.log(`   - Min: ${times[0].toFixed(1)} ms | Max: ${times[times.length - 1].toFixed(1)} ms`);

  // 4. Memory after 5 repeated full solves
  if (global.gc) global.gc();
  const memAfter = process.memoryUsage().heapUsed / (1024 * 1024);
  console.log(`4. JS Heap after 100 solves: ${memAfter.toFixed(2)} MB (Delta: +${(memAfter - memBefore).toFixed(2)} MB)`);
}

measure().catch(console.error);


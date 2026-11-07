import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { apply4x4Move, generate4x4RandomScramble } from '../src/solvers/cube4x4/cube4x4Geometry';
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

export async function run4x4Benchmark(numScrambles = 300) {
  Cube.initSolver();
  const solver = new Cube4x4Solver();

  const cMovesList: number[] = [];
  const eMovesList: number[] = [];
  const r3MovesList: number[] = [];
  const pMovesList: number[] = [];
  const totalMovesList: number[] = [];
  const totalTimesList: number[] = [];

  console.log(`Starting 4x4 Benchmark on ${numScrambles} random scrambles...`);
  const benchStartTime = performance.now();

  for (let i = 0; i < numScrambles; i++) {
    // 100 random moves scramble
    const scramble = generate4x4RandomScramble(100);
    let state = solver.getSolvedState();
    for (const m of scramble) {
      state = apply4x4Move(state, m);
    }

    const tStart = performance.now();
    const solution = await solver.solve(state);
    const tEnd = performance.now();

    // Verify replay solves
    let replay = solver.cloneState(state);
    for (const m of solution) {
      replay = solver.applyMove(replay, m);
    }
    if (!solver.isSolved(replay)) {
      throw new Error(`Scramble ${i + 1} failed replay verification!`);
    }

    const cMoves = solution.filter((m) => m.stage?.includes('Centres')).length;
    const eMoves = solution.filter((m) => m.stage?.includes('Edges')).length;
    const r3Moves = solution.filter((m) => m.stage?.includes('3x3')).length;
    const pMoves = solution.filter((m) => m.stage?.includes('Parity')).length;

    cMovesList.push(cMoves);
    eMovesList.push(eMoves);
    r3MovesList.push(r3Moves);
    pMovesList.push(pMoves);
    totalMovesList.push(solution.length);
    totalTimesList.push(tEnd - tStart);

    if ((i + 1) % 50 === 0 || i === numScrambles - 1) {
      console.log(`  Processed ${i + 1}/${numScrambles} scrambles...`);
    }
  }

  const benchTotalTimeSec = ((performance.now() - benchStartTime) / 1000).toFixed(2);

  console.log('\n=================== 4X4 SOLVER BENCHMARK RESULTS ===================');
  console.log(`Scrambles: ${numScrambles} | Total Benchmark Time: ${benchTotalTimeSec}s`);
  console.log('| Stage | Average Moves | Median Moves | Max Moves |');
  console.log('|---|---|---|---|');
  console.log(`| Stage 1: Centres | ${average(cMovesList).toFixed(1)} | ${median(cMovesList)} | ${Math.max(...cMovesList)} |`);
  console.log(`| Stage 2: Edge Pairing | ${average(eMovesList).toFixed(1)} | ${median(eMovesList)} | ${Math.max(...eMovesList)} |`);
  console.log(`| Stage 3: 3x3 Phase | ${average(r3MovesList).toFixed(1)} | ${median(r3MovesList)} | ${Math.max(...r3MovesList)} |`);
  console.log(`| Stage 4: Parity | ${average(pMovesList).toFixed(1)} | ${median(pMovesList)} | ${Math.max(...pMovesList)} |`);
  console.log(`| **TOTAL** | **${average(totalMovesList).toFixed(1)}** | **${median(totalMovesList)}** | **${Math.max(...totalMovesList)}** |`);
  console.log(`Average solve time: ${average(totalTimesList).toFixed(1)} ms\n`);

  return {
    centres: { avg: average(cMovesList), med: median(cMovesList), max: Math.max(...cMovesList) },
    edges: { avg: average(eMovesList), med: median(eMovesList), max: Math.max(...eMovesList) },
    threeByThree: { avg: average(r3MovesList), med: median(r3MovesList), max: Math.max(...r3MovesList) },
    parity: { avg: average(pMovesList), med: median(pMovesList), max: Math.max(...pMovesList) },
    total: { avg: average(totalMovesList), med: median(totalMovesList), max: Math.max(...totalMovesList) },
    avgTimeMs: average(totalTimesList),
  };
}

if (require.main === module) {
  run4x4Benchmark(300).catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}


import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { generate4x4RandomScramble, apply4x4Move } from '../src/solvers/cube4x4/cube4x4Geometry';
import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';

async function testSolverMoves() {
  const solver = new Cube4x4Solver();
  const eng = getPuzzleEngine('4x4');
  const seenMoves = new Set<string>();

  for (let i = 0; i < 50; i++) {
    const scramble = generate4x4RandomScramble(20);
    let s = solver.getSolvedState();
    for (const m of scramble) s = apply4x4Move(s, m);

    const moves = await solver.solve(s);
    for (const m of moves) {
      seenMoves.add(m.notation);
    }
  }

  console.log('Moves emitted by 4x4 solver count:', seenMoves.size);
  console.log('Unique moves emitted:', Array.from(seenMoves).sort());

  // Check if every move is in puzzleEngine
  for (const m of seenMoves) {
    const inEngine = eng.moves.has(m);
    if (!inEngine) {
      console.error(`Move ${m} NOT found in puzzleEngine!`);
    }
  }
  console.log('All emitted moves exist in puzzleEngine!');
}

testSolverMoves().catch(console.error);


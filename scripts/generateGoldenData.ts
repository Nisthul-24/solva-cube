import fs from 'fs';
import path from 'path';
import {
  Cube3x3State,
  DEFAULT_3X3_SOLVED,
  FaceName3x3,
  applyMoveTo3x3State,
  clone3x3State,
} from '../src/solvers/cube3x3/cube3x3Facelets';
import {
  Cube2x2State,
  DEFAULT_2X2_SOLVED,
  FaceName2x2,
  applyMoveTo2x2State,
  clone2x2State,
} from '../src/solvers/cube2x2/cube2x2Facelets';
import { Cube3x3Solver } from '../src/solvers/cube3x3/cube3x3Solver';
import { Cube2x2Solver } from '../src/solvers/cube2x2/cube2x2Solver';

const SNAPSHOT_DIR = path.join(__dirname, '..', '__tests__', 'golden_snapshots');
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// PRNG: Mulberry32
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261107);

const FACES_3X3: FaceName3x3[] = ['U', 'R', 'F', 'D', 'L', 'B'];
const MOVES_3X3 = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

const FACES_2X2: FaceName2x2[] = ['U', 'R', 'F', 'D', 'L', 'B'];
const MOVES_2X2 = [
  'U', "U'", 'U2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'B', "B'", 'B2',
];

// 1. Compute Permutation Tables
console.log('Generating 3x3 and 2x2 permutation tables...');
const permutations: Record<string, Record<string, string[]>> = {
  cube3x3: {},
  cube2x2: {},
};

// 3x3
for (const m of MOVES_3X3) {
  // Label state: face_idx
  const labelledState: Cube3x3State = {
    U: [] as any, R: [] as any, F: [] as any, D: [] as any, L: [] as any, B: [] as any
  };
  for (const f of FACES_3X3) {
    for (let i = 0; i < 9; i++) {
      labelledState[f].push(`${f}${i}` as any);
    }
  }
  const moved = applyMoveTo3x3State(labelledState, m);
  const flat: string[] = [];
  for (const f of FACES_3X3) {
    for (let i = 0; i < 9; i++) {
      flat.push(moved[f][i] as any);
    }
  }
  permutations.cube3x3[m] = flat;
}

// 2x2
for (const m of MOVES_2X2) {
  const labelledState: Cube2x2State = {
    U: [] as any, R: [] as any, F: [] as any, D: [] as any, L: [] as any, B: [] as any
  };
  for (const f of FACES_2X2) {
    for (let i = 0; i < 4; i++) {
      labelledState[f].push(`${f}${i}` as any);
    }
  }
  const moved = applyMoveTo2x2State(labelledState, m);
  const flat: string[] = [];
  for (const f of FACES_2X2) {
    for (let i = 0; i < 4; i++) {
      flat.push(moved[f][i] as any);
    }
  }
  permutations.cube2x2[m] = flat;
}

fs.writeFileSync(
  path.join(SNAPSHOT_DIR, 'goldenPermutations.json'),
  JSON.stringify(permutations, null, 2),
  'utf8'
);
console.log('Saved goldenPermutations.json');

// 2. Generate 50 Fixed Scrambles and Solve
async function generateScrambles50() {
  console.log('Generating 50 fixed scrambles and solutions for 3x3 and 2x2...');
  const solver3x3 = new Cube3x3Solver();
  const solver2x2 = new Cube2x2Solver();

  const scramblesData = {
    cube3x3: [] as Array<{ scrambleIndex: number; scramble: string[]; solution: string[] }>,
    cube2x2: [] as Array<{ scrambleIndex: number; scramble: string[]; solution: string[] }>,
  };

  // 3x3 50 scrambles
  for (let i = 0; i < 50; i++) {
    const scrambleLen = 20;
    const scramble: string[] = [];
    let lastFace = '';
    for (let s = 0; s < scrambleLen; s++) {
      let m: string;
      do {
        m = MOVES_3X3[Math.floor(rng() * MOVES_3X3.length)];
      } while (m[0] === lastFace);
      lastFace = m[0];
      scramble.push(m);
    }

    let state = clone3x3State(DEFAULT_3X3_SOLVED);
    for (const m of scramble) {
      state = applyMoveTo3x3State(state, m);
    }

    const sol = await solver3x3.solve(state);
    scramblesData.cube3x3.push({
      scrambleIndex: i + 1,
      scramble,
      solution: sol.map((step) => step.notation),
    });
  }

  // 2x2 50 scrambles
  for (let i = 0; i < 50; i++) {
    const scrambleLen = 11;
    const scramble: string[] = [];
    let lastFace = '';
    const pool = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2'];
    for (let s = 0; s < scrambleLen; s++) {
      let m: string;
      do {
        m = pool[Math.floor(rng() * pool.length)];
      } while (m[0] === lastFace);
      lastFace = m[0];
      scramble.push(m);
    }

    let state = clone2x2State(DEFAULT_2X2_SOLVED);
    for (const m of scramble) {
      state = applyMoveTo2x2State(state, m);
    }

    const sol = await solver2x2.solve(state);
    scramblesData.cube2x2.push({
      scrambleIndex: i + 1,
      scramble,
      solution: sol.map((step) => step.notation),
    });
  }

  fs.writeFileSync(
    path.join(SNAPSHOT_DIR, 'goldenScrambles50.json'),
    JSON.stringify(scramblesData, null, 2),
    'utf8'
  );
  console.log('Saved goldenScrambles50.json');
}

generateScrambles50().catch((err) => {
  console.error(err);
  process.exit(1);
});


import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const SNAPSHOT_DIR = path.join(__dirname, 'golden_snapshots');
const IMAGES_DIR = path.join(SNAPSHOT_DIR, 'images');

describe('0. FREEZE 3x3 and 2x2 Golden Snapshots Test Suite', () => {
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

  test('3x3 and 2x2 move permutation tables match golden snapshot exactly', () => {
    const goldenPerms = JSON.parse(
      fs.readFileSync(path.join(SNAPSHOT_DIR, 'goldenPermutations.json'), 'utf8')
    );

    // 3x3
    for (const m of MOVES_3X3) {
      const labelledState: Cube3x3State = {
        U: [] as any, R: [] as any, F: [] as any, D: [] as any, L: [] as any, B: [] as any,
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
      expect(flat).toEqual(goldenPerms.cube3x3[m]);
    }

    // 2x2
    for (const m of MOVES_2X2) {
      const labelledState: Cube2x2State = {
        U: [] as any, R: [] as any, F: [] as any, D: [] as any, L: [] as any, B: [] as any,
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
      expect(flat).toEqual(goldenPerms.cube2x2[m]);
    }
  });

  test('3x3 and 2x2 solver output for 50 fixed scrambles match golden snapshot exactly', async () => {
    const goldenScrambles = JSON.parse(
      fs.readFileSync(path.join(SNAPSHOT_DIR, 'goldenScrambles50.json'), 'utf8')
    );
    const solver3x3 = new Cube3x3Solver();
    const solver2x2 = new Cube2x2Solver();

    // Verify 3x3 fixed scrambles
    for (const item of goldenScrambles.cube3x3) {
      let state = clone3x3State(DEFAULT_3X3_SOLVED);
      for (const m of item.scramble) {
        state = applyMoveTo3x3State(state, m);
      }
      const sol = await solver3x3.solve(state);
      const notations = sol.map((s) => s.notation);
      expect(notations).toEqual(item.solution);
    }

    // Verify 2x2 fixed scrambles
    for (const item of goldenScrambles.cube2x2) {
      let state = clone2x2State(DEFAULT_2X2_SOLVED);
      for (const m of item.scramble) {
        state = applyMoveTo2x2State(state, m);
      }
      const sol = await solver2x2.solve(state);
      const notations = sol.map((s) => s.notation);
      expect(notations).toEqual(item.solution);
    }
  }, 60000);

  test('All Playwright golden screenshots exist and match manifest checksums', () => {
    const manifestPath = path.join(SNAPSHOT_DIR, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest: Record<string, string> = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const filenames = Object.keys(manifest);

    // Expect at least:
    // 3 viewports * (1 input 3x3 + 1 input 2x2 + 1 wait 3x3 + 18 moves 3x3 + 1 wait 2x2 + 9 moves 2x2) = 3 * 31 = 93 images
    expect(filenames.length).toBeGreaterThanOrEqual(93);

    for (const f of filenames) {
      const fullPath = path.join(IMAGES_DIR, f);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      expect(hash).toBe(manifest[f]);
    }
  });
});


import { PUZZLE_LEARN_CONTENT, get4x4DynamicNotations } from '../src/constants/learnContent';
import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';
import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { generate4x4RandomScramble, apply4x4Move } from '../src/solvers/cube4x4/cube4x4Geometry';

describe('PART 2: "How to Use & Notation" 4x4 Tab Suite', () => {
  const c4 = PUZZLE_LEARN_CONTENT['4x4'];

  test('4x4 content exists and contains required sections', () => {
    expect(c4).toBeDefined();
    expect(c4.title).toContain('4x4');
    expect(c4.title).not.toContain("Rubik's");

    // How to hold: orientation from corners (no fixed centres)
    const holdText = c4.howToHold.description + ' ' + c4.howToHold.bullets.join(' ');
    expect(holdText.toLowerCase()).toContain('orientation');
    expect(holdText.toLowerCase()).toContain('corners');
    expect(holdText.toLowerCase()).toContain('no fixed centre');

    // 4-step solution overview: centres, edges, 3x3 stage, parity
    expect(c4.solutionSteps).toBeDefined();
    expect(c4.solutionSteps!.length).toBe(4);
    const stepTitles = c4.solutionSteps!.map((s) => s.title.toLowerCase());
    expect(stepTitles.some((t) => t.includes('centre'))).toBe(true);
    expect(stepTitles.some((t) => t.includes('edge'))).toBe(true);
    expect(stepTitles.some((t) => t.includes('3x3'))).toBe(true);
    expect(stepTitles.some((t) => t.includes('parit'))).toBe(true);

    // Parity definition
    expect(c4.parityDefinition).toBeDefined();
    expect(c4.parityDefinition).toContain('impossible on a 3x3');
  });

  test('Move notation is generated from puzzleEngine: text and direction match 100%', () => {
    const eng = getPuzzleEngine('4x4');
    const dynamicNotations = get4x4DynamicNotations();
    expect(dynamicNotations.length).toBeGreaterThanOrEqual(40);

    for (const n of dynamicNotations) {
      const engMove = eng.getMove(n.move);
      expect(engMove).toBeDefined();
      expect(n.desc).toBe(engMove!.fullInstruction);
      const expectedDir = engMove!.isDouble ? 'DOUBLE' : engMove!.isCCW ? 'CCW' : 'CW';
      expect(n.dir).toBe(expectedDir);
      expect(n.face).toBe(engMove!.layerName);
    }
  });

  test('Every move emitted by the 4x4 solver appears in the 4x4 tab notations', async () => {
    const solver = new Cube4x4Solver();
    const notationMoves = new Set(c4.notations.map((n) => n.move));

    // Also include normalized alias (e.g. if solver emits 'r', both 'r' and '2R' are valid)
    const N_SCRAMBLES = 50;
    const allEmittedMoves = new Set<string>();

    for (let i = 0; i < N_SCRAMBLES; i++) {
      const scramble = generate4x4RandomScramble(25);
      let s = solver.getSolvedState();
      for (const m of scramble) s = apply4x4Move(s, m);

      const moves = await solver.solve(s);
      for (const m of moves) {
        allEmittedMoves.add(m.notation);
      }
    }

    expect(allEmittedMoves.size).toBeGreaterThan(20);

    for (const m of allEmittedMoves) {
      const appears = notationMoves.has(m);
      if (!appears) {
        throw new Error(`Move "${m}" emitted by 4x4 solver does NOT appear in 4x4 notation tab!`);
      }
      expect(appears).toBe(true);
    }
  }, 60000);

  test('No guide titles contain "Rubik\'s"', () => {
    for (const [id, content] of Object.entries(PUZZLE_LEARN_CONTENT)) {
      expect(content.title).not.toContain("Rubik's");
    }
  });
});


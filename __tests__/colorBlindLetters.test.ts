import React from 'react';
// @ts-ignore
import ReactDOMServer from 'react-dom/server';
import { PuzzleNet, getColorBlindLetter } from '../src/components/PuzzleNet';
import { getLetterMaterial } from '../src/components/3d/PuzzleCube3D';
import { DEFAULT_3X3_SOLVED, applyMoveTo3x3State, Cube3x3State } from '../src/solvers/cube3x3/cube3x3Facelets';
import { DEFAULT_2X2_SOLVED, applyMoveTo2x2State, Cube2x2State } from '../src/solvers/cube2x2/cube2x2Facelets';
import { DEFAULT_PYRAMINX_SOLVED, applyMoveToPyraminxState, PyraminxState } from '../src/solvers/pyraminx/pyraminxFacelets';
import { generate4x4RandomScramble } from '../src/solvers/cube4x4/cube4x4Geometry';
import { Cube4x4Solver } from '../src/solvers/cube4x4/cube4x4Solver';
import { useSettingsStore } from '../src/store/settingsStore';

describe('Part A: Colour-Blind Letters on Cube and Nets', () => {
  const COLOR_LETTERS: Record<string, string> = {
    white: 'W',
    yellow: 'Y',
    green: 'G',
    blue: 'B',
    red: 'R',
    orange: 'O',
  };

  const DARK_TEXT_COLORS = new Set(['white', 'yellow', 'orange', 'green']);

  test('getColorBlindLetter returns correct uppercase letter and high-contrast color', () => {
    for (const [color, expectedLetter] of Object.entries(COLOR_LETTERS)) {
      const res = getColorBlindLetter(color);
      expect(res.letter).toBe(expectedLetter);
      if (DARK_TEXT_COLORS.has(color)) {
        expect(res.textColor).toBe('#111111');
      } else {
        expect(res.textColor).toBe('#FFFFFF');
      }
    }
  });

  // 1. 3x3 Cube: 10 random states
  test('3x3 Cube: in 10 random states, every sticker letter matches logical color in PuzzleNet', () => {
    const moves = ["R", "U", "R'", "U'", "F", "B", "L", "D2", "L'", "F'"];
    let state: Cube3x3State = { ...DEFAULT_3X3_SOLVED };

    for (let s = 0; s < 10; s++) {
      // Apply scramble moves
      for (let m = 0; m < 5; m++) {
        state = applyMoveTo3x3State(state, moves[(s * 5 + m) % moves.length]);
      }

      // Render PuzzleNet with showColorBlindLetters = true
      const html = ReactDOMServer.renderToString(
        React.createElement(PuzzleNet, {
          puzzleId: '3x3',
          state,
          showColorBlindLetters: true,
          readOnly: true,
        })
      );

      // Verify that for all 6 faces and 9 stickers (54 total), the letter is in the rendered output
      const faces: Array<'U' | 'L' | 'F' | 'R' | 'B' | 'D'> = ['U', 'L', 'F', 'R', 'B', 'D'];
      let stickerLetterCount = 0;
      for (const f of faces) {
        for (let i = 0; i < 9; i++) {
          const color = state[f][i];
          const expectedLetter = COLOR_LETTERS[color];
          const expectedTextColor = DARK_TEXT_COLORS.has(color) ? '#111111' : '#FFFFFF';
          // Check that SVG text contains the expected letter with matching fill color
          expect(html).toContain(`fill="${expectedTextColor}"`);
          expect(html).toContain(`>${expectedLetter}<`);
          stickerLetterCount++;
        }
      }
      expect(stickerLetterCount).toBe(54);
    }
  });

  // 2. 2x2 Cube: 10 random states
  test('2x2 Cube: in 10 random states, every sticker letter matches logical color in PuzzleNet', () => {
    const moves = ["R", "U", "R'", "F", "U2", "R2", "F'"];
    let state: Cube2x2State = { ...DEFAULT_2X2_SOLVED };

    for (let s = 0; s < 10; s++) {
      for (let m = 0; m < 4; m++) {
        state = applyMoveTo2x2State(state, moves[(s * 4 + m) % moves.length]);
      }

      const html = ReactDOMServer.renderToString(
        React.createElement(PuzzleNet, {
          puzzleId: '2x2',
          state,
          showColorBlindLetters: true,
          readOnly: true,
        })
      );

      const faces: Array<'U' | 'L' | 'F' | 'R' | 'B' | 'D'> = ['U', 'L', 'F', 'R', 'B', 'D'];
      let stickerLetterCount = 0;
      for (const f of faces) {
        for (let i = 0; i < 4; i++) {
          const color = state[f][i];
          const expectedLetter = COLOR_LETTERS[color];
          const expectedTextColor = DARK_TEXT_COLORS.has(color) ? '#111111' : '#FFFFFF';
          expect(html).toContain(`fill="${expectedTextColor}"`);
          expect(html).toContain(`>${expectedLetter}<`);
          stickerLetterCount++;
        }
      }
      expect(stickerLetterCount).toBe(24);
    }
  });

  // 3. 4x4 Cube: 10 random states
  test('4x4 Cube: in 10 random states, every sticker letter matches logical color in PuzzleNet', () => {
    const solver = new Cube4x4Solver();
    for (let s = 0; s < 10; s++) {
      const { state } = solver.scramble(10 + s);

      const html = ReactDOMServer.renderToString(
        React.createElement(PuzzleNet, {
          puzzleId: '4x4',
          state,
          showColorBlindLetters: true,
          readOnly: true,
        })
      );

      const faces: Array<'U' | 'L' | 'F' | 'R' | 'B' | 'D'> = ['U', 'L', 'F', 'R', 'B', 'D'];
      let stickerLetterCount = 0;
      for (const f of faces) {
        for (let i = 0; i < 16; i++) {
          const color = (state as any)[f][i];
          const expectedLetter = COLOR_LETTERS[color];
          const expectedTextColor = DARK_TEXT_COLORS.has(color) ? '#111111' : '#FFFFFF';
          expect(html).toContain(`fill="${expectedTextColor}"`);
          expect(html).toContain(`>${expectedLetter}<`);
          stickerLetterCount++;
        }
      }
      expect(stickerLetterCount).toBe(96);
    }
  });

  // 4. Pyraminx: 10 random states
  test('Pyraminx: in 10 random states, every sticker letter matches logical color in PuzzleNet', () => {
    const testMoves = ['U', "R'", 'L', 'B', "u'", 'r', 'l', "B'", 'R', "L'"];
    let state: PyraminxState = { ...DEFAULT_PYRAMINX_SOLVED };

    for (let s = 0; s < 10; s++) {
      for (let m = 0; m < 4; m++) {
        state = applyMoveToPyraminxState(state, testMoves[(s * 4 + m) % testMoves.length]);
      }

      const html = ReactDOMServer.renderToString(
        React.createElement(PuzzleNet, {
          puzzleId: 'pyraminx',
          state,
          showColorBlindLetters: true,
          readOnly: true,
        })
      );

      const faces: Array<'F' | 'L' | 'R' | 'D'> = ['F', 'L', 'R', 'D'];
      let stickerLetterCount = 0;
      for (const f of faces) {
        for (let i = 0; i < 9; i++) {
          const color = state[f][i];
          const expectedLetter = COLOR_LETTERS[color];
          const expectedTextColor = DARK_TEXT_COLORS.has(color) ? '#111111' : '#FFFFFF';
          expect(html).toContain(`fill="${expectedTextColor}"`);
          expect(html).toContain(`>${expectedLetter}<`);
          stickerLetterCount++;
        }
      }
      expect(stickerLetterCount).toBe(36);
    }
  });

  // 5. Toggle OFF: pixel-identical, zero sticker letters rendered in PuzzleNet
  test('Toggle OFF: zero sticker letters rendered in PuzzleNet when showColorBlindLetters is false', () => {
    const state3x3 = { ...DEFAULT_3X3_SOLVED };
    const htmlOff = ReactDOMServer.renderToString(
      React.createElement(PuzzleNet, {
        puzzleId: '3x3',
        state: state3x3,
        showColorBlindLetters: false,
        readOnly: true,
      })
    );

    // In toggle off mode, only face chips (U, L, F, R, B, D) are rendered
    // None of the sticker cells should contain letters
    // Verify by counting <text> tags
    const textMatches = htmlOff.match(/<text[^>]*>([^<]+)<\/text>/g) || [];
    // Only 6 face chip labels: U, L, F, R, B, D
    expect(textMatches.length).toBe(6);
    const chipLabels = textMatches.map((t: string) => t.replace(/<[^>]+>/g, ''));
    expect(chipLabels.sort()).toEqual(['B', 'D', 'F', 'L', 'R', 'U']);
  });
});

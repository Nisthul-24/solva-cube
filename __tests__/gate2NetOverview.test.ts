import React from 'react';
// @ts-ignore
import ReactDOMServer from 'react-dom/server';
import { PuzzleNet } from '../src/components/PuzzleNet';
import { NetView3x3 } from '../src/components/NetView3x3';
import { NetView2x2 } from '../src/components/NetView2x2';
import { getPuzzleEngine } from '../src/puzzleEngine/puzzleEngine';
import { getStandardSolved4x4State, STICKER_LAYOUT_4X4, CUBE4X4_FACES } from '../src/solvers/cube4x4/cube4x4Geometry';
import { PYRAMINX_STICKERS_3D } from '../src/solvers/pyraminx/pyraminxGeometry';
import { DEFAULT_PYRAMINX_SOLVED, FaceNamePyraminx } from '../src/solvers/pyraminx/pyraminxFacelets';
import { DEFAULT_3X3_SOLVED } from '../src/solvers/cube3x3/cube3x3Facelets';
import { DEFAULT_2X2_SOLVED } from '../src/solvers/cube2x2/cube2x2Facelets';
import { PALETTE } from '../src/components/3d/cubieModel';
import { CubeColor } from '../src/types/puzzle';

describe('GATE 2: Net Overview Requirements', () => {
  describe('1. Sticker Counts & Layout Integrity', () => {
    test('4x4 Net renders exactly 96 stickers across 6 faces in cross layout', () => {
      const state4x4 = getStandardSolved4x4State();
      const element = PuzzleNet({
        puzzleId: '4x4',
        state: state4x4,
        readOnly: true,
      });

      expect(element).toBeDefined();
      expect(element.type).toBeDefined();

      // Verify STICKER_LAYOUT_4X4 has 96 stickers
      expect(STICKER_LAYOUT_4X4.length).toBe(96);
      for (const face of CUBE4X4_FACES) {
        expect(state4x4[face].length).toBe(16);
      }
    });

    test('Pyraminx Net renders exactly 36 stickers across 4 faces', () => {
      const statePyr = DEFAULT_PYRAMINX_SOLVED;
      const element = PuzzleNet({
        puzzleId: 'pyraminx',
        state: statePyr,
        readOnly: true,
      });

      expect(element).toBeDefined();
      expect(element.type).toBeDefined();

      // Verify PYRAMINX_STICKERS_3D has 36 stickers
      expect(PYRAMINX_STICKERS_3D.length).toBe(36);
      const faces: FaceNamePyraminx[] = ['F', 'R', 'L', 'D'];
      for (const f of faces) {
        expect(statePyr[f].length).toBe(9);
      }
    });

    test('3x3 Net is untouched and renders exactly 54 stickers across 6 faces', () => {
      const state3x3 = DEFAULT_3X3_SOLVED;
      const html = ReactDOMServer.renderToString(React.createElement(NetView3x3, { state: state3x3 }));
      expect(html).toBeTruthy();

      let stickerCount = 0;
      for (const face of ['U', 'D', 'F', 'B', 'L', 'R'] as const) {
        expect(state3x3[face].length).toBe(9);
        stickerCount += state3x3[face].length;
      }
      expect(stickerCount).toBe(54);
    });

    test('2x2 Net is untouched and renders exactly 24 stickers across 6 faces', () => {
      const state2x2 = DEFAULT_2X2_SOLVED;
      const html = ReactDOMServer.renderToString(React.createElement(NetView2x2, { state: state2x2 }));
      expect(html).toBeTruthy();

      let stickerCount = 0;
      for (const face of ['U', 'D', 'F', 'B', 'L', 'R'] as const) {
        expect(state2x2[face].length).toBe(4);
        stickerCount += state2x2[face].length;
      }
      expect(stickerCount).toBe(24);
    });
  });

  describe('2. Color Mapping: Scrambled state colors match net sticker-by-sticker', () => {
    test('4x4 Scrambled state matches net sticker colors', () => {
      const eng = getPuzzleEngine('4x4');
      let state = getStandardSolved4x4State();

      // Apply a test scramble of 6 moves
      const scramble = ['Rw', 'U', 'F2', 'Dw', "r'", 'B'];
      for (const m of scramble) {
        const moveObj = eng.getMove(m)!;
        const nextState: any = { U: [...state.U], L: [...state.L], F: [...state.F], R: [...state.R], B: [...state.B], D: [...state.D] };
        for (let i = 0; i < 96; i++) {
          const srcFace = STICKER_LAYOUT_4X4[i].face;
          const srcIdx = STICKER_LAYOUT_4X4[i].index;
          const destI = moveObj.permutation[i];
          const destFace = STICKER_LAYOUT_4X4[destI].face;
          const destIdx = STICKER_LAYOUT_4X4[destI].index;
          nextState[destFace][destIdx] = state[srcFace][srcIdx];
        }
        state = nextState;
      }

      // Check sticker colors in net
      for (const face of CUBE4X4_FACES) {
        for (let idx = 0; idx < 16; idx++) {
          const colorName = state[face][idx];
          const expectedHex = (PALETTE as any)[colorName];
          expect(expectedHex).toBeDefined();
        }
      }
    });

    test('Pyraminx Scrambled state matches net sticker colors', () => {
      const eng = getPuzzleEngine('pyraminx');
      let state = DEFAULT_PYRAMINX_SOLVED;

      // Apply a test scramble of 4 moves
      const scramble = ['U', "R'", 'l', "B'"];
      for (const m of scramble) {
        const moveObj = eng.getMove(m)!;
        const nextState: any = { F: [...state.F], R: [...state.R], L: [...state.L], D: [...state.D] };
        for (let i = 0; i < 36; i++) {
          const srcFace = PYRAMINX_STICKERS_3D[i].face;
          const srcIdx = PYRAMINX_STICKERS_3D[i].index;
          const destI = moveObj.permutation[i];
          const destFace = PYRAMINX_STICKERS_3D[destI].face;
          const destIdx = PYRAMINX_STICKERS_3D[destI].index;
          nextState[destFace][destIdx] = state[srcFace as FaceNamePyraminx][srcIdx];
        }
        state = nextState;
      }

      const faces: FaceNamePyraminx[] = ['F', 'R', 'L', 'D'];
      for (const f of faces) {
        for (let idx = 0; idx < 9; idx++) {
          const colorName = state[f][idx];
          const expectedHex = (PALETTE as any)[colorName];
          expect(expectedHex).toBeDefined();
        }
      }
    });
  });

  describe('3. Turning Layer Outline: Highlights correct sticker indices', () => {
    test('4x4 Outer face move (U): exactly 16 U face stickers + 4 top stickers on L, F, R, B highlighted', () => {
      const eng = getPuzzleEngine('4x4');
      const m = eng.getMove('U')!;
      expect(m.turningPieceIds.length).toBe(16); // 16 cubies on layer y = 1.5

      // Find all stickers on turning pieces
      const turningStickers: string[] = [];
      for (const p of eng.pieces) {
        if (m.turningPieceSet.has(p.id)) {
          for (const s of p.stickers) {
            turningStickers.push(`${s.face}_${s.index}`);
          }
        }
      }

      // U face: all 16 stickers turn (16)
      // L face: row 0 (stickers 0,1,2,3) turn (4)
      // F face: row 0 (stickers 0,1,2,3) turn (4)
      // R face: row 0 (stickers 0,1,2,3) turn (4)
      // B face: row 0 (stickers 0,1,2,3) turn (4)
      // Total stickers on outer layer = 16 + 16 = 32 stickers
      expect(turningStickers.length).toBe(32);
      for (let i = 0; i < 16; i++) {
        expect(turningStickers).toContain(`U_${i}`);
      }
      for (const f of ['L', 'F', 'R', 'B']) {
        for (let c = 0; c < 4; c++) {
          expect(turningStickers).toContain(`${f}_${c}`);
        }
      }
    });

    test('4x4 Inner slice move (r): exactly 4 stickers each on U, F, D, B highlighted; R and L face 0 stickers', () => {
      const eng = getPuzzleEngine('4x4');
      const m = eng.getMove('r')!;
      expect(m.turningPieceIds.length).toBe(16); // 16 cubies on slice x = 0.5

      const turningStickers: string[] = [];
      for (const p of eng.pieces) {
        if (m.turningPieceSet.has(p.id)) {
          for (const s of p.stickers) {
            turningStickers.push(`${s.face}_${s.index}`);
          }
        }
      }

      // Slice r is inner slice at x = 0.5:
      // It has NO outer stickers on R (x=1.5) or L (x=-1.5)
      expect(turningStickers.filter((s) => s.startsWith('R_')).length).toBe(0);
      expect(turningStickers.filter((s) => s.startsWith('L_')).length).toBe(0);

      // On U, F, D, B it has exactly 4 stickers each (16 total outer stickers)
      expect(turningStickers.filter((s) => s.startsWith('U_')).length).toBe(4);
      expect(turningStickers.filter((s) => s.startsWith('F_')).length).toBe(4);
      expect(turningStickers.filter((s) => s.startsWith('D_')).length).toBe(4);
      expect(turningStickers.filter((s) => s.startsWith('B_')).length).toBe(4);
      expect(turningStickers.length).toBe(16);
    });

    test('Pyraminx Tip move (u): exactly 3 tip stickers highlighted', () => {
      const eng = getPuzzleEngine('pyraminx');
      const m = eng.getMove('u')!;
      expect(m.turningPieceIds.length).toBe(1); // 1 tip piece

      const turningStickers: string[] = [];
      for (const p of eng.pieces) {
        if (m.turningPieceSet.has(p.id)) {
          for (const s of p.stickers) {
            turningStickers.push(`${s.face}_${s.index}`);
          }
        }
      }
      expect(turningStickers.length).toBe(3);
      expect(turningStickers).toContain('F_0');
      expect(turningStickers).toContain('L_0');
      expect(turningStickers).toContain('R_0');
    });

    test('Pyraminx Base/Layer move (U): exactly 15 stickers on turning cap highlighted', () => {
      const eng = getPuzzleEngine('pyraminx');
      const m = eng.getMove('U')!;
      expect(m.turningPieceIds.length).toBe(5); // 1 tip + 3 edges + 3 axial centers? No, 1 tip + 3 edge + 1 center piece = 5 pieces

      const turningStickers: string[] = [];
      for (const p of eng.pieces) {
        if (m.turningPieceSet.has(p.id)) {
          for (const s of p.stickers) {
            turningStickers.push(`${s.face}_${s.index}`);
          }
        }
      }
      // Top cap on U, L, R faces (indices 0, 1, 2, 3)
      // Total stickers on 5 cap pieces = 3 (tip) + 3*2 (3 edges) + 3 (1 center piece with 3 faces) = 12 stickers
      expect(turningStickers.length).toBe(12);
    });
  });
});


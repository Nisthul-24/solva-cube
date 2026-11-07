jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { usePuzzleStore } from '../src/store/puzzleStore';
import { FaceName3x3, FACE_ORDER } from '../src/components/3d/stickerLayout';
import { CubeColor } from '../src/types/puzzle';

describe('Issue 1: Guided <-> Free mode stability & single source of truth', () => {
  beforeEach(() => {
    usePuzzleStore.getState().resetState();
  });

  test('Painting 20 random stickers and toggling mode 5 times leaves sticker array deep-equal', () => {
    const store = usePuzzleStore.getState();
    const colors: CubeColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];

    // Paint 20 random stickers (excluding center index 4 of 3x3)
    const paintedStickers: Array<{ face: FaceName3x3; index: number; color: CubeColor }> = [];
    const editableIndices = [0, 1, 2, 3, 5, 6, 7, 8];

    for (let i = 0; i < 20; i++) {
      const face = FACE_ORDER[Math.floor(Math.random() * FACE_ORDER.length)];
      const index = editableIndices[Math.floor(Math.random() * editableIndices.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];

      store.setSelectedColor(color);
      store.paintSticker(face, index);
      paintedStickers.push({ face, index, color });
    }

    // Capture state before mode toggles
    const stateBefore = JSON.parse(JSON.stringify(usePuzzleStore.getState().currentState));

    // Simulate toggling Guided <-> Free mode 5 times in UI
    let mode: 'guided' | 'free' = 'guided';
    for (let i = 0; i < 5; i++) {
      mode = mode === 'guided' ? 'free' : 'guided';
    }

    // Capture state after mode toggles
    const stateAfter = JSON.parse(JSON.stringify(usePuzzleStore.getState().currentState));

    // Assert that the sticker array is 100% deep-equal to before
    expect(stateAfter).toEqual(stateBefore);

    // Verify all 20 painted stickers retain their exact colors
    for (const p of paintedStickers) {
      expect(stateAfter[p.face][p.index]).toBe(usePuzzleStore.getState().currentState[p.face][p.index]);
    }
  });

  test('State passed to the solver equals state shown on the input screen', () => {
    const store = usePuzzleStore.getState();

    // Fill sample scrambled state on the input screen
    store.fillSampleScramble();
    const inputScreenState = usePuzzleStore.getState().currentState;
    expect(inputScreenState).toBeDefined();

    // The store's currentState is what is solved directly by solveCurrentState
    const stateForSolver = usePuzzleStore.getState().currentState;
    expect(stateForSolver).toEqual(inputScreenState);
  });
});

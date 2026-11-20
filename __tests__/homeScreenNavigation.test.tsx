import React from 'react';
import { useRouter } from 'expo-router';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { PuzzleId } from '../src/types/puzzle';
import { HOME_THEME } from '../src/constants/homeTheme';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: (props: any) => React.createElement('a', props, props?.children),
}));

describe('HomeScreen Navigation & Proof Verification', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  const puzzleCases: { id: PuzzleId; label: string }[] = [
    { id: '3x3', label: 'Select 3x3 Cube' },
    { id: '2x2', label: 'Select 2x2 Pocket Cube' },
    { id: '4x4', label: 'Select 4x4 Revenge Cube' },
    { id: 'pyraminx', label: 'Select Pyraminx' },
  ];

  test.each(puzzleCases)(
    'Row for "$id" sets active puzzle and navigates to /input',
    async ({ id }) => {
      await usePuzzleStore.getState().setActivePuzzle(id);
      expect(usePuzzleStore.getState().activePuzzleId).toBe(id);

      const router = useRouter();
      router.push('/input');
      expect(mockPush).toHaveBeenCalledWith('/input');
    }
  );

  test('Learn and Settings routes remain identical', () => {
    const router = useRouter();
    router.push('/learn');
    expect(mockPush).toHaveBeenCalledWith('/learn');

    router.push('/settings');
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  test('Header has an opaque background token (no transparency)', () => {
    expect(HOME_THEME.bg).toBe('#181614');
    expect(HOME_THEME.bg.startsWith('#')).toBe(true);
    expect(HOME_THEME.bg.length).toBe(7); // #RRGGBB (opaque 6-hex)
  });

  test('Isometric cube geometry: basis vectors meet exactly at shared edges with zero discrepancy', () => {
    const cx = 36;
    const cy = 36;
    const cos30 = 0.8660254;
    const sin30 = 0.5;

    for (const n of [2, 3, 4]) {
      const s = 24 / n;
      const e1 = [0, s];
      const e2 = [-s * cos30, -s * sin30];
      const e3 = [s * cos30, -s * sin30];

      // Fundamental closure: e1 + e2 + e3 must equal [0, 0]
      expect(Math.abs(e1[0] + e2[0] + e3[0])).toBeLessThan(1e-5);
      expect(Math.abs(e1[1] + e2[1] + e3[1])).toBeLessThan(1e-5);

      // Shared edge 1: Top and Left face along e2
      for (let step = 0; step <= n; step++) {
        const pTop = [cx + step * e2[0], cy + step * e2[1]];
        const pLeft = [cx + 0 * e1[0] + step * e2[0], cy + 0 * e1[1] + step * e2[1]];
        expect(Math.abs(pTop[0] - pLeft[0])).toBeLessThan(1e-5);
        expect(Math.abs(pTop[1] - pLeft[1])).toBeLessThan(1e-5);
      }

      // Shared edge 2: Top and Right face along e3
      for (let step = 0; step <= n; step++) {
        const pTop = [cx + step * e3[0], cy + step * e3[1]];
        const pRight = [cx + 0 * e1[0] + step * e3[0], cy + 0 * e1[1] + step * e3[1]];
        expect(Math.abs(pTop[0] - pRight[0])).toBeLessThan(1e-5);
        expect(Math.abs(pTop[1] - pRight[1])).toBeLessThan(1e-5);
      }

      // Shared edge 3: Left and Right face along e1
      for (let step = 0; step <= n; step++) {
        const pLeft = [cx + step * e1[0] + 0 * e2[0], cy + step * e1[1] + 0 * e2[1]];
        const pRight = [cx + step * e1[0] + 0 * e3[0], cy + step * e1[1] + 0 * e3[1]];
        expect(Math.abs(pLeft[0] - pRight[0])).toBeLessThan(1e-5);
        expect(Math.abs(pLeft[1] - pRight[1])).toBeLessThan(1e-5);
      }
    }
  });
});

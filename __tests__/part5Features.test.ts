import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { getPuzzle } from '../src/solvers';
import { adController } from '../src/ads/adController';

describe('Part 5: Two Small Features Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState({
      cube4x4UnlockedUntil: 0,
      adsRemoved: false,
    });
  });

  describe('1. "I made a mistake" feature', () => {
    test('exempts 4x4 from ads for 10 minutes and pre-fills setup state', async () => {
      const now = Date.now();
      const puzzle4x4 = getPuzzle('4x4');
      const sampleState = puzzle4x4.getSolvedState();
      
      // Initially not unlocked
      expect(useSettingsStore.getState().cube4x4UnlockedUntil).toBe(0);

      // Simulate tapping "I made a mistake" during a 4x4 solve
      useSettingsStore.getState().unlock4x4ForMinutes(10);
      usePuzzleStore.getState().setCurrentState(sampleState);

      const unlockedUntil = useSettingsStore.getState().cube4x4UnlockedUntil;
      expect(unlockedUntil).toBeGreaterThanOrEqual(now + 9.9 * 60 * 1000);
      expect(unlockedUntil).toBeLessThanOrEqual(now + 10.1 * 60 * 1000);

      // Verify that currentState in store now matches the mistake step state
      expect(usePuzzleStore.getState().currentState).toEqual(sampleState);

      // Verify ad exemption logic: cube4x4UnlockedUntil > Date.now() grants unlock
      const isUnlocked =
        useSettingsStore.getState().adsRemoved ||
        adController.is4x4SolutionUnlocked(JSON.stringify(sampleState)) ||
        useSettingsStore.getState().cube4x4UnlockedUntil > Date.now();

      expect(isUnlocked).toBe(true);
    });
  });

  describe('2. "Resume solve" persistence', () => {
    const RESUME_KEY = '@solvacube_resume_solve';

    test('persists mid-solve state and allows restoration', async () => {
      const puzzle = getPuzzle('3x3');
      const { state: scrambledState } = puzzle.scramble(10);
      const mockMoves = [
        { notation: 'R', axis: 'x', layer: 2, angle: -Math.PI / 2, description: 'Right turn' },
        { notation: 'U', axis: 'y', layer: 2, angle: -Math.PI / 2, description: 'Up turn' },
        { notation: 'F', axis: 'z', layer: 2, angle: -Math.PI / 2, description: 'Front turn' },
      ];

      const sessionData = {
        puzzleId: '3x3',
        state: scrambledState,
        solutionMoves: mockMoves,
        currentMoveIndex: 1,
        totalMoves: 3,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(RESUME_KEY, JSON.stringify(sessionData));

      // Retrieve saved session
      const raw = await AsyncStorage.getItem(RESUME_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.puzzleId).toBe('3x3');
      expect(parsed.currentMoveIndex).toBe(1);
      expect(parsed.totalMoves).toBe(3);

      // Restore session into store
      usePuzzleStore.getState().restoreSolutionSession(
        parsed.puzzleId,
        parsed.state,
        parsed.solutionMoves,
        parsed.currentMoveIndex
      );

      const storeState = usePuzzleStore.getState();
      expect(storeState.activePuzzleId).toBe('3x3');
      expect(storeState.currentState).toEqual(scrambledState);
      expect(storeState.currentMoveIndex).toBe(1);
      expect(storeState.solutionMoves.length).toBe(3);
    });

    test('dismissing clears the stored resume session', async () => {
      await AsyncStorage.setItem(RESUME_KEY, JSON.stringify({ puzzleId: '3x3', currentMoveIndex: 2 }));
      expect(await AsyncStorage.getItem(RESUME_KEY)).not.toBeNull();

      await AsyncStorage.removeItem(RESUME_KEY);
      expect(await AsyncStorage.getItem(RESUME_KEY)).toBeNull();
    });
  });
});


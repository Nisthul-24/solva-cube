import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Move, PuzzleColor, PuzzleId } from '../types/puzzle';
import { getPuzzle } from '../solvers';
import { hapticFeedback } from '../services/hapticsService';

interface PuzzleStoreState {
  activePuzzleId: PuzzleId;
  currentState: any;
  undoStack: any[];
  selectedColor: PuzzleColor;
  activeFaceIndex: { faceId: string; stickerIdx: number } | null;

  isSolving: boolean;
  solveError: { error: string; details?: string; offendingStickers?: Array<{ face: any; index: number }> } | null;
  solutionMoves: Move[];
  currentMoveIndex: number;
  isPlaying: boolean;
  showSolvedCelebration: boolean;

  setActivePuzzle: (id: PuzzleId) => Promise<void>;
  setSelectedColor: (color: PuzzleColor) => void;
  paintSticker: (faceId: string, stickerIdx: number, autoAdvance?: boolean) => void;
  undo: () => void;
  resetState: () => void;
  fillSampleScramble: () => void;
  solveCurrentState: () => Promise<boolean>;

  // Solution Player controls
  nextMove: () => void;
  prevMove: () => void;
  goToMove: (index: number) => void;
  togglePlay: () => void;
  restartSolution: () => void;
  dismissCelebration: () => void;

  loadSavedState: () => Promise<void>;
}

const STORAGE_PREFIX = '@solvacube_state_';

export const usePuzzleStore = create<PuzzleStoreState>((set, get) => ({
  activePuzzleId: '3x3',
  currentState: getPuzzle('3x3').getSolvedState(),
  undoStack: [],
  selectedColor: 'white',
  activeFaceIndex: null,

  isSolving: false,
  solveError: null,
  solutionMoves: [],
  currentMoveIndex: 0,
  isPlaying: false,
  showSolvedCelebration: false,

  setActivePuzzle: async (id: PuzzleId) => {
    const puzzle = getPuzzle(id);
    const solved = puzzle.getSolvedState();
    set({
      activePuzzleId: id,
      currentState: solved,
      undoStack: [],
      selectedColor: puzzle.colors[0],
      activeFaceIndex: null,
      solveError: null,
      solutionMoves: [],
      currentMoveIndex: 0,
      isPlaying: false,
      showSolvedCelebration: false,
    });
    // Try to load saved state for this puzzle
    await get().loadSavedState();
  },

  setSelectedColor: (color: PuzzleColor) => {
    hapticFeedback.light();
    set({ selectedColor: color });
  },

  paintSticker: (faceId: string, stickerIdx: number, autoAdvance = true) => {
    const { activePuzzleId, currentState, selectedColor, undoStack } = get();
    const puzzle = getPuzzle(activePuzzleId);

    // If 3x3 and sticker is center (index 4), fixed and unchangeable
    if (activePuzzleId === '3x3' && stickerIdx === 4) {
      return;
    }

    const nextState = puzzle.cloneState(currentState);
    if (!nextState[faceId]) return;

    // Save previous state to undo stack
    const newUndo = [...undoStack, puzzle.cloneState(currentState)];
    if (newUndo.length > 30) newUndo.shift();

    nextState[faceId][stickerIdx] = selectedColor;
    hapticFeedback.light();

    // Auto-advance logic
    let nextSticker: { faceId: string; stickerIdx: number } | null = null;
    if (autoAdvance) {
      const faces = puzzle.getFaces();
      const faceObj = faces.find((f) => f.id === faceId);
      const stickersPerFace = faceObj ? faceObj.gridSize * faceObj.gridSize : 9;

      let nextIdx = stickerIdx + 1;
      let nextFace = faceId;

      if (activePuzzleId === '3x3' && nextIdx === 4) nextIdx = 5; // skip fixed center

      if (nextIdx >= stickersPerFace) {
        // Next face
        const currentFaceIdx = faces.findIndex((f) => f.id === faceId);
        const nextFIndex = (currentFaceIdx + 1) % faces.length;
        nextFace = faces[nextFIndex].id;
        nextIdx = activePuzzleId === '3x3' ? 0 : 0;
      }
      nextSticker = { faceId: nextFace, stickerIdx: nextIdx };
    }

    set({
      currentState: nextState,
      undoStack: newUndo,
      activeFaceIndex: nextSticker,
      solveError: null, // Clear error on edit
    });

    // Save to AsyncStorage
    saveState(activePuzzleId, nextState);
  },

  undo: () => {
    const { undoStack, activePuzzleId } = get();
    if (undoStack.length === 0) return;

    hapticFeedback.medium();
    const newStack = [...undoStack];
    const prevState = newStack.pop();

    set({
      currentState: prevState,
      undoStack: newStack,
      solveError: null,
    });

    saveState(activePuzzleId, prevState);
  },

  resetState: () => {
    const { activePuzzleId } = get();
    const puzzle = getPuzzle(activePuzzleId);
    hapticFeedback.medium();
    const solved = puzzle.getSolvedState();
    set({
      currentState: solved,
      undoStack: [],
      solveError: null,
      activeFaceIndex: null,
      solutionMoves: [],
      currentMoveIndex: 0,
      isPlaying: false,
    });
    saveState(activePuzzleId, solved);
  },

  fillSampleScramble: () => {
    const { activePuzzleId } = get();
    const puzzle = getPuzzle(activePuzzleId);
    hapticFeedback.medium();
    const scrambleMovesCount = activePuzzleId === '3x3' ? 14 : activePuzzleId === '2x2' ? 6 : 8;
    const { state } = puzzle.scramble(scrambleMovesCount);
    set({
      currentState: state,
      undoStack: [],
      solveError: null,
      solutionMoves: [],
      currentMoveIndex: 0,
      isPlaying: false,
    });
    saveState(activePuzzleId, state);
  },

  solveCurrentState: async () => {
    const { activePuzzleId, currentState } = get();
    const puzzle = getPuzzle(activePuzzleId);

    // Validate state first
    const validation = puzzle.validate(currentState);
    if (!validation.valid) {
      hapticFeedback.error();
      set({
        solveError: {
          error: validation.error || 'Invalid configuration',
          details: validation.details,
          offendingStickers: (validation as any).offendingStickers,
        },
      });
      return false;
    }

    // Check if input is already solved upfront
    if (puzzle.isSolved(currentState)) {
      set({
        isSolving: false,
        solutionMoves: [],
        currentMoveIndex: 0,
        isPlaying: false,
        showSolvedCelebration: true,
        solveError: null,
      });
      return true;
    }

    set({ isSolving: true, solveError: null });

    try {
      // Run solver
      const moves = await puzzle.solve(currentState);

      // Verify that replaying all moves yields a solved state
      let replayState = puzzle.cloneState(currentState);
      for (const m of moves) {
        replayState = puzzle.applyMove(replayState, m);
      }
      const isReplaySolved = puzzle.isSolved(replayState);

      if (moves.length === 0 || !isReplaySolved) {
        hapticFeedback.error();
        set({
          isSolving: false,
          solutionMoves: [],
          currentMoveIndex: 0,
          isPlaying: false,
          showSolvedCelebration: false,
          solveError: {
            error: 'We could not solve this yet',
            details: 'The solver could not find a complete solution for this cube configuration.',
          },
        });
        return false;
      }

      hapticFeedback.success();
      set({
        isSolving: false,
        solutionMoves: moves,
        currentMoveIndex: 0,
        isPlaying: false,
        showSolvedCelebration: false,
      });
      return true;
    } catch (err: any) {
      hapticFeedback.error();
      set({
        isSolving: false,
        solutionMoves: [],
        currentMoveIndex: 0,
        isPlaying: false,
        showSolvedCelebration: false,
        solveError: {
          error: 'We could not solve this yet',
          details: err.message || 'Unable to find a solution for this puzzle state.',
        },
      });
      return false;
    }
  },

  nextMove: () => {
    const { currentMoveIndex, solutionMoves, currentState, activePuzzleId } = get();
    if (currentMoveIndex >= solutionMoves.length) {
      set({ isPlaying: false, showSolvedCelebration: true });
      return;
    }
    const move = solutionMoves[currentMoveIndex];
    const puzzle = getPuzzle(activePuzzleId);
    const nextState = puzzle.applyMove(currentState, move);
    hapticFeedback.light();

    const isLast = currentMoveIndex + 1 >= solutionMoves.length;
    set({
      currentState: nextState,
      currentMoveIndex: currentMoveIndex + 1,
      showSolvedCelebration: isLast,
      isPlaying: isLast ? false : get().isPlaying,
    });
  },

  prevMove: () => {
    const { currentMoveIndex, solutionMoves, currentState, activePuzzleId } = get();
    if (currentMoveIndex <= 0) return;

    const move = solutionMoves[currentMoveIndex - 1];
    // Invert move:
    const invNotation = move.notation.endsWith("'")
      ? move.notation[0]
      : move.notation.endsWith('2')
      ? move.notation
      : `${move.notation}'`;

    const puzzle = getPuzzle(activePuzzleId);
    const prevState = puzzle.applyMove(currentState, invNotation);
    hapticFeedback.light();

    set({
      currentState: prevState,
      currentMoveIndex: currentMoveIndex - 1,
      showSolvedCelebration: false,
    });
  },

  goToMove: (targetIndex: number) => {
    const { solutionMoves, currentMoveIndex } = get();
    if (targetIndex === currentMoveIndex) return;

    if (targetIndex > currentMoveIndex) {
      for (let i = currentMoveIndex; i < targetIndex; i++) {
        get().nextMove();
      }
    } else {
      for (let i = currentMoveIndex; i > targetIndex; i--) {
        get().prevMove();
      }
    }
  },

  togglePlay: () => {
    const { isPlaying, currentMoveIndex, solutionMoves } = get();
    if (!isPlaying && currentMoveIndex >= solutionMoves.length) {
      // Reached the end, restart
      get().goToMove(0);
    }
    hapticFeedback.light();
    set({ isPlaying: !isPlaying });
  },

  restartSolution: () => {
    get().goToMove(0);
    set({ isPlaying: false, showSolvedCelebration: false });
  },

  dismissCelebration: () => {
    set({ showSolvedCelebration: false });
  },

  loadSavedState: async () => {
    const { activePuzzleId } = get();
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + activePuzzleId);
      if (raw) {
        const parsed = JSON.parse(raw);
        const puzzle = getPuzzle(activePuzzleId);
        const val = puzzle.validate(parsed);
        if (val.valid) {
          set({ currentState: parsed });
        }
      }
    } catch {}
  },
}));

async function saveState(puzzleId: PuzzleId, state: any) {
  try {
    await AsyncStorage.setItem(STORAGE_PREFIX + puzzleId, JSON.stringify(state));
  } catch {}
}

if (typeof window !== 'undefined') {
  (window as any).__solvaStore = usePuzzleStore;
}



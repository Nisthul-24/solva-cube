import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  HelpCircle,
  Settings,
  Dices,
} from 'lucide-react-native';
import { Cube3DView } from '../src/components/3d/Cube3DView';
import { Pyraminx3DView } from '../src/components/3d/Pyraminx3DView';
import { NetView2x2 } from '../src/components/NetView2x2';
import { NetViewPyraminx } from '../src/components/NetViewPyraminx';
import { ConfettiOverlay } from '../src/components/ConfettiOverlay';
import { usePuzzleStore } from '../src/store/puzzleStore';
import {
  useSettingsStore,
  getSpeedDurations,
  AnimationSpeedOption,
  AutoViewOption,
} from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { adService } from '../src/services/adService';
import { hapticFeedback } from '../src/services/hapticsService';
import { getMoveInstructionInfo } from '../src/components/3d/cubieModel';
import { wording as getEngineWording } from '../src/puzzleEngine/puzzleEngine';
import { getPuzzle } from '../src/solvers';
import { Cube3x3State } from '../src/solvers/cube3x3/cube3x3Facelets';
import { getFrontMovementHint } from '../src/components/3d/puzzleTurnInfo';
import { PlaybackController, PlaybackState } from '../src/components/playback/playbackController';

export default function SolutionPlayerScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const activePuzzleId = usePuzzleStore((s) => s.activePuzzleId);
  const currentState = usePuzzleStore((s) => s.currentState);
  const solutionMoves = usePuzzleStore((s) => s.solutionMoves);
  const currentMoveIndex = usePuzzleStore((s) => s.currentMoveIndex);
  const isPlaying = usePuzzleStore((s) => s.isPlaying);
  const showSolvedCelebration = usePuzzleStore((s) => s.showSolvedCelebration);

  const nextMove = usePuzzleStore((s) => s.nextMove);
  const prevMove = usePuzzleStore((s) => s.prevMove);
  const togglePlay = usePuzzleStore((s) => s.togglePlay);
  const restartSolution = usePuzzleStore((s) => s.restartSolution);
  const dismissCelebration = usePuzzleStore((s) => s.dismissCelebration);
  const resetState = usePuzzleStore((s) => s.resetState);

  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const speedOption = useSettingsStore((s) => s.speedOption);
  const setSpeedOption = useSettingsStore((s) => s.setSpeedOption);
  const autoViewMode = useSettingsStore((s) => s.autoViewMode);
  const setAutoViewMode = useSettingsStore((s) => s.setAutoViewMode);
  const highlightStrength = useSettingsStore((s) => s.highlightStrength);
  const showColorBlindLetters = useSettingsStore((s) => s.showColorBlindLetters);

  const totalMoves = solutionMoves.length;
  const puzzle = useMemo(() => getPuzzle(activePuzzleId), [activePuzzleId]);
  const isStateLogicallySolved = useMemo(() => {
    return puzzle.isSolved(currentState);
  }, [puzzle, currentState]);

  const isAlreadySolved = totalMoves === 0 && isStateLogicallySolved;
  const isCouldNotSolve = totalMoves === 0 && !isStateLogicallySolved;
  const isFullyCompletedAndSolved = totalMoves > 0 && currentMoveIndex >= totalMoves && isStateLogicallySolved;
  const isUnfinishedOrFailed = totalMoves > 0 && currentMoveIndex >= totalMoves && !isStateLogicallySolved;
  const isSolved = isAlreadySolved || isFullyCompletedAndSolved || isCouldNotSolve || isUnfinishedOrFailed;
  const movesRemaining = Math.max(0, totalMoves - currentMoveIndex);
  const currentMoveNotation = !isSolved ? solutionMoves[currentMoveIndex]?.notation || null : null;
  const isDouble = currentMoveNotation ? currentMoveNotation.includes('2') : false;

  // Animation & Camera sequence states
  const isNewPlayback = activePuzzleId === 'pyraminx' || activePuzzleId === '4x4';
  const [controllerState, setControllerState] = useState<PlaybackState>('idle');
  const controllerRef = useRef<PlaybackController | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingMove, setAnimatingMove] = useState<string | null>(null);
  const [isCameraMoving, setIsCameraMoving] = useState(false);
  const [isGhostPreview, setIsGhostPreview] = useState(false);
  const [showGuideCard, setShowGuideCard] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Speed durations (Requirement 2)
  const { turnDurationMs, arrowWaitDurationMs } = useMemo(
    () => getSpeedDurations(speedOption, isDouble),
    [speedOption, isDouble]
  );

  // References for live controller callbacks
  const totalMovesRef = useRef(totalMoves);
  totalMovesRef.current = totalMoves;
  const currentMoveIndexRef = useRef(currentMoveIndex);
  currentMoveIndexRef.current = currentMoveIndex;
  const currentMoveNotationRef = useRef(currentMoveNotation);
  currentMoveNotationRef.current = currentMoveNotation;
  const turnDurationMsRef = useRef(turnDurationMs);
  turnDurationMsRef.current = turnDurationMs;
  const arrowWaitDurationMsRef = useRef(arrowWaitDurationMs);
  arrowWaitDurationMsRef.current = arrowWaitDurationMs;
  const autoViewModeRef = useRef(autoViewMode);
  autoViewModeRef.current = autoViewMode;

  useEffect(() => {
    if (!isNewPlayback) return;
    const controller = new PlaybackController({
      getTotalMoves: () => totalMovesRef.current,
      getCurrentMoveIndex: () => currentMoveIndexRef.current,
      getCurrentMoveNotation: () => currentMoveNotationRef.current,
      getTurnDurationMs: () => turnDurationMsRef.current,
      getArrowWaitDurationMs: () => arrowWaitDurationMsRef.current,
      isAutoViewNeeded: (_move: string) => autoViewModeRef.current !== 'off',
      onStartCameraGlide: (_move: string) => {
        setIsCameraMoving(true);
      },
      onStartTurnAnimation: (move: string) => {
        setIsAnimating(true);
        setAnimatingMove(move);
      },
      onApplyMove: (_move: string) => {
        nextMove();
      },
      onStepBack: () => {
        prevMove();
      },
      onStateChange: (st: PlaybackState) => {
        setControllerState(st);
      },
    });
    controllerRef.current = controller;
    if (typeof window !== 'undefined') {
      (window as any).__playbackController = controller;
    }
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [isNewPlayback, nextMove, prevMove]);

  // When move changes, stop ghost preview and handle auto view camera movement
  useEffect(() => {
    setIsGhostPreview(false);
    if (!isNewPlayback) {
      if (autoViewMode !== 'off' && currentMoveNotation && !isSolved) {
        setIsCameraMoving(true);
      } else {
        setIsCameraMoving(false);
      }
    }
  }, [currentMoveIndex, currentMoveNotation, autoViewMode, isSolved, isNewPlayback]);

  const handleCameraMoveComplete = useCallback(() => {
    setIsCameraMoving(false);
    if (isNewPlayback) {
      controllerRef.current?.notifyCameraComplete();
    }
  }, [isNewPlayback]);

  const speedLabel = useMemo(() => {
    switch (speedOption) {
      case 'very_slow':
        return 'Very slow';
      case 'slow':
        return 'Slow';
      case 'fast':
        return 'Fast';
      case 'normal':
      default:
        return 'Normal';
    }
  }, [speedOption]);

  const cycleSpeed = () => {
    hapticFeedback.light();
    const sequence: AnimationSpeedOption[] = ['normal', 'slow', 'very_slow', 'fast'];
    const curIdx = sequence.indexOf(speedOption);
    const nextSpeed = sequence[(curIdx + 1) % sequence.length];
    setSpeedOption(nextSpeed);
  };

  // Plain-English instruction for current move
  const instructionInfo = useMemo(() => {
    if (!currentMoveNotation || isSolved) return null;
    const frontMovementHint = getFrontMovementHint(activePuzzleId, currentMoveNotation);

    if (activePuzzleId === '4x4') {
      const curMoveObj = solutionMoves[currentMoveIndex];
      const info = getEngineWording('4x4', currentMoveNotation);
      const moveDesc = curMoveObj?.description || info.fullInstruction;
      return {
        move: currentMoveNotation,
        boldLayer: info.layerName,
        actionText: '',
        hint: frontMovementHint || 'Follow the 3D direction arrow.',
        centerColor: '',
        centerColorHex: 'transparent',
        fullAction: moveDesc,
        isPyraminx: false,
      };
    }
    if (activePuzzleId === 'pyraminx') {
      const curMoveObj = solutionMoves[currentMoveIndex];
      const info = getEngineWording('pyraminx', currentMoveNotation);
      const moveDesc = curMoveObj?.description || info.fullInstruction;
      return {
        move: currentMoveNotation,
        boldLayer: info.layerName,
        actionText: '',
        hint: frontMovementHint || 'Follow the 3D direction arrow.',
        centerColor: '',
        centerColorHex: 'transparent',
        fullAction: moveDesc,
        isPyraminx: true,
      };
    }
    const baseInfo = getMoveInstructionInfo(currentMoveNotation);
    return {
      ...baseInfo,
      hint: frontMovementHint || baseInfo.hint,
    };
  }, [currentMoveNotation, isSolved, activePuzzleId, solutionMoves, currentMoveIndex]);

  const handleScrambleAndReplay4x4 = useCallback(() => {
    hapticFeedback.medium();
    const puzzle = getPuzzle('4x4');
    const { moves } = puzzle.scramble(40);
    usePuzzleStore.setState({
      solutionMoves: moves,
      currentMoveIndex: 0,
      currentState: puzzle.getSolvedState(),
      isPlaying: false,
    });
  }, []);

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    setAnimatingMove(null);

    if (isNewPlayback) {
      controllerRef.current?.notifyTurnComplete();
    } else {
      if (animatingMove && !animatingMove.endsWith('_rev')) {
        nextMove();
      }
    }
  }, [animatingMove, nextMove, isNewPlayback]);

  // Automated playback sequence for frozen puzzles (3x3, 2x2): camera move -> arrow wait -> animate turn -> repeat
  useEffect(() => {
    if (isNewPlayback) return;
    if (isPlaying && !isSolved && !isAnimating && !isCameraMoving) {
      playTimerRef.current = setTimeout(() => {
        if (!isSolved && currentMoveNotation && !isAnimating) {
          setIsAnimating(true);
          setAnimatingMove(currentMoveNotation);
        }
      }, arrowWaitDurationMs);
    } else if ((!isPlaying || isCameraMoving || isAnimating) && playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, isSolved, isAnimating, isCameraMoving, currentMoveIndex, currentMoveNotation, arrowWaitDurationMs, isNewPlayback]);

  // Stop playing when solved
  useEffect(() => {
    if (isSolved) {
      if (isNewPlayback) {
        controllerRef.current?.pause();
      } else if (isPlaying) {
        togglePlay();
      }
    }
  }, [isSolved, isPlaying, togglePlay, isNewPlayback]);

  const isEffectivePlaying = isNewPlayback
    ? controllerState === 'camera' || controllerState === 'waiting' || controllerState === 'turning'
    : isPlaying;

  const handlePlayPause = useCallback(() => {
    hapticFeedback.light();
    if (isNewPlayback) {
      if (isEffectivePlaying) {
        controllerRef.current?.pause();
      } else {
        if (isGhostPreview) setIsGhostPreview(false);
        controllerRef.current?.play();
      }
    } else {
      togglePlay();
    }
  }, [isNewPlayback, isEffectivePlaying, isGhostPreview, togglePlay]);

  const handleToggleShowMe = useCallback(() => {
    hapticFeedback.light();
    if (!isGhostPreview) {
      if (isNewPlayback) {
        controllerRef.current?.pause();
      }
      setIsGhostPreview(true);
    } else {
      setIsGhostPreview(false);
    }
  }, [isGhostPreview, isNewPlayback]);

  // Show interstitial once on solved screen if policy allows (3-min gap)
  useEffect(() => {
    if (showSolvedCelebration) {
      adService.showInterstitialIfAllowed();
    }
  }, [showSolvedCelebration]);

  const handleNext = () => {
    if (isSolved) return;
    setIsGhostPreview(false);
    hapticFeedback.medium();
    if (isNewPlayback) {
      controllerRef.current?.next();
    } else {
      if (isAnimating || isCameraMoving) return;
      if (currentMoveNotation) {
        setIsAnimating(true);
        setAnimatingMove(currentMoveNotation);
      }
    }
  };

  const handleBack = () => {
    if (currentMoveIndex <= 0) return;
    setIsGhostPreview(false);
    hapticFeedback.light();
    if (isNewPlayback) {
      controllerRef.current?.prev();
    } else {
      if (isAnimating) return;
      prevMove();
    }
  };

  const handleStartOver = () => {
    setIsGhostPreview(false);
    hapticFeedback.medium();
    setIsAnimating(false);
    setAnimatingMove(null);
    if (isNewPlayback) {
      controllerRef.current?.destroy();
    }
    restartSolution();
  };

  const handleSolveAnother = () => {
    dismissCelebration();
    resetState();
    router.replace('/input');
  };

  // Move chips list auto scroll
  const chipsScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (chipsScrollRef.current && currentMoveIndex > 3) {
      chipsScrollRef.current.scrollTo({ x: (currentMoveIndex - 2) * 56, animated: true });
    }
  }, [currentMoveIndex]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0b1120' }]} edges={['top', 'left', 'right']}>
      {/* Top Header with Gear Settings Button (Requirement 6) */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color="#F8FAFC" size={22} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.navTitle}>Solution Guide</Text>
          <Text style={styles.navSubtitle}>
            {isSolved ? 'All steps complete!' : `Step ${currentMoveIndex + 1} of ${totalMoves}`}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.howToButton}
            onPress={() => setShowGuideCard((prev) => !prev)}
          >
            <HelpCircle size={18} color="#22d3ee" />
            <Text style={styles.howToText}>Guide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsHeaderBtn}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Settings size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* "How to follow along" Collapsible Card */}
      {showGuideCard && (
        <View style={styles.howToCard}>
          <Text style={styles.howToCardTitle}>How to follow along:</Text>
          <Text style={styles.howToStep}>
            <Text style={styles.howToNumber}>1.</Text> Hold your physical cube with the{' '}
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>WHITE centre on top</Text> and{' '}
            <Text style={{ color: '#009B48', fontWeight: '700' }}>GREEN centre facing you</Text> the whole time.
          </Text>
          <Text style={styles.howToStep}>
            <Text style={styles.howToNumber}>2.</Text> The{' '}
            <Text style={{ color: '#22d3ee', fontWeight: '700' }}>glowing layer with the arrow</Text> is the one to turn.
          </Text>
          <Text style={styles.howToStep}>
            <Text style={styles.howToNumber}>3.</Text> Make the turn on your cube, then tap{' '}
            <Text style={{ color: '#22d3ee', fontWeight: '700' }}>Next</Text>. Use{' '}
            <Text style={{ color: '#94A3B8', fontWeight: '700' }}>Back</Text> if you made a slip!
          </Text>
        </View>
      )}

      {/* Main Content: Responsive layout */}
      <View style={isWide ? styles.wideContainer : styles.mobileContainer}>
        {/* 3D Stage / Puzzle View */}
        <View style={isWide ? styles.stageWide : styles.stageMobile}>
          {activePuzzleId === '3x3' || activePuzzleId === '2x2' || activePuzzleId === '4x4' ? (
            <Cube3DView
              cubeState={currentState as any}
              dimension={activePuzzleId === '4x4' ? 4 : activePuzzleId === '2x2' ? 2 : 3}
              currentMoveNotation={animatingMove || currentMoveNotation}
              isAnimating={isAnimating}
              isGhostPreview={isGhostPreview}
              turnDurationMs={turnDurationMs}
              autoViewMode={autoViewMode}
              highlightStrength={highlightStrength}
              showColorBlindLetters={showColorBlindLetters}
              isSolved={isSolved}
              onAnimationComplete={handleAnimationComplete}
              onCameraMoveComplete={handleCameraMoveComplete}
              onAutoViewModeChange={setAutoViewMode}
            />
          ) : (
            <Pyraminx3DView
              state={currentState as any}
              currentMoveNotation={animatingMove || currentMoveNotation}
              isAnimating={isAnimating}
              isGhostPreview={isGhostPreview}
              turnDurationMs={turnDurationMs}
              autoViewMode={autoViewMode}
              isSolved={isSolved}
              onAnimationComplete={handleAnimationComplete}
              onCameraMoveComplete={handleCameraMoveComplete}
              onAutoViewModeChange={setAutoViewMode}
            />
          )}
        </View>

        {/* Step Card & Controls */}
        <ScrollView
          style={isWide ? styles.controlsWide : styles.controlsMobile}
          contentContainerStyle={styles.controlsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Bar & Counters */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressStepText}>
                {isSolved ? (
                  <Text style={{ color: '#10B981', fontWeight: '800' }}>Solved! 🎉</Text>
                ) : (
                  `Step ${currentMoveIndex + 1} of ${totalMoves}`
                )}
              </Text>
              {!isSolved && (
                <Text style={styles.progressRemainingText}>
                  {movesRemaining} {movesRemaining === 1 ? 'move' : 'moves'} to go
                </Text>
              )}
            </View>

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: totalMoves > 0 ? `${Math.min(100, ((currentMoveIndex + 1) / totalMoves) * 100)}%` : '0%',
                  },
                ]}
              />
            </View>
          </View>

          {/* Row of Move Chips */}
          <View style={styles.chipsSection}>
            <ScrollView
              ref={chipsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {solutionMoves.map((m, idx) => {
                const isPast = idx < currentMoveIndex;
                const isCurrent = idx === currentMoveIndex;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.moveChip,
                      isCurrent && styles.moveChipCurrent,
                      isPast && styles.moveChipPast,
                    ]}
                  >
                    <Text
                      style={[
                        styles.moveChipText,
                        isCurrent && styles.moveChipTextCurrent,
                        isPast && styles.moveChipTextPast,
                      ]}
                    >
                      {m.notation}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Instruction Card */}
          {!isSolved && instructionInfo ? (
            <View style={styles.instructionCard}>
              <View style={styles.instructionHeaderRow}>
                <View style={styles.headerLeftGroup}>
                  <View style={styles.notationBadge}>
                    <Text style={styles.notationBadgeText}>{instructionInfo.move}</Text>
                  </View>

                  {!instructionInfo.isPyraminx && instructionInfo.centerColor ? (
                    <View style={styles.centerColorChip}>
                      <View
                        style={[
                          styles.centerColorDot,
                          { backgroundColor: instructionInfo.centerColorHex },
                        ]}
                      />
                      <Text style={styles.centerColorText}>
                        {instructionInfo.centerColor} centre
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* "Show me" Preview Button */}
                <TouchableOpacity
                  style={[styles.showMeBtn, isGhostPreview && styles.showMeBtnActive]}
                  onPress={handleToggleShowMe}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Show move preview"
                >
                  <Play
                    size={12}
                    color={isGhostPreview ? '#0B1120' : '#22d3ee'}
                    fill={isGhostPreview ? '#0B1120' : '#22d3ee'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.showMeText, isGhostPreview && styles.showMeTextActive]}>
                    {isGhostPreview ? 'Stop' : 'Show me'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.actionInstruction}>
                {instructionInfo.fullAction ? (
                  instructionInfo.fullAction
                ) : (
                  <>
                    Turn the <Text style={styles.boldLayer}>{instructionInfo.boldLayer}</Text> layer{' '}
                    <Text style={styles.actionTextHighlight}>{instructionInfo.actionText}</Text>
                  </>
                )}
              </Text>

              <View style={styles.hintBox}>
                <Text style={styles.hintText}>{instructionInfo.hint}</Text>
              </View>
            </View>
          ) : isAlreadySolved ? (
            <View style={styles.solvedCard}>
              <CheckCircle2 color="#10B981" size={48} strokeWidth={2.5} />
              <Text style={styles.solvedTitle}>Your cube is already solved</Text>
              <Text style={styles.solvedSubtitle}>
                All faces match. No moves needed!
              </Text>
              <TouchableOpacity
                style={styles.solveAnotherBtn}
                onPress={handleSolveAnother}
              >
                <Text style={styles.solveAnotherText}>Solve another puzzle</Text>
              </TouchableOpacity>
            </View>
          ) : isCouldNotSolve || isUnfinishedOrFailed ? (
            <View style={styles.solvedCard}>
              <AlertCircle color="#EF4444" size={48} strokeWidth={2.5} />
              <Text style={[styles.solvedTitle, { color: '#EF4444' }]}>We could not solve this yet</Text>
              <Text style={styles.solvedSubtitle}>
                The solver could not find a complete solution for this cube configuration.
              </Text>
              <TouchableOpacity
                style={styles.solveAnotherBtn}
                onPress={handleSolveAnother}
              >
                <Text style={styles.solveAnotherText}>Try another puzzle</Text>
              </TouchableOpacity>
            </View>
          ) : isFullyCompletedAndSolved ? (
            <View style={styles.solvedCard}>
              <CheckCircle2 color="#10B981" size={48} strokeWidth={2.5} />
              <Text style={styles.solvedTitle}>Your cube is solved!</Text>
              <Text style={styles.solvedSubtitle}>
                Completed in {totalMoves} moves. Congratulations!
              </Text>

              <TouchableOpacity
                style={styles.solveAnotherBtn}
                onPress={handleSolveAnother}
              >
                <Text style={styles.solveAnotherText}>Solve another puzzle</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Player Buttons: Back, Play/Pause, Next */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[
                styles.playerBtn,
                styles.navBtn,
                currentMoveIndex === 0 && styles.btnDisabled,
              ]}
              onPress={handleBack}
              disabled={currentMoveIndex === 0 || isAnimating}
            >
              <SkipBack size={24} color={currentMoveIndex === 0 ? '#475569' : '#F8FAFC'} />
              <Text
                style={[
                  styles.btnLabel,
                  currentMoveIndex === 0 && { color: '#475569' },
                ]}
              >
                Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playerBtn, styles.playPauseBtn]}
              onPress={isNewPlayback ? handlePlayPause : togglePlay}
              disabled={isSolved}
              accessibilityRole="button"
              accessibilityLabel={isEffectivePlaying ? 'Pause' : 'Play'}
            >
              {isEffectivePlaying ? (
                <Pause size={28} color="#0B1120" strokeWidth={2.5} />
              ) : (
                <Play size={28} color="#0B1120" strokeWidth={2.5} style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.playerBtn,
                styles.navBtn,
                isSolved && styles.btnDisabled,
              ]}
              onPress={handleNext}
              disabled={isSolved || isAnimating}
            >
              <SkipForward size={24} color={isSolved ? '#475569' : '#F8FAFC'} />
              <Text
                style={[
                  styles.btnLabel,
                  isSolved && { color: '#475569' },
                ]}
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>

          {/* Secondary Controls: Speed & Start Over */}
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={cycleSpeed}
              accessibilityRole="button"
              accessibilityLabel="Speed"
            >
              <Gauge size={16} color="#22d3ee" />
              <Text style={styles.secondaryBtnText}>Speed: {speedLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleStartOver}
            >
              <RotateCcw size={16} color="#94A3B8" />
              <Text style={styles.secondaryBtnText}>Start over</Text>
            </TouchableOpacity>

            {/* Debug 4x4 Scramble & Replay Button */}
            {activePuzzleId === '4x4' && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: '#8B5CF6' }]}
                onPress={handleScrambleAndReplay4x4}
                accessibilityRole="button"
                accessibilityLabel="Scramble and replay"
              >
                <Dices size={16} color="#A78BFA" />
                <Text style={[styles.secondaryBtnText, { color: '#A78BFA' }]}>
                  Scramble & Replay
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Confetti Celebration Overlay */}
      {showSolvedCelebration && (
        <ConfettiOverlay
          movesCount={totalMoves}
          onSolveAnother={handleSolveAnother}
          onDismiss={dismissCelebration}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F172A',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  navSubtitle: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '600',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  howToButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  howToText: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsHeaderBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  howToCard: {
    backgroundColor: '#151C2B',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  howToCardTitle: {
    color: '#22d3ee',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  howToStep: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  howToNumber: {
    color: '#22d3ee',
    fontWeight: '800',
  },
  mobileContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  wideContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  stageMobile: {
    width: '100%',
    height: 320,
    backgroundColor: '#0B1120',
  },
  stageWide: {
    flex: 1.2,
    height: '100%',
    backgroundColor: '#0B1120',
  },
  controlsMobile: {
    flex: 1,
  },
  controlsWide: {
    flex: 1,
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlsScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  progressCard: {
    backgroundColor: '#151C2B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStepText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  progressRemainingText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: 3,
  },
  chipsSection: {
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  moveChip: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveChipCurrent: {
    backgroundColor: '#22d3ee',
    borderColor: '#22d3ee',
  },
  moveChipPast: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  moveChipText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  moveChipTextCurrent: {
    color: '#0B1120',
    fontWeight: '800',
  },
  moveChipTextPast: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  instructionCard: {
    backgroundColor: '#151C2B',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    marginBottom: 16,
  },
  instructionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  showMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
  },
  showMeBtnActive: {
    backgroundColor: '#22d3ee',
    borderColor: '#22d3ee',
  },
  showMeText: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  showMeTextActive: {
    color: '#0B1120',
  },
  notationBadge: {
    backgroundColor: '#22d3ee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  notationBadgeText: {
    color: '#0B1120',
    fontSize: 16,
    fontWeight: '900',
  },
  centerColorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  centerColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  centerColorText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  actionInstruction: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    marginBottom: 10,
  },
  boldLayer: {
    color: '#22d3ee',
    fontWeight: '900',
  },
  actionTextHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  hintBox: {
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22d3ee',
  },
  hintText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  solvedCard: {
    backgroundColor: '#151C2B',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 16,
  },
  solvedTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  solvedSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  solveAnotherBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  solveAnotherText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  playerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 84,
    flexDirection: 'row',
    gap: 6,
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  btnLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#151C2B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
});

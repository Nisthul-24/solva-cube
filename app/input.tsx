import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  useWindowDimensions,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  RotateCcw,
  Undo2,
  Dices,
  Play,
  AlertCircle,
  Compass,
  Layers,
  X,
  Camera,
  Eye,
} from 'lucide-react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { CameraScannerModal } from '../src/camera/CameraScannerModal';
import { Header } from '../src/components/Header';
import { ColorPalette } from '../src/components/ColorPalette';
import { Cube3DView } from '../src/components/3d/Cube3DView';
import { Pyraminx3DView } from '../src/components/3d/Pyraminx3DView';
import { PuzzleNet } from '../src/components/PuzzleNet';
import { AquaticBackground } from '../src/components/common/AquaticBackground';
import { adController } from '../src/ads/adController';
import { nativeAdAdapter } from '../src/ads/nativeAdAdapter';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { getPuzzle } from '../src/solvers';
import { PuzzleColor, CubeColor } from '../src/types/puzzle';
import { hapticFeedback } from '../src/services/hapticsService';
import { FaceName3x3, PALETTE } from '../src/components/3d/stickerLayout';
import {
  initCube3x3Solver,
  isCube3x3SolverReady,
  onCube3x3SolverReady,
} from '../src/solvers/cube3x3/kociembaAdapter';

interface FaceStepConfig {
  face: string;
  number: number;
  centerColor: string;
  centerName: string;
  instruction: string;
  tiltAction: string;
}

const WIZARD_FACES: FaceStepConfig[] = [
  {
    face: 'U',
    number: 1,
    centerColor: 'white',
    centerName: 'WHITE',
    instruction: 'Face 1 of 6: point the WHITE centre up. Copy the 9 colours you see.',
    tiltAction: 'Hold with White on top and Green facing you.',
  },
  {
    face: 'F',
    number: 2,
    centerColor: 'green',
    centerName: 'GREEN',
    instruction: 'Face 2 of 6: now tilt the cube forward so the GREEN centre faces you.',
    tiltAction: 'Tilt forward: Green faces you directly.',
  },
  {
    face: 'R',
    number: 3,
    centerColor: 'red',
    centerName: 'RED',
    instruction: 'Face 3 of 6: now turn the cube to the left so the RED centre faces you.',
    tiltAction: 'Turn left: Red faces you (White stays on top).',
  },
  {
    face: 'B',
    number: 4,
    centerColor: 'blue',
    centerName: 'BLUE',
    instruction: 'Face 4 of 6: now turn the cube to the left so the BLUE centre faces you.',
    tiltAction: 'Turn left: Blue faces you (White stays on top).',
  },
  {
    face: 'L',
    number: 5,
    centerColor: 'orange',
    centerName: 'ORANGE',
    instruction: 'Face 5 of 6: now turn the cube to the left so the ORANGE centre faces you.',
    tiltAction: 'Turn left: Orange faces you (White stays on top).',
  },
  {
    face: 'D',
    number: 6,
    centerColor: 'yellow',
    centerName: 'YELLOW',
    instruction: 'Face 6 of 6: now tilt the cube up so the YELLOW centre faces you.',
    tiltAction: 'Tilt up: Yellow faces you.',
  },
];

const PYRAMINX_WIZARD_FACES: FaceStepConfig[] = [
  {
    face: 'F',
    number: 1,
    centerColor: 'green',
    centerName: 'FRONT (Green)',
    instruction: 'Face 1 of 4: point the FRONT face towards you. Paint the 9 stickers.',
    tiltAction: 'Front face forward, Yellow at the base.',
  },
  {
    face: 'R',
    number: 2,
    centerColor: 'red',
    centerName: 'RIGHT (Red)',
    instruction: 'Face 2 of 4: rotate pyramid to the left to paint the RIGHT face.',
    tiltAction: 'Rotate left: Right face now faces you.',
  },
  {
    face: 'L',
    number: 3,
    centerColor: 'blue',
    centerName: 'LEFT (Blue)',
    instruction: 'Face 3 of 4: rotate pyramid to the right to paint the LEFT face.',
    tiltAction: 'Rotate right: Left face now faces you.',
  },
  {
    face: 'D',
    number: 4,
    centerColor: 'yellow',
    centerName: 'BOTTOM (Yellow)',
    instruction: 'Face 4 of 4: tilt the pyramid up to paint the BOTTOM face.',
    tiltAction: 'Tilt up: Bottom base now faces you.',
  },
];

/**
 * Stylized Rainbow Scanner Icon for the Scan Tool
 */
function ScannerToolIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Corner Brackets */}
      <Path
        d="M 3 7 V 4 A 1 1 0 0 1 4 3 H 7 M 17 3 H 20 A 1 1 0 0 1 21 4 V 7 M 21 17 V 20 A 1 1 0 0 1 20 21 H 17 M 7 21 H 4 A 1 1 0 0 1 3 20 V 17"
        stroke="#E879F9"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Barcode/Scan lines */}
      <Rect x="7" y="7" width="2" height="10" rx="1" fill="#F43F5E" />
      <Rect x="11" y="6" width="2" height="12" rx="1" fill="#F59E0B" />
      <Rect x="15" y="7" width="2" height="10" rx="1" fill="#22D3EE" />
    </Svg>
  );
}

export default function InputScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isWide = width >= 680 || isLandscape;

  // Single Zustand store holding the sticker state
  const activePuzzleId = usePuzzleStore((s) => s.activePuzzleId);
  const currentState = usePuzzleStore((s) => s.currentState);
  const selectedColor = usePuzzleStore((s) => s.selectedColor);
  const isSolving = usePuzzleStore((s) => s.isSolving);
  const solveError = usePuzzleStore((s) => s.solveError);

  const setSelectedColor = usePuzzleStore((s) => s.setSelectedColor);
  const paintSticker = usePuzzleStore((s) => s.paintSticker);
  const undo = usePuzzleStore((s) => s.undo);
  const resetState = usePuzzleStore((s) => s.resetState);
  const fillSampleScramble = usePuzzleStore((s) => s.fillSampleScramble);
  const setCurrentState = usePuzzleStore((s) => s.setCurrentState);
  const solveCurrentState = usePuzzleStore((s) => s.solveCurrentState);

  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const autoViewMode = useSettingsStore((s) => s.autoViewMode);
  const setAutoViewMode = useSettingsStore((s) => s.setAutoViewMode);
  const highlightStrength = useSettingsStore((s) => s.highlightStrength);
  const showColorBlindLetters = useSettingsStore((s) => s.showColorBlindLetters);
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);
  const cube4x4UnlockedUntil = useSettingsStore((s) => s.cube4x4UnlockedUntil);
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const [showUnlock4x4Modal, setShowUnlock4x4Modal] = useState(false);
  const [isSolverReady, setIsSolverReady] = useState(isCube3x3SolverReady());

  useEffect(() => {
    if (isCube3x3SolverReady()) {
      setIsSolverReady(true);
      return;
    }
    const unsubscribe = onCube3x3SolverReady(() => {
      setIsSolverReady(true);
    });
    return unsubscribe;
  }, []);

  const puzzle = getPuzzle(activePuzzleId);
  const expectedCountPerColor =
    activePuzzleId === '4x4' ? 16 : activePuzzleId === '3x3' ? 9 : activePuzzleId === '2x2' ? 4 : 9;

  // Mode is purely a UI flag: 'guided' | 'free'
  const [mode, setMode] = useState<'guided' | 'free'>('guided');
  const [wizardStepIdx, setWizardStepIdx] = useState(0);
  const [showNetOverview, setShowNetOverview] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Safe back navigation helper (closes modals first, falls back to Home)
  const handleBack = () => {
    if (showCameraScanner) {
      setShowCameraScanner(false);
      return;
    }
    if (showNetOverview) {
      setShowNetOverview(false);
      return;
    }
    if (showUnlock4x4Modal) {
      setShowUnlock4x4Modal(false);
      return;
    }
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch {
      router.replace('/');
    }
  };

  // Android BackHandler: navigating back from Setup closes modals or goes to Home screen
  useEffect(() => {
    if (activePuzzleId === '3x3') {
      const timer = setTimeout(() => {
        initCube3x3Solver().catch(() => {});
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activePuzzleId]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }
  }, [showCameraScanner, showNetOverview, showUnlock4x4Modal]);

  const wizardSteps = activePuzzleId === 'pyraminx' ? PYRAMINX_WIZARD_FACES : WIZARD_FACES;
  const currentStep = wizardSteps[wizardStepIdx] || wizardSteps[0];
  const activeFace = mode === 'guided' ? currentStep.face : null;

  // Calculate live counts per color
  const colorCounts = useMemo(() => {
    const counts: Record<PuzzleColor, number> = {} as any;
    puzzle.colors.forEach((c) => (counts[c] = 0));

    const faces = puzzle.getFaces();
    for (const f of faces) {
      const stickers = currentState[f.id] || [];
      for (const col of stickers) {
        if (counts[col as PuzzleColor] !== undefined) {
          counts[col as PuzzleColor]++;
        }
      }
    }
    return counts;
  }, [currentState, puzzle]);

  const isComplete = useMemo(() => {
    return puzzle.colors.every((c) => colorCounts[c] === expectedCountPerColor);
  }, [colorCounts, expectedCountPerColor, puzzle]);

  // Next empty sticker cursor on current face for auto-advance
  const activeStickerCursor = useMemo(() => {
    if (activePuzzleId === 'pyraminx' || mode !== 'guided') return null;
    const stickers = currentState[currentStep.face] || [];
    const order =
      activePuzzleId === '4x4'
        ? Array.from({ length: 16 }, (_, i) => i)
        : activePuzzleId === '2x2'
        ? [0, 1, 2, 3]
        : [0, 1, 2, 3, 5, 6, 7, 8];
    for (const idx of order) {
      if (!stickers[idx]) return idx;
    }
    return null;
  }, [currentState, currentStep.face, activePuzzleId, mode]);

  // Check if current face is complete in guided mode
  const isCurrentFaceComplete = useMemo(() => {
    if (mode !== 'guided') return false;
    const stickers = currentState[currentStep.face] || [];
    const count = activePuzzleId === '4x4' ? 16 : activePuzzleId === '3x3' ? 9 : 4;
    return stickers.length === count && stickers.every((c: any) => !!c);
  }, [currentState, currentStep.face, activePuzzleId, mode]);

  // Smoothly advance face in guided mode when current face finishes
  useEffect(() => {
    if (mode === 'guided' && isCurrentFaceComplete && wizardStepIdx < wizardSteps.length - 1) {
      const timer = setTimeout(() => {
        setWizardStepIdx((prev) => Math.min(wizardSteps.length - 1, prev + 1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isCurrentFaceComplete, mode, wizardStepIdx, wizardSteps.length]);

  const handlePaintSticker = useCallback(
    (face: string, idx: number) => {
      if (activePuzzleId === '3x3' && idx === 4) {
        hapticFeedback.light();
        return;
      }
      hapticFeedback.light();
      paintSticker(face, idx);
    },
    [activePuzzleId, paintSticker]
  );

  const handleSolve = async () => {
    hapticFeedback.medium();

    if (activePuzzleId === '4x4') {
      const solutionHash = JSON.stringify(currentState);
      const isUnlocked =
        adsRemoved ||
        adController.is4x4SolutionUnlocked(solutionHash) ||
        cube4x4UnlockedUntil > Date.now();
      if (!isUnlocked) {
        setShowUnlock4x4Modal(true);
        return;
      }
    }

    const success = await solveCurrentState();
    if (success) {
      router.push('/player');
    }
  };

  const proceedSolveAfterUnlock = async () => {
    setShowUnlock4x4Modal(false);
    hapticFeedback.medium();
    const success = await solveCurrentState();
    if (success) {
      router.push('/player');
    }
  };

  const handleWatchVideoUnlock = async () => {
    const solutionHash = JSON.stringify(currentState);
    await nativeAdAdapter.showRewarded4x4(solutionHash);
    await proceedSolveAfterUnlock();
  };

  /* Render 3D Canvas */
  const render3DCanvas = () => (
    <View style={styles.canvasContainer}>
      {activePuzzleId === '3x3' || activePuzzleId === '2x2' || activePuzzleId === '4x4' ? (
        <Cube3DView
          key="stable-cube-3d"
          cubeState={currentState as any}
          dimension={activePuzzleId === '4x4' ? 4 : activePuzzleId === '2x2' ? 2 : 3}
          activeFace={activeFace as FaceName3x3 | null}
          isAnimating={false}
          turnDurationMs={1200}
          autoViewMode={autoViewMode}
          highlightStrength={highlightStrength}
          showColorBlindLetters={showColorBlindLetters}
          isSolved={false}
          interactivePainting={true}
          activeStickerCursor={activeStickerCursor}
          onStickerClick={handlePaintSticker as any}
          onAutoViewModeChange={setAutoViewMode}
          onSwitchToNet={() => setShowNetOverview(true)}
        />
      ) : (
        <Pyraminx3DView
          key="stable-pyraminx-3d"
          state={currentState as any}
          activeFace={activeFace as any}
          guidedMode={mode === 'guided'}
          interactivePainting={true}
          autoViewMode={autoViewMode}
          showColorBlindLetters={showColorBlindLetters}
          offendingStickers={solveError?.offendingStickers as any}
          onStickerClick={handlePaintSticker as any}
          onAutoViewModeChange={setAutoViewMode}
          onSwitchToNet={() => setShowNetOverview(true)}
        />
      )}
    </View>
  );

  /* Render Top Instruction Card */
  const renderInstructionCard = () => (
    <View style={styles.glassInstructionCard}>
      <View style={styles.instructionTopRow}>
        <View style={styles.instructionTitleBox}>
          <Text style={styles.instructionCardTitle} numberOfLines={1}>
            {mode === 'guided'
              ? `Face ${currentStep.number} of ${wizardSteps.length}: ${
                  activePuzzleId === '2x2'
                    ? `${currentStep.face} Face`
                    : `${currentStep.centerName} Centre`
                }`
              : 'Free Mode'}
          </Text>
        </View>

        {/* Guided / Free Sleek Pill Switch */}
        {(activePuzzleId === '3x3' || activePuzzleId === '2x2') && (
          <TouchableOpacity
            style={styles.guidedToggleWrap}
            onPress={() => setMode((prev) => (prev === 'guided' ? 'free' : 'guided'))}
            activeOpacity={0.8}
            accessibilityRole="switch"
            accessibilityState={{ checked: mode === 'guided' }}
            accessibilityLabel={`Toggle Guided mode, currently ${mode}`}
          >
            <Text style={styles.guidedToggleLabel}>Guided</Text>
            <View
              style={[
                styles.sleekSwitchTrack,
                mode === 'guided' && styles.sleekSwitchTrackActive,
              ]}
            >
              <View
                style={[
                  styles.sleekSwitchThumb,
                  mode === 'guided' && styles.sleekSwitchThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.instructionCardSubtitle} numberOfLines={2}>
        {mode === 'guided'
          ? activePuzzleId === '2x2'
            ? `Face ${currentStep.number} of 6: Copy the 4 colours you see on this face.`
            : currentStep.instruction
          : 'Free Mode: drag to rotate, tap any sticker to paint.'}
      </Text>
    </View>
  );

  /* Render Palette & Controls (Sidebar in wide, Bottom Sheet in portrait) */
  const renderPaletteAndControls = () => (
    <View style={isWide ? styles.glassSidebarCard : styles.glassBottomSheet}>
      {/* Validation Error Banner */}
      {solveError && (
        <View style={styles.errorCard}>
          <AlertCircle color="#EF4444" size={16} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>{solveError.error}</Text>
            {solveError.details ? (
              <Text style={styles.errorMessage}>{solveError.details}</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Palette Header */}
      <View style={styles.paletteHeaderRow}>
        <Text style={styles.paletteHeading}>PAINT PALETTE:</Text>
        <Text style={styles.paletteSubheading}>TAP A COLOUR, THEN TAP STICKERS TO PAINT:</Text>
      </View>

      {/* 2-Column Grid of 3D Glossy Color Pills */}
      <ColorPalette
        availableColors={puzzle.colors}
        selectedColor={selectedColor}
        onSelectColor={(c) => {
          hapticFeedback.light();
          setSelectedColor(c);
        }}
        colorCounts={colorCounts}
        expectedCountPerColor={expectedCountPerColor}
        layout="grid"
      />

      {/* 4 Tool Action Buttons in a Row (Scan, Undo, Sample, Reset) */}
      <View style={styles.toolsRow}>
        {activePuzzleId !== 'pyraminx' && (
          <TouchableOpacity
            style={styles.toolTileBtn}
            onPress={() => setShowCameraScanner(true)}
            accessibilityRole="button"
            accessibilityLabel="Scan face with camera"
            activeOpacity={0.8}
          >
            <View style={[styles.toolIconCircle, { backgroundColor: 'rgba(232, 121, 249, 0.18)' }]}>
              <ScannerToolIcon size={18} />
            </View>
            <Text style={styles.toolTileText}>Scan</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.toolTileBtn}
          onPress={undo}
          accessibilityRole="button"
          accessibilityLabel="Undo last paint"
          activeOpacity={0.8}
        >
          <View style={[styles.toolIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
            <Undo2 size={18} color="#34D399" />
          </View>
          <Text style={styles.toolTileText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolTileBtn}
          onPress={fillSampleScramble}
          accessibilityRole="button"
          accessibilityLabel="Fill with sample scramble"
          activeOpacity={0.8}
        >
          <View style={[styles.toolIconCircle, { backgroundColor: 'rgba(168, 85, 247, 0.18)' }]}>
            <Dices size={18} color="#C084FC" />
          </View>
          <Text style={styles.toolTileText}>Sample</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolTileBtn}
          onPress={resetState}
          accessibilityRole="button"
          accessibilityLabel="Reset all stickers"
          activeOpacity={0.8}
        >
          <View style={[styles.toolIconCircle, { backgroundColor: 'rgba(249, 115, 22, 0.18)' }]}>
            <RotateCcw size={18} color="#FB923C" />
          </View>
          <Text style={styles.toolTileText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Big Glossy 3D Emerald Solve Button */}
      {(() => {
        const isPreparingSolver =
          (activePuzzleId === '3x3' || activePuzzleId === '4x4') && !isSolverReady;

        return (
          <TouchableOpacity
            style={[
              styles.glossySolveButton,
              (!isComplete || isPreparingSolver) && styles.glossySolveButtonDisabled,
            ]}
            onPress={handleSolve}
            disabled={!isComplete || isSolving || isPreparingSolver}
            accessibilityRole="button"
            accessibilityLabel={
              isPreparingSolver
                ? 'Preparing solver, please wait'
                : isComplete
                ? 'Check & Solve Cube'
                : 'Fill All Stickers'
            }
            activeOpacity={0.85}
          >
            {/* Specular curved top sheen */}
            <View style={styles.solveSheenOverlay} />

            {isSolving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : isComplete && isPreparingSolver ? (
              <View style={styles.solveButtonContent}>
                <ActivityIndicator size="small" color="#34D399" style={{ marginRight: 8 }} />
                <Text style={styles.glossySolveButtonText}>Preparing solver…</Text>
              </View>
            ) : (
              <View style={styles.solveButtonContent}>
                <Text style={styles.glossySolveButtonText}>
                  {isComplete
                    ? 'Check & Solve Cube'
                    : `Fill All Stickers (${expectedCountPerColor * puzzle.colors.length} total)`}
                </Text>
                {isComplete && <Play size={17} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 6 }} />}
              </View>
            )}
          </TouchableOpacity>
        );
      })()}
    </View>
  );

  return (
    <AquaticBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {/* Top Header */}
        <Header showBack={true} onBack={handleBack} subtitle={`${puzzle.name} Setup`} />

        {isWide ? (
          /* Landscape / Tablet Layout */
          <View style={styles.wideRow}>
            {/* Left Column: 3D Stage & Overlays */}
            <View style={styles.stageWide}>
              {/* Top Face Instruction Card */}
              {renderInstructionCard()}

              {/* Interactive 3D Canvas */}
              {render3DCanvas()}

              {/* Front orientation tag */}
              <View style={styles.frontTagWrap}>
                <Text style={styles.frontTagText}>Front</Text>
              </View>

              {/* Bottom Glass Pills (Auto view & Net View) */}
              <View style={styles.stageBottomPillsRow}>
                <TouchableOpacity
                  style={styles.glassPill}
                  onPress={() =>
                    setAutoViewMode(autoViewMode === 'always' ? 'off' : 'always')
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.glassPillText}>
                    Auto view: <Text style={styles.glassPillHighlight}>{autoViewMode === 'always' ? 'Always' : 'Off'}</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.glassPill}
                  onPress={() => setShowNetOverview(true)}
                  activeOpacity={0.8}
                >
                  <Layers size={14} color="#22D3EE" style={{ marginRight: 6 }} />
                  <Text style={styles.glassPillText}>Net View</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Column: Glass Sidebar */}
            <View style={styles.sidebarCol}>
              {renderPaletteAndControls()}
            </View>
          </View>
        ) : (
          /* Portrait Mobile Layout: Fixed Screen (No Scrolling) */
          <View style={styles.portraitContainer}>
            {/* 3D Canvas Stage */}
            <View style={styles.stagePortrait}>
              {renderInstructionCard()}
              {render3DCanvas()}

              <View style={styles.frontTagWrap}>
                <Text style={styles.frontTagText}>Front</Text>
              </View>

              <View style={styles.stageBottomPillsRow}>
                <TouchableOpacity
                  style={styles.glassPill}
                  onPress={() =>
                    setAutoViewMode(autoViewMode === 'always' ? 'off' : 'always')
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.glassPillText}>
                    Auto view: <Text style={styles.glassPillHighlight}>{autoViewMode === 'always' ? 'Always' : 'Off'}</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.glassPill}
                  onPress={() => setShowNetOverview(true)}
                  activeOpacity={0.8}
                >
                  <Layers size={14} color="#22D3EE" style={{ marginRight: 6 }} />
                  <Text style={styles.glassPillText}>Net View</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Fixed Bottom Glass Palette & Controls Card */}
            <View style={styles.bottomControlsWrap}>
              {renderPaletteAndControls()}
            </View>
          </View>
        )}

        {/* Read-Only Flat Net Overview Modal */}
        <Modal
          visible={showNetOverview}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNetOverview(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Layers size={20} color="#22D3EE" />
                  <Text style={styles.modalTitle}>Full 2D Net Overview</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowNetOverview(false)}
                  style={styles.modalCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close Net Overview"
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <PuzzleNet
                  puzzleId={activePuzzleId}
                  state={currentState}
                  readOnly={true}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Camera Scanner Modal */}
        {activePuzzleId !== 'pyraminx' && (
          <CameraScannerModal
            visible={showCameraScanner}
            onClose={() => setShowCameraScanner(false)}
            dimension={activePuzzleId === '4x4' ? 4 : activePuzzleId === '2x2' ? 2 : 3}
            onScanComplete={(scannedState) => {
              setCurrentState(scannedState);
            }}
          />
        )}
      </SafeAreaView>
    </AquaticBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  /* Wide / Landscape Layout */
  wideRow: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 12,
  },
  stageWide: {
    flex: 1.25,
    height: '100%',
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  sidebarCol: {
    flex: 0.95,
    maxWidth: 420,
    height: '100%',
    justifyContent: 'center',
  },

  /* Portrait Fixed Layout (No Scrolling) */
  portraitContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stagePortrait: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  bottomControlsWrap: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
  },

  /* Top Frosted Glass Instruction Card */
  glassInstructionCard: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(4, 45, 58, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  instructionTitleBox: {
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  instructionCardTitle: {
    color: '#67E8F9',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  guidedToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  guidedToggleLabel: {
    color: '#A5F3FC',
    fontSize: 12,
    fontWeight: '700',
  },
  sleekSwitchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 60, 75, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  sleekSwitchTrackActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#22D3EE',
  },
  sleekSwitchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#94A3B8',
  },
  sleekSwitchThumbActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  instructionCardSubtitle: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },

  /* Front Orientation Label */
  frontTagWrap: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    zIndex: 8,
    backgroundColor: 'rgba(6, 48, 62, 0.55)',
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.22)',
  },
  frontTagText: {
    color: '#A5F3FC',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Stage Bottom Pills */
  stageBottomPillsRow: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    pointerEvents: 'box-none',
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 48, 62, 0.65)',
    borderWidth: 1.2,
    borderColor: 'rgba(34, 211, 238, 0.28)',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  glassPillText: {
    color: '#A5F3FC',
    fontSize: 12,
    fontWeight: '600',
  },
  glassPillHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Sidebar Card (Wide/Landscape) */
  glassSidebarCard: {
    backgroundColor: 'rgba(4, 42, 54, 0.78)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.28)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    gap: 6,
    justifyContent: 'space-between',
  },

  /* Bottom Controls Card (Portrait) */
  glassBottomSheet: {
    backgroundColor: 'rgba(4, 42, 54, 0.82)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },

  /* Palette Header */
  paletteHeaderRow: {
    marginBottom: 2,
  },
  paletteHeading: {
    color: '#67E8F9',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  paletteSubheading: {
    color: '#A5F3FC',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    letterSpacing: 0.2,
  },

  /* Tools 4-in-a-row */
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginVertical: 4,
  },
  toolTileBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 48, 62, 0.65)',
    borderWidth: 1.2,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    borderRadius: 12,
    paddingVertical: 5,
  },
  toolIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  toolTileText: {
    color: '#A5F3FC',
    fontSize: 10.5,
    fontWeight: '700',
  },

  /* Glossy 3D Emerald Solve Button */
  glossySolveButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  glossySolveButtonDisabled: {
    backgroundColor: 'rgba(6, 52, 66, 0.5)',
    borderColor: 'rgba(34, 211, 238, 0.2)',
    shadowOpacity: 0,
    elevation: 0,
  },
  solveSheenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  solveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glossySolveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Validation Error */
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.2,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  errorTitle: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#FECACA',
    fontSize: 11,
    marginTop: 2,
  },

  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 20, 26, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(6, 46, 58, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 211, 238, 0.2)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    alignItems: 'center',
  },
});

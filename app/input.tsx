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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  ToggleLeft,
  ToggleRight,
  Maximize2,
  Settings,
} from 'lucide-react-native';
import { Header } from '../src/components/Header';
import { ColorPalette } from '../src/components/ColorPalette';
import { Cube3DView } from '../src/components/3d/Cube3DView';
import { Pyraminx3DView } from '../src/components/3d/Pyraminx3DView';
import { NetView3x3 } from '../src/components/NetView3x3';
import { NetView2x2 } from '../src/components/NetView2x2';
import { NetViewPyraminx } from '../src/components/NetViewPyraminx';
import { PuzzleNet } from '../src/components/PuzzleNet';
import { BannerAdComponent } from '../src/components/BannerAdComponent';
import { adService } from '../src/services/adService';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { getPuzzle } from '../src/solvers';
import { PuzzleColor, CubeColor } from '../src/types/puzzle';
import { hapticFeedback } from '../src/services/hapticsService';
import { FaceName3x3, PALETTE } from '../src/components/3d/stickerLayout';
import { Cube3x3State } from '../src/solvers/cube3x3/cube3x3Facelets';

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
    centerName: 'GREEN (Front)',
    instruction: 'Face 1 of 4: Front face (GREEN). Hold with top vertex up and green facing you.',
    tiltAction: 'Hold with top corner up, Green facing you directly.',
  },
  {
    face: 'R',
    number: 2,
    centerColor: 'red',
    centerName: 'RED (Right)',
    instruction: 'Face 2 of 4: Right face (RED). Turn pyramid to view the red face.',
    tiltAction: 'Turn to the right face: Red faces you.',
  },
  {
    face: 'L',
    number: 3,
    centerColor: 'blue',
    centerName: 'BLUE (Left)',
    instruction: 'Face 3 of 4: Left face (BLUE). Turn pyramid to view the blue face.',
    tiltAction: 'Turn to the left face: Blue faces you.',
  },
  {
    face: 'D',
    number: 4,
    centerColor: 'yellow',
    centerName: 'YELLOW (Bottom)',
    instruction: 'Face 4 of 4: Bottom base (YELLOW). Tilt the pyramid up to view the yellow base.',
    tiltAction: 'Tilt up: Yellow base faces you.',
  },
];

export default function ColourInputScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Single Zustand store holding the sticker state (Requirement 1)
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
  const solveCurrentState = usePuzzleStore((s) => s.solveCurrentState);

  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const autoViewMode = useSettingsStore((s) => s.autoViewMode);
  const setAutoViewMode = useSettingsStore((s) => s.setAutoViewMode);
  const highlightStrength = useSettingsStore((s) => s.highlightStrength);
  const showColorBlindLetters = useSettingsStore((s) => s.showColorBlindLetters);
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);
  const cube4x4UnlockedUntil = useSettingsStore((s) => s.cube4x4UnlockedUntil);
  const setAdsRemoved = useSettingsStore((s) => s.setAdsRemoved);
  const unlock4x4For24h = useSettingsStore((s) => s.unlock4x4For24h);
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const [showUnlock4x4Modal, setShowUnlock4x4Modal] = useState(false);

  const puzzle = getPuzzle(activePuzzleId);
  const expectedCountPerColor = activePuzzleId === '4x4' ? 16 : activePuzzleId === '3x3' ? 9 : activePuzzleId === '2x2' ? 4 : 9;

  // Mode is purely a UI flag: 'guided' | 'free' (Requirement 1)
  const [mode, setMode] = useState<'guided' | 'free'>('guided');
  const [wizardStepIdx, setWizardStepIdx] = useState(0);
  const [showNetOverview, setShowNetOverview] = useState(false);

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
    const order = activePuzzleId === '4x4'
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
      const isUnlocked = adsRemoved || Date.now() < cube4x4UnlockedUntil;
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0B1120' }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header title={`${puzzle.name} Setup`} />

      <View style={isWide ? styles.wideRow : styles.mobileColumn}>
        {/* Large 3D Stage (at least 55% of the screen height on mobile) */}
        <View style={isWide ? styles.stageWide : styles.stageMobile}>
          {/* Top Mode Banner & Guided/Free Toggle */}
          <View style={styles.topOverlayRow}>
            {mode === 'guided' && (activePuzzleId === '3x3' || activePuzzleId === '2x2') ? (
              <View style={styles.instructionBanner}>
                <View style={styles.instructionTitleRow}>
                  <Compass size={14} color="#22d3ee" />
                  <Text style={styles.instructionBannerTitle}>
                    Face {currentStep.number} of 6: {activePuzzleId === '2x2' ? `${currentStep.face} Face` : `${currentStep.centerName} Centre`}
                  </Text>
                </View>
                <Text style={styles.instructionText}>
                  {activePuzzleId === '2x2'
                    ? `Face ${currentStep.number} of 6: Copy the 4 colours you see on this face.`
                    : currentStep.instruction}
                </Text>
              </View>
            ) : (
              <View style={styles.freeModeBanner}>
                <Text style={styles.freeModeText}>
                  Free Mode: drag to rotate, tap any sticker to paint.
                </Text>
              </View>
            )}

            {/* Guided / Free Toggle */}
            {(activePuzzleId === '3x3' || activePuzzleId === '2x2') && (
              <TouchableOpacity
                style={styles.modeToggleBtn}
                onPress={() => setMode((prev) => (prev === 'guided' ? 'free' : 'guided'))}
              >
                {mode === 'guided' ? (
                  <ToggleRight size={22} color="#22d3ee" />
                ) : (
                  <ToggleLeft size={22} color="#94A3B8" />
                )}
                <Text style={[styles.modeToggleText, mode === 'guided' && { color: '#22d3ee' }]}>
                  {mode === 'guided' ? 'Guided' : 'Free'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 3D Cube Canvas - Single Stable Mount (Requirement 1 & 3) */}
          <View style={styles.canvasContainer}>
            {activePuzzleId === '3x3' || activePuzzleId === '2x2' || activePuzzleId === '4x4' ? (
              <Cube3DView
                key="stable-cube-3d"
                cubeState={currentState as any}
                dimension={activePuzzleId === '4x4' ? 4 : activePuzzleId === '2x2' ? 2 : 3}
                activeFace={activeFace as FaceName3x3 | null}
                isAnimating={false}
                turnDurationMs={1200}
                autoViewMode={mode === 'guided' ? 'always' : 'off'}
                highlightStrength={highlightStrength}
                showColorBlindLetters={showColorBlindLetters}
                isSolved={false}
                interactivePainting={true}
                activeStickerCursor={activeStickerCursor}
                onStickerClick={handlePaintSticker as any}
                onAutoViewModeChange={setAutoViewMode}
              />
            ) : (
              <Pyraminx3DView
                key="stable-pyraminx-3d"
                state={currentState as any}
                activeFace={activeFace as any}
                guidedMode={mode === 'guided'}
                autoViewMode={autoViewMode}
                offendingStickers={solveError?.offendingStickers as any}
                onStickerClick={handlePaintSticker as any}
                onAutoViewModeChange={setAutoViewMode}
              />
            )}
          </View>

          {/* Pyraminx Piece Types Legend (Requirement 1) */}
          {activePuzzleId === 'pyraminx' && (
            <View style={styles.pyraminxLegendBar}>
              <View style={styles.legendItem}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Tip: dot</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendRing} />
                <Text style={styles.legendText}>Axial: ring</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendPlain} />
                <Text style={styles.legendText}>Edge: plain</Text>
              </View>
            </View>
          )}

          {/* Small Corner Read-Only Flat Overview */}
          <TouchableOpacity
            style={styles.miniOverviewCorner}
            onPress={() => setShowNetOverview(true)}
            activeOpacity={0.8}
          >
            <View style={styles.miniOverviewHeader}>
              <Layers size={13} color="#22d3ee" />
              <Text style={styles.miniOverviewTitle}>Net View</Text>
              <Maximize2 size={11} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet: Palette, Tools & Solve Button (Requirement 3) */}
        <View style={isWide ? styles.sheetWide : styles.sheetMobile}>
          {/* Validation Error Banner */}
          {solveError && (
            <View style={styles.errorCard}>
              <AlertCircle color="#EF4444" size={18} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>{solveError.error}</Text>
                {solveError.details ? (
                  <Text style={styles.errorMessage}>{solveError.details}</Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Color Palette with Live Counts */}
          <View style={styles.paletteContainer}>
            <Text style={styles.paletteHeading}>Paint Palette:</Text>
            <ColorPalette
              availableColors={puzzle.colors}
              selectedColor={selectedColor}
              onSelectColor={(c) => {
                hapticFeedback.light();
                setSelectedColor(c);
              }}
              colorCounts={colorCounts}
              expectedCountPerColor={expectedCountPerColor}
            />
          </View>

          {/* Tools Row: Undo, Sample Scramble, Reset */}
          <View style={styles.toolsRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={undo} accessibilityRole="button" accessibilityLabel="Undo">
              <Undo2 size={16} color="#CBD5E1" />
              <Text style={styles.toolBtnText}>Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolBtn} onPress={fillSampleScramble} accessibilityRole="button" accessibilityLabel="Sample Scramble">
              <Dices size={16} color="#22d3ee" />
              <Text style={styles.toolBtnText}>Sample Scramble</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolBtn} onPress={resetState} accessibilityRole="button" accessibilityLabel="Reset">
              <RotateCcw size={16} color="#94A3B8" />
              <Text style={styles.toolBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Main Solve Button */}
          <TouchableOpacity
            style={[
              styles.solveButton,
              !isComplete && styles.solveButtonDisabled,
            ]}
            onPress={handleSolve}
            disabled={!isComplete || isSolving}
            accessibilityRole="button"
            accessibilityLabel="Check & Solve Cube"
          >
            {isSolving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Play size={20} color="#FFFFFF" />
                <Text style={styles.solveButtonText}>
                  {isComplete ? 'Check & Solve Cube' : `Fill All Stickers (${expectedCountPerColor * puzzle.colors.length} total)`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Banner Ad */}
          <View style={styles.adWrap}>
            <BannerAdComponent />
          </View>
        </View>
      </View>

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
                <Layers size={20} color="#22d3ee" />
                <Text style={styles.modalTitle}>Full 2D Net Overview</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNetOverview(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            <View style={styles.netSvgBox}>
              <PuzzleNet
                puzzleId={activePuzzleId}
                state={currentState as any}
                onStickerPress={(face, idx) => {
                  hapticFeedback.light();
                  paintSticker(face, idx, false);
                }}
                readOnly={false}
              />
            </View>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setShowNetOverview(false)}
            >
              <Text style={styles.modalDoneText}>Close Overview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4x4 Ad / Unlock Modal on Solve */}
      <Modal
        visible={showUnlock4x4Modal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnlock4x4Modal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>Unlock 4x4 Revenge Cube</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowUnlock4x4Modal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#94A3B8', fontSize: 13, marginVertical: 12, lineHeight: 18 }}>
              The 4x4 Revenge Cube solver unlocks for 24 hours by watching a quick rewarded ad, or permanently with Remove Ads.
            </Text>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: '#38BDF8', marginBottom: 10 }]}
              onPress={() => {
                adService.showRewarded(async () => {
                  unlock4x4For24h();
                  await proceedSolveAfterUnlock();
                });
              }}
            >
              <Text style={[styles.modalDoneText, { color: '#0F172A', fontWeight: '800' }]}>
                Watch Video (24h free)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: '#1E293B', marginBottom: 10 }]}
              onPress={async () => {
                setAdsRemoved(true);
                await proceedSolveAfterUnlock();
              }}
            >
              <Text style={[styles.modalDoneText, { color: '#F8FAFC' }]}>
                Remove Ads ($1.99)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: 'transparent' }]}
              onPress={() => setShowUnlock4x4Modal(false)}
            >
              <Text style={[styles.modalDoneText, { color: '#64748B' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mobileColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  wideRow: {
    flex: 1,
    flexDirection: 'row',
  },
  stageMobile: {
    height: '56%', // At least 55% of the screen (Requirement 3)
    width: '100%',
    backgroundColor: '#0B1120',
    position: 'relative',
  },
  stageWide: {
    flex: 1.3,
    height: '100%',
    backgroundColor: '#0B1120',
    position: 'relative',
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
  },
  topOverlayRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  instructionBanner: {
    flex: 1,
    backgroundColor: 'rgba(21, 28, 43, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22d3ee',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  instructionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructionBannerTitle: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
  },
  instructionText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  freeModeBanner: {
    flex: 1,
    backgroundColor: 'rgba(21, 28, 43, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  freeModeText: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  modeToggleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  miniOverviewCorner: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    zIndex: 10,
  },
  miniOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniOverviewTitle: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '800',
  },
  sheetMobile: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  sheetWide: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    justifyContent: 'space-between',
  },
  errorCard: {
    flexDirection: 'row',
    backgroundColor: '#7F1D1D30',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    gap: 8,
  },
  errorTitle: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 12,
  },
  errorMessage: {
    color: '#FECACA',
    fontSize: 11,
  },
  paletteContainer: {
    marginBottom: 8,
  },
  paletteHeading: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  toolBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  solveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 6,
  },
  solveButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  solveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  adWrap: {
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '94%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    padding: 16,
  },
  netSvgBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 10,
    marginBottom: 8,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDoneBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalDoneText: {
    color: '#22d3ee',
    fontSize: 13,
    fontWeight: '700',
  },
  pyraminxLegendBar: {
    position: 'absolute',
    top: 56,
    left: 12,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38BDF8',
  },
  legendRing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  legendPlain: {
    width: 8,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94A3B8',
  },
  legendText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
  },
});

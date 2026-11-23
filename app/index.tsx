import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  BackHandler,
  ToastAndroid,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AquaticBackground } from '../src/components/common/AquaticBackground';
import { ChevronRight, PlayCircle, X } from 'lucide-react-native';
import { HomeHeader } from '../src/components/home/HomeHeader';
import { HomePuzzleRow, HomePuzzleItem } from '../src/components/home/HomePuzzleRow';
import { BannerAdView } from '../src/ads/BannerAdView';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { PuzzleId } from '../src/types/puzzle';
import { hapticFeedback } from '../src/services/hapticsService';
import { getPuzzle } from '../src/solvers';
import { HOME_THEME } from '../src/constants/homeTheme';
import { initCube3x3Solver } from '../src/solvers/cube3x3/kociembaAdapter';

const PUZZLES: HomePuzzleItem[] = [
  {
    id: '3x3',
    name: '3x3 Cube',
    description: 'The classic. About 20 moves from any scramble.',
    meaningfulLabel: 'Most popular',
    labelColor: HOME_THEME.primary,
  },
  {
    id: '2x2',
    name: '2x2 Pocket Cube',
    description: 'Small and quick. A good place to start.',
  },
  {
    id: '4x4',
    name: '4x4 Revenge Cube',
    description: 'Bigger and trickier. We solve it in stages.',
    meaningfulLabel: 'Advanced',
    labelColor: HOME_THEME.textMuted,
  },
  {
    id: 'pyraminx',
    name: 'Pyraminx',
    description: 'The triangle puzzle. Easier than it looks.',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);
  const setActivePuzzle = usePuzzleStore((s) => s.setActivePuzzle);

  const [isScrolled, setIsScrolled] = useState(false);
  const [loadError, setLoadError] = useState<{ id: string; name: string } | null>(null);
  const [resumeSession, setResumeSession] = useState<{
    puzzleId: PuzzleId;
    state: any;
    solutionMoves: any[];
    currentMoveIndex: number;
    totalMoves: number;
  } | null>(null);

  const checkResumeSession = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@solvacube_resume_solve');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.puzzleId &&
          parsed.solutionMoves &&
          parsed.solutionMoves.length > 0 &&
          parsed.currentMoveIndex < parsed.solutionMoves.length
        ) {
          const puzzle = getPuzzle(parsed.puzzleId);
          if (puzzle && !puzzle.isSolved(parsed.state)) {
            setResumeSession(parsed);
            return;
          }
        }
      }
      setResumeSession(null);
    } catch {
      setResumeSession(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkResumeSession();
    }, [checkResumeSession])
  );

  // Android BackHandler: double-tap back to exit on Home screen
  useEffect(() => {
    if (Platform.OS === 'android') {
      let backPressCount = 0;
      let timer: any = null;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (backPressCount === 0) {
          backPressCount++;
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          timer = setTimeout(() => {
            backPressCount = 0;
          }, 2000);
          return true;
        } else {
          clearTimeout(timer);
          BackHandler.exitApp();
          return true;
        }
      });
      return () => {
        clearTimeout(timer);
        sub.remove();
      };
    }
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 4);
  };

  const handleSelectPuzzle = async (id: PuzzleId) => {
    hapticFeedback.light();
    setLoadError(null);

    // Warm up 3x3 solver asynchronously after initiating navigation
    if (id === '3x3') {
      setTimeout(() => {
        initCube3x3Solver().catch(() => {});
      }, 100);
    }

    try {
      const plugin = getPuzzle(id);
      if (!plugin) {
        throw new Error(`Plugin not found for ${id}`);
      }
      await setActivePuzzle(id);
      router.push('/input');
    } catch {
      const pInfo = PUZZLES.find((p) => p.id === id);
      setLoadError({
        id,
        name: pInfo?.name || id,
      });
    }
  };

  const handleResumePress = () => {
    if (!resumeSession) return;
    hapticFeedback.light();
    usePuzzleStore
      .getState()
      .restoreSolutionSession(
        resumeSession.puzzleId,
        resumeSession.state,
        resumeSession.solutionMoves,
        resumeSession.currentMoveIndex
      );
    router.push('/player');
  };

  const handleDismissResume = async () => {
    hapticFeedback.light();
    setResumeSession(null);
    try {
      await AsyncStorage.removeItem('@solvacube_resume_solve');
    } catch {}
  };

  return (
    <AquaticBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header stays fixed; content scrolls beneath it */}
        <HomeHeader scrolled={isScrolled} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 24) + (adsRemoved ? 24 : 76),
          },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Intro Section */}
          <View style={styles.introSection}>
            <Text style={styles.screenTitle}>What are you solving?</Text>
            <Text style={styles.screenSubtitle}>
              Pick your puzzle, copy its colours, and we&apos;ll show you each move.
            </Text>
          </View>

          {/* Error Banner if a puzzle fails to open */}
          {loadError && (
            <View style={styles.errorBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>The {loadError.name} could not be opened</Text>
                <Text style={styles.errorSubtitle}>Please check your installation and retry.</Text>
              </View>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => handleSelectPuzzle(loadError.id as PuzzleId)}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Resume Solve Card */}
          {resumeSession && (
            <View style={styles.resumeCard}>
              <TouchableOpacity
                style={styles.resumeCardContent}
                onPress={handleResumePress}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Continue your ${getPuzzle(resumeSession.puzzleId)?.name || resumeSession.puzzleId} solve, step ${resumeSession.currentMoveIndex + 1} of ${resumeSession.totalMoves}`}
              >
                <View style={styles.resumeIconWrap}>
                  <PlayCircle color={HOME_THEME.primary} size={24} />
                </View>
                <View style={styles.resumeTextWrap}>
                  <Text style={styles.resumeTitle}>
                    Continue your {getPuzzle(resumeSession.puzzleId)?.name || resumeSession.puzzleId} solve
                  </Text>
                  <Text style={styles.resumeSubtitle}>
                    Step {resumeSession.currentMoveIndex + 1} of {resumeSession.totalMoves} • {resumeSession.totalMoves - resumeSession.currentMoveIndex} moves left
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resumeDismissBtn}
                onPress={handleDismissResume}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss continue solve"
              >
                <X color={HOME_THEME.textMuted} size={18} />
              </TouchableOpacity>
            </View>
          )}

          {/* 4 Puzzle Rows */}
          <View style={styles.puzzleList}>
            {PUZZLES.map((puzzle) => (
              <HomePuzzleRow
                key={puzzle.id}
                puzzle={puzzle}
                onPress={handleSelectPuzzle}
              />
            ))}
          </View>

          {/* Learn Row: Quiet text link at the bottom of the list */}
          <TouchableOpacity
            style={styles.learnRow}
            onPress={() => router.push('/learn')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="New to cubes? Learn how to hold one and read moves"
          >
            <Text style={styles.learnText}>
              New to cubes? Learn how to hold one and read moves
            </Text>
            <ChevronRight color={HOME_THEME.textMuted} size={18} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Banner Ad anchored to bottom outside scrolling area (8 dp spacing, collapse to 0 on error) */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <BannerAdView />
      </View>
    </SafeAreaView>
  </AquaticBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24, // 24px bottom padding clears ad banner
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 640, // Centered column on desktop & tablet
  },
  introSection: {
    marginBottom: 20,
    gap: 6,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: HOME_THEME.text,
    letterSpacing: -0.5,
    fontFamily: Platform.select({
      web: "'DM Sans', 'Nunito', system-ui, -apple-system, sans-serif",
      default: undefined,
    }),
  },
  screenSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: HOME_THEME.textMuted,
    fontFamily: Platform.select({
      web: "'DM Sans', 'Nunito', system-ui, -apple-system, sans-serif",
      default: undefined,
    }),
  },
  puzzleList: {
    gap: 12,
    marginBottom: 16,
  },
  learnRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  learnText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: HOME_THEME.textMuted,
    fontFamily: Platform.select({
      web: "'DM Sans', 'Nunito', system-ui, -apple-system, sans-serif",
      default: undefined,
    }),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  errorSubtitle: {
    color: '#F87171',
    fontSize: 13,
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HOME_THEME.surface,
    borderColor: HOME_THEME.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  resumeCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resumeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 180, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeTextWrap: {
    flex: 1,
  },
  resumeTitle: {
    color: HOME_THEME.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  resumeSubtitle: {
    color: HOME_THEME.textMuted,
    fontSize: 12,
  },
  resumeDismissBtn: {
    padding: 8,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

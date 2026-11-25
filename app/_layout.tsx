import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { adService } from '../src/services/adService';
import { useSettingsStore } from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { debugLogger } from '../src/services/debugLogger';

export default function RootLayout() {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  useEffect(() => {
    debugLogger.log('RootLayout mounted, initializing background tasks');

    // 1. Asynchronously load settings from storage (non-blocking)
    loadSettings().catch((e) => {
      debugLogger.warn('Settings load error:', e);
    });

    // 2. Initialize AdMob and UMP consent asynchronously in background
    adService.initializeWithConsent().catch((e) => {
      debugLogger.warn('AdMob background init error:', e);
    });

    // ==========================================
    // TEMP DIAGNOSTIC: Boot Self-Test
    // ==========================================
    const testModules = () => {
      const check = (name: string, fn: () => void) => {
        console.warn(`[BOOTCHECK] TRY ${name}`);
        try {
          fn();
          console.warn(`[BOOTCHECK] OK ${name}`);
        } catch (e: any) {
          console.warn(`[BOOTCHECK] FAIL ${name} | ${String(e && e.message)} | ${String(e && e.stack)}`);
        }
      };

      // Routes
      check('app/index', () => require('./index'));
      check('app/input', () => require('./input'));
      check('app/player', () => require('./player'));
      check('app/settings', () => require('./settings'));
      check('app/learn', () => require('./learn'));
      check('app/gallery', () => require('./gallery'));
      check('app/arrow-gallery', () => require('./arrow-gallery'));
      check('app/camera-test', () => require('./camera-test'));
      check('app/colour-check', () => require('./colour-check'));

      // Solvers
      check('src/solvers/index', () => require('../src/solvers/index'));
      check('src/solvers/cube3x3/kociembaAdapter', () => require('../src/solvers/cube3x3/kociembaAdapter'));
      check('src/solvers/cube2x2/cube2x2Solver', () => require('../src/solvers/cube2x2/cube2x2Solver'));
      check('src/solvers/pyraminx/pyraminxSolver', () => require('../src/solvers/pyraminx/pyraminxSolver'));
      check('src/solvers/cube4x4/cube4x4Solver', () => require('../src/solvers/cube4x4/cube4x4Solver'));
      check('src/solvers/cube3x3/cube3x3Facelets', () => require('../src/solvers/cube3x3/cube3x3Facelets'));
      check('src/solvers/cube4x4/cube4x4Geometry', () => require('../src/solvers/cube4x4/cube4x4Geometry'));
      check('src/solvers/pyraminx/pyraminxFacelets', () => require('../src/solvers/pyraminx/pyraminxFacelets'));

      // Services & Stores
      check('src/services/adService', () => require('../src/services/adService'));
      check('src/services/debugLogger', () => require('../src/services/debugLogger'));
      check('src/services/hapticsService', () => require('../src/services/hapticsService'));
      check('src/services/keepAwakeService', () => require('../src/services/keepAwakeService'));
      check('src/store/puzzleStore', () => require('../src/store/puzzleStore'));
      check('src/store/settingsStore', () => require('../src/store/settingsStore'));
      check('src/types/puzzle', () => require('../src/types/puzzle'));

      // Ads & Camera
      check('src/ads/adController', () => require('../src/ads/adController'));
      check('src/ads/nativeAdAdapter', () => require('../src/ads/nativeAdAdapter'));
      check('src/ads/BannerAdView', () => require('../src/ads/BannerAdView'));
      check('src/camera/CameraScannerModal', () => require('../src/camera/CameraScannerModal'));

      // Components
      check('src/components/ErrorBoundary', () => require('../src/components/ErrorBoundary'));
      check('src/components/common/AquaticBackground', () => require('../src/components/common/AquaticBackground'));
      check('src/components/Header', () => require('../src/components/Header'));
      check('src/components/ColorPalette', () => require('../src/components/ColorPalette'));
      check('src/components/ConfettiOverlay', () => require('../src/components/ConfettiOverlay'));
      check('src/components/PuzzleNet', () => require('../src/components/PuzzleNet'));
      check('src/components/NetView2x2', () => require('../src/components/NetView2x2'));
      check('src/components/NetView3x3', () => require('../src/components/NetView3x3'));
      check('src/components/NetViewPyraminx', () => require('../src/components/NetViewPyraminx'));
      check('src/components/home/HomeHeader', () => require('../src/components/home/HomeHeader'));
      check('src/components/home/HomePuzzleRow', () => require('../src/components/home/HomePuzzleRow'));
      check('src/components/home/HomePuzzleIllustration', () => require('../src/components/home/HomePuzzleIllustration'));

      // 3D Components
      check('src/components/3d/orbitArrow', () => require('../src/components/3d/orbitArrow'));
      check('src/components/3d/ThreeCanvas', () => require('../src/components/3d/ThreeCanvas'));
      check('src/components/3d/CameraRig', () => require('../src/components/3d/CameraRig'));
      check('src/components/3d/Cube3DView', () => require('../src/components/3d/Cube3DView'));
      check('src/components/3d/PuzzleCube3D', () => require('../src/components/3d/PuzzleCube3D'));
      check('src/components/3d/Pyraminx3D', () => require('../src/components/3d/Pyraminx3D'));
      check('src/components/3d/Pyraminx3DView', () => require('../src/components/3d/Pyraminx3DView'));
      check('src/components/3d/cubieModel', () => require('../src/components/3d/cubieModel'));
      check('src/components/3d/puzzleTurnInfo', () => require('../src/components/3d/puzzleTurnInfo'));
      check('src/components/3d/stickerLayout', () => require('../src/components/3d/stickerLayout'));
      check('src/components/3d/DirectionArrow3D', () => require('../src/components/3d/DirectionArrow3D'));
      check('src/components/3d/TurnArrowRibbon3D', () => require('../src/components/3d/TurnArrowRibbon3D'));

      // Puzzle engine & constants
      check('src/puzzleEngine/puzzleEngine', () => require('../src/puzzleEngine/puzzleEngine'));
      check('src/puzzleEngine/stepPlan', () => require('../src/puzzleEngine/stepPlan'));
      check('src/components/playback/playbackController', () => require('../src/components/playback/playbackController'));
      check('src/constants/adsConfig', () => require('../src/constants/adsConfig'));
      check('src/constants/colors', () => require('../src/constants/colors'));
      check('src/constants/homeTheme', () => require('../src/constants/homeTheme'));
      check('src/constants/learnContent', () => require('../src/constants/learnContent'));
      check('src/constants/licensesData', () => require('../src/constants/licensesData'));
      check('src/constants/links', () => require('../src/constants/links'));

      // Startup functions type checks
      try {
        const kAdapter = require('../src/solvers/cube3x3/kociembaAdapter');
        const c2Solver = require('../src/solvers/cube2x2/cube2x2Solver');
        const pSolver = require('../src/solvers/pyraminx/pyraminxSolver');
        const solversIdx = require('../src/solvers/index');

        console.warn(`[BOOTCHECK] typeof initCube3x3Solver: ${typeof kAdapter.initCube3x3Solver}`);
        console.warn(`[BOOTCHECK] typeof isCube3x3SolverReady: ${typeof kAdapter.isCube3x3SolverReady}`);
        console.warn(`[BOOTCHECK] typeof onCube3x3SolverReady: ${typeof kAdapter.onCube3x3SolverReady}`);
        console.warn(`[BOOTCHECK] typeof initCube2x2Solver: ${typeof c2Solver.initCube2x2Solver}`);
        console.warn(`[BOOTCHECK] typeof initPyraminxSolver: ${typeof pSolver.initPyraminxSolver}`);
        console.warn(`[BOOTCHECK] typeof getPuzzle: ${typeof solversIdx.getPuzzle}`);
      } catch (err: any) {
        console.warn(`[BOOTCHECK] FAIL type checks | ${String(err && err.message)}`);
      }

      console.warn('[BOOTCHECK] DONE');
    };

    setTimeout(testModules, 100);
  }, [loadSettings]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="input" />
            <Stack.Screen name="player" />
            <Stack.Screen name="learn" />
            <Stack.Screen name="settings" />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

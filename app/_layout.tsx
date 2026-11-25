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
      const errorUtils = (global as any).ErrorUtils;
      const prevHandler = errorUtils?.getGlobalHandler?.();

      if (errorUtils?.setGlobalHandler) {
        errorUtils.setGlobalHandler((e: any, isFatal?: boolean) => {
          console.warn(
            '[BOOTCHECK] CAUGHT fatal=' +
              isFatal +
              ' | ' +
              String(e && e.message) +
              ' | ' +
              String(e && e.stack)
          );
        });
      }

      const check = (name: string, fn: () => void) => {
        console.warn(`[BOOTCHECK] TRY ${name}`);
        try {
          fn();
          console.warn(`[BOOTCHECK] OK ${name}`);
        } catch (e: any) {
          console.warn(`[BOOTCHECK] FAIL ${name} | ${String(e && e.message)} | ${String(e && e.stack)}`);
        }
      };

      try {
        // Leaf packages
        check('react-native-svg', () => require('react-native-svg'));
        check('react-native-gesture-handler', () => require('react-native-gesture-handler'));
        check('react-native-reanimated', () => require('react-native-reanimated'));
        check('react-native-worklets', () => require('react-native-worklets'));
        check('react-native-safe-area-context', () => require('react-native-safe-area-context'));
        check('react-native-screens', () => require('react-native-screens'));
        check('lucide-react-native', () => require('lucide-react-native'));
        check('zustand', () => require('zustand'));
        check('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage'));
        check('jpeg-js', () => require('jpeg-js'));
        check('expo-haptics', () => require('expo-haptics'));
        check('expo-keep-awake', () => require('expo-keep-awake'));
        check('expo-camera', () => require('expo-camera'));
        check('expo-asset', () => require('expo-asset'));
        check('expo-file-system', () => require('expo-file-system'));
        check('expo-gl', () => require('expo-gl'));
        check('three', () => require('three'));
        check('@react-three/fiber/native', () => require('@react-three/fiber/native'));
        check('react-native-google-mobile-ads', () => require('react-native-google-mobile-ads'));

        // Key exports typeof checks for 3D stack
        try {
          const threeMod = require('three');
          const expoGlMod = require('expo-gl');
          const r3fMod = require('@react-three/fiber/native');

          console.warn(`[BOOTCHECK] typeof THREE.Scene: ${typeof threeMod.Scene}`);
          console.warn(`[BOOTCHECK] typeof GLView: ${typeof expoGlMod.GLView}`);
          console.warn(`[BOOTCHECK] typeof Canvas: ${typeof r3fMod.Canvas}`);
          console.warn(`[BOOTCHECK] typeof extend: ${typeof r3fMod.extend}`);
          console.warn(`[BOOTCHECK] typeof createRoot: ${typeof r3fMod.createRoot}`);
          console.warn(`[BOOTCHECK] typeof events: ${typeof r3fMod.events}`);
        } catch (err: any) {
          console.warn(`[BOOTCHECK] FAIL 3D exports check | ${String(err && err.message)}`);
        }

        // 3D Components
        check('src/components/3d/ThreeCanvas', () => require('../src/components/3d/ThreeCanvas'));
        check('src/components/3d/CameraRig', () => require('../src/components/3d/CameraRig'));
        check('src/components/3d/cubieModel', () => require('../src/components/3d/cubieModel'));
        check('src/components/3d/stickerLayout', () => require('../src/components/3d/stickerLayout'));
        check('src/components/3d/orbitArrow', () => require('../src/components/3d/orbitArrow'));
        check('src/components/3d/puzzleTurnInfo', () => require('../src/components/3d/puzzleTurnInfo'));
        check('src/components/3d/Cube3DView', () => require('../src/components/3d/Cube3DView'));
        check('src/components/3d/PuzzleCube3D', () => require('../src/components/3d/PuzzleCube3D'));
        check('src/components/3d/Pyraminx3D', () => require('../src/components/3d/Pyraminx3D'));
        check('src/components/3d/Pyraminx3DView', () => require('../src/components/3d/Pyraminx3DView'));

        // Nets
        check('src/components/PuzzleNet', () => require('../src/components/PuzzleNet'));
        check('src/components/NetView2x2', () => require('../src/components/NetView2x2'));
        check('src/components/NetView3x3', () => require('../src/components/NetView3x3'));
        check('src/components/NetViewPyraminx', () => require('../src/components/NetViewPyraminx'));

        // App routes
        check('app/input', () => require('./input'));
        check('app/player', () => require('./player'));
        check('app/gallery', () => require('./gallery'));
        check('app/learn', () => require('./learn'));
        check('app/settings', () => require('./settings'));
        check('app/index', () => require('./index'));

        // Solvers & constants checks
        check('src/solvers/index', () => require('../src/solvers/index'));
        check('src/solvers/cube3x3/kociembaAdapter', () => require('../src/solvers/cube3x3/kociembaAdapter'));
        check('src/solvers/cube2x2/cube2x2Solver', () => require('../src/solvers/cube2x2/cube2x2Solver'));
        check('src/solvers/pyraminx/pyraminxSolver', () => require('../src/solvers/pyraminx/pyraminxSolver'));
        check('src/solvers/cube4x4/cube4x4Solver', () => require('../src/solvers/cube4x4/cube4x4Solver'));
        check('src/puzzleEngine/puzzleEngine', () => require('../src/puzzleEngine/puzzleEngine'));
        check('src/constants/learnContent', () => require('../src/constants/learnContent'));

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
      } finally {
        if (errorUtils?.setGlobalHandler && prevHandler) {
          errorUtils.setGlobalHandler(prevHandler);
        }
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

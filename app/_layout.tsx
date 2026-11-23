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

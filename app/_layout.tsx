import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initCube3x3Solver } from '../src/solvers/cube3x3/kociembaAdapter';
import { adService } from '../src/services/adService';
import { useSettingsStore } from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { Box } from 'lucide-react-native';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        // 1. Load user settings
        await loadSettings();

        // 2. Initialize AdMob/UMP in background (non-blocking)
        adService.initializeWithConsent();

        // 3. Kick off 3x3 solver table builder in background
        initCube3x3Solver();
      } catch (e) {
        console.warn('Initialization error:', e);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    // Safety timeout: Never stay on splash for more than 400ms
    const timer = setTimeout(() => {
      if (isMounted) setIsReady(true);
    }, 400);

    prepare();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.bg }]}>
        <View style={[styles.logoIcon, { backgroundColor: theme.primary }]}>
          <Box color="#FFFFFF" size={48} strokeWidth={2.5} />
        </View>
        <Text style={[styles.splashTitle, { color: theme.text }]}>SolvaCube</Text>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 6,
  },
});

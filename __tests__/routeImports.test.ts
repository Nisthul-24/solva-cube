import React from 'react';

// Mock native modules that Jest doesn't provide by default
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: any) => cb(),
  useLocalSearchParams: () => ({}),
  Stack: Object.assign(({ children }: any) => children, {
    Screen: () => null,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-google-mobile-ads', () => ({
  default: () => ({
    initialize: jest.fn().mockResolvedValue([]),
    setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
  }),
  BannerAd: () => null,
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
  InterstitialAd: { createForAdRequest: jest.fn() },
  RewardedAd: { createForAdRequest: jest.fn() },
  AdEventType: {},
  RewardedAdEventType: {},
  TestIds: {},
  AdsConsent: {
    requestInfoUpdate: jest.fn().mockResolvedValue({}),
    loadAndShowConsentFormIfRequired: jest.fn().mockResolvedValue({}),
  },
  AdsConsentStatus: {},
}));

describe('Route modules and Solvers import test', () => {
  it('imports src/solvers/index.ts and exports getPuzzle as a function', () => {
    const solvers = require('../src/solvers/index');
    expect(typeof solvers.getPuzzle).toBe('function');
  });

  it('imports app/_layout.tsx and exports default as a function', () => {
    const layout = require('../app/_layout');
    expect(typeof layout.default).toBe('function');
  });

  it('imports app/index.tsx and exports default as a function', () => {
    const index = require('../app/index');
    expect(typeof index.default).toBe('function');
  });

  it('imports app/input.tsx and exports default as a function', () => {
    const input = require('../app/input');
    expect(typeof input.default).toBe('function');
  });

  it('imports app/player.tsx and exports default as a function', () => {
    const player = require('../app/player');
    expect(typeof player.default).toBe('function');
  });

  it('imports app/settings.tsx and exports default as a function', () => {
    const settings = require('../app/settings');
    expect(typeof settings.default).toBe('function');
  });

  it('imports app/learn.tsx and exports default as a function', () => {
    const learn = require('../app/learn');
    expect(typeof learn.default).toBe('function');
  });
});

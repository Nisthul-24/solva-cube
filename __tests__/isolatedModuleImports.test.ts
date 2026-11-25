import fs from 'fs';
import path from 'path';

// Mock native modules that cannot run in node/jest
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
  Stack: Object.assign(({ children }: any) => children, {
    Screen: () => null,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('react-native-google-mobile-ads', () => ({
  default: () => ({
    initialize: jest.fn().mockResolvedValue(undefined),
  }),
  BannerAd: () => null,
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'BANNER' },
  InterstitialAd: {
    createForAdRequest: () => ({
      load: jest.fn(),
      show: jest.fn(),
      addAdEventListener: jest.fn(),
    }),
  },
  RewardedAd: {
    createForAdRequest: () => ({
      load: jest.fn(),
      show: jest.fn(),
      addAdEventListener: jest.fn(),
    }),
  },
  AdsConsent: {
    requestInfoUpdate: jest.fn().mockResolvedValue({ isConsentFormAvailable: false }),
    showForm: jest.fn().mockResolvedValue({ status: 'OBTAINED' }),
  },
  AdsConsentStatus: { REQUIRED: 'REQUIRED', OBTAINED: 'OBTAINED' },
  TestIds: { BANNER: 'test', INTERSTITIAL: 'test', REWARDED: 'test' },
}));

function getAllSourceFiles(dir: string): string[] {
  let list: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      list = list.concat(getAllSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.web.tsx') && !entry.name.endsWith('.web.ts')) {
      list.push(full);
    }
  }
  return list;
}

const allAppFiles = getAllSourceFiles(path.resolve(__dirname, '../app'));
const allSrcFiles = getAllSourceFiles(path.resolve(__dirname, '../src'));
const allFiles = [...allAppFiles, ...allSrcFiles];

describe('Isolated Module Load Order Verification', () => {
  allFiles.forEach((file) => {
    const relativePath = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');

    it(`loads ${relativePath} cleanly in isolation with no errors`, () => {
      expect(() => {
        jest.isolateModules(() => {
          require(file);
        });
      }).not.toThrow();
    });
  });
});


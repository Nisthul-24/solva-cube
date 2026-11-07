import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnimationSpeedOption = 'very_slow' | 'slow' | 'normal' | 'fast';
export type AutoViewOption = 'off' | 'minimal' | 'always';
export type HighlightStrengthOption = 'subtle' | 'medium' | 'strong';
export type HighlightStyleOption = 'glass_belt' | 'outline' | 'off';

export interface TurnDurations {
  turnDurationMs: number;
  arrowWaitDurationMs: number;
}

/**
 * Requirement 2:
 * Slow = 2800 ms, Normal = 1400 ms, Fast = 700 ms (per quarter turn; double turns 1.4x).
 * In Play mode: arrow shows for 1800 ms before each turn starts (2.5x on Slow, half on Fast).
 * Very slow = 4500 ms (arrow wait 3.5x 1800ms = 6300 ms).
 */
export function getSpeedDurations(
  speed: AnimationSpeedOption,
  isDouble: boolean
): TurnDurations {
  let baseTurn = 1400;
  let baseWait = 1800;

  switch (speed) {
    case 'very_slow':
      baseTurn = 4500;
      baseWait = 6300;
      break;
    case 'slow':
      baseTurn = 2800;
      baseWait = 4500; // 2.5x of 1800
      break;
    case 'normal':
      baseTurn = 1400;
      baseWait = 1800;
      break;
    case 'fast':
      baseTurn = 700;
      baseWait = 900; // half of 1800
      break;
  }

  const turnDurationMs = isDouble ? Math.round(baseTurn * 1.4) : baseTurn;
  return { turnDurationMs, arrowWaitDurationMs: baseWait };
}

interface SettingsState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  speedOption: AnimationSpeedOption;
  autoViewMode: AutoViewOption;
  highlightStrength: HighlightStrengthOption;
  highlightStyle: HighlightStyleOption;
  showColorBlindLetters: boolean;
  isDarkMode: boolean;
  isColorBlindMode: boolean;
  adsRemoved: boolean;
  cube4x4UnlockedUntil: number;
  consentStatus: 'unknown' | 'granted' | 'denied';

  setSoundEnabled: (val: boolean) => void;
  setHapticsEnabled: (val: boolean) => void;
  setSpeedOption: (val: AnimationSpeedOption) => void;
  setAutoViewMode: (val: AutoViewOption) => void;
  setHighlightStrength: (val: HighlightStrengthOption) => void;
  setHighlightStyle: (val: HighlightStyleOption) => void;
  setShowColorBlindLetters: (val: boolean) => void;
  setIsDarkMode: (val: boolean) => void;
  setIsColorBlindMode: (val: boolean) => void;
  setAdsRemoved: (val: boolean) => void;
  unlock4x4For24h: () => void;
  setConsentStatus: (val: 'unknown' | 'granted' | 'denied') => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_KEY = '@solvacube_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  soundEnabled: true,
  hapticsEnabled: true,
  speedOption: 'normal',
  autoViewMode: 'minimal',
  highlightStrength: 'subtle',
  highlightStyle: 'glass_belt',
  showColorBlindLetters: false,
  isDarkMode: true,
  isColorBlindMode: false,
  adsRemoved: false,
  cube4x4UnlockedUntil: 0,
  consentStatus: 'unknown',

  setSoundEnabled: (soundEnabled) => {
    set({ soundEnabled });
    saveSettings(get());
  },
  setHapticsEnabled: (hapticsEnabled) => {
    set({ hapticsEnabled });
    saveSettings(get());
  },
  setSpeedOption: (speedOption) => {
    set({ speedOption });
    saveSettings(get());
  },
  setAutoViewMode: (autoViewMode) => {
    set({ autoViewMode });
    saveSettings(get());
  },
  setHighlightStrength: (highlightStrength) => {
    set({ highlightStrength });
    saveSettings(get());
  },
  setHighlightStyle: (highlightStyle) => {
    set({ highlightStyle });
    saveSettings(get());
  },
  setShowColorBlindLetters: (showColorBlindLetters) => {
    set({ showColorBlindLetters });
    saveSettings(get());
  },
  setIsDarkMode: (isDarkMode) => {
    set({ isDarkMode });
    saveSettings(get());
  },
  setIsColorBlindMode: (isColorBlindMode) => {
    set({ isColorBlindMode });
    saveSettings(get());
  },
  setAdsRemoved: (adsRemoved) => {
    set({ adsRemoved });
    saveSettings(get());
  },
  unlock4x4For24h: () => {
    const cube4x4UnlockedUntil = Date.now() + 24 * 60 * 60 * 1000;
    set({ cube4x4UnlockedUntil });
    saveSettings(get());
  },
  setConsentStatus: (consentStatus) => {
    set({ consentStatus });
    saveSettings(get());
  },

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.highlightStyle === 'belt' || parsed.highlightStyle === 'glow') {
          parsed.highlightStyle = 'glass_belt';
        }
        set(parsed);
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  },
}));

async function saveSettings(state: SettingsState) {
  try {
    const toSave = {
      soundEnabled: state.soundEnabled,
      hapticsEnabled: state.hapticsEnabled,
      speedOption: state.speedOption,
      autoViewMode: state.autoViewMode,
      highlightStrength: state.highlightStrength,
      highlightStyle: state.highlightStyle,
      showColorBlindLetters: state.showColorBlindLetters,
      isDarkMode: state.isDarkMode,
      isColorBlindMode: state.isColorBlindMode,
      adsRemoved: state.adsRemoved,
      cube4x4UnlockedUntil: state.cube4x4UnlockedUntil,
      consentStatus: state.consentStatus,
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

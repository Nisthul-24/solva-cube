import Constants from 'expo-constants';

/**
 * AdMob Configuration & Ad Unit IDs
 *
 * All ad configuration is centralized in this file, dynamically resolved
 * from app.json "extra.adMob" or EAS environment variables.
 */

export const GOOGLE_TEST_AD_UNIT_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

export const ADS_TIMING_RULES = {
  // 3-minute minimum cooldown between interstitials
  INTERSTITIAL_COOLDOWN_MS: 3 * 60 * 1000,
  // Never show an interstitial in user's first 5 minutes
  FIRST_LAUNCH_DELAY_MS: 5 * 60 * 1000,
  // Show interstitial on 3rd completed solve and every 3rd thereafter
  INTERSTITIAL_SOLVE_INTERVAL: 3,
  // Rewarded video load timeout: grant free unlock after 5 seconds if not loaded/errored
  REWARDED_TIMEOUT_MS: 5000,
};

/**
 * Determine if test ads should be forced.
 * Rule: forceTestIds is true ONLY when __DEV__ is true OR EXPO_PUBLIC_USE_TEST_ADS === "true".
 */
export function isUsingTestAds(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return true;
  }
  if (process.env.EXPO_PUBLIC_USE_TEST_ADS === 'true') {
    return true;
  }
  return false;
}

export function getProductionAdUnitIds() {
  const extra = Constants.expoConfig?.extra?.adMob ?? {};
  return {
    appId: process.env.EXPO_PUBLIC_ADMOB_APP_ID || extra.androidAppId || '',
    banner: process.env.EXPO_PUBLIC_BANNER_ID || extra.bannerAdUnitId || '',
    interstitial: process.env.EXPO_PUBLIC_INTERSTITIAL_ID || extra.interstitialAdUnitId || '',
    rewarded: process.env.EXPO_PUBLIC_REWARDED_ID || extra.rewardedAdUnitId || '',
  };
}

const GOOGLE_SAMPLE_PREFIX = 'ca-app-pub-3940256099942544';

export function isPlaceholderOrSampleId(id?: string): boolean {
  if (!id || typeof id !== 'string') return true;
  const upper = id.toUpperCase();
  if (
    upper.includes('XXXX') ||
    upper.includes('YYYY') ||
    upper.includes('BBBB') ||
    upper.includes('IIII') ||
    upper.includes('RRRR')
  ) {
    return true;
  }
  if (id.includes(GOOGLE_SAMPLE_PREFIX)) {
    return true;
  }
  return false;
}

/**
 * Validates that production builds have genuine AdMob IDs.
 * Fails loudly with an Error if running in production without real IDs.
 */
export function validateProductionAdConfig(): void {
  if (isUsingTestAds()) {
    return;
  }

  const ids = getProductionAdUnitIds();

  if (isPlaceholderOrSampleId(ids.appId)) {
    throw new Error(
      `[AdMob Production Error] Invalid App ID "${ids.appId}". Production builds require a real AdMob App ID.`
    );
  }
  if (isPlaceholderOrSampleId(ids.banner)) {
    throw new Error(
      `[AdMob Production Error] Invalid Banner Unit ID "${ids.banner}". Production builds require a real AdMob Banner Unit ID.`
    );
  }
  if (isPlaceholderOrSampleId(ids.interstitial)) {
    throw new Error(
      `[AdMob Production Error] Invalid Interstitial Unit ID "${ids.interstitial}". Production builds require a real AdMob Interstitial Unit ID.`
    );
  }
  if (isPlaceholderOrSampleId(ids.rewarded)) {
    throw new Error(
      `[AdMob Production Error] Invalid Rewarded Unit ID "${ids.rewarded}". Production builds require a real AdMob Rewarded Unit ID.`
    );
  }
}

/**
 * Returns the appropriate ad unit ID for the current build profile.
 */
export function getAdUnitId(type: 'banner' | 'interstitial' | 'rewarded'): string {
  if (isUsingTestAds()) {
    return GOOGLE_TEST_AD_UNIT_IDS[type];
  }
  validateProductionAdConfig();
  const prodIds = getProductionAdUnitIds();
  return prodIds[type];
}

/**
 * Test device identifiers for RequestConfiguration to safely test real ads without policy strikes.
 */
export function getTestDeviceIdentifiers(): string[] {
  const ids: string[] = ['EMULATOR'];
  const customId = process.env.EXPO_PUBLIC_TEST_DEVICE_ID;
  if (customId) {
    ids.push(customId);
  }
  return ids;
}

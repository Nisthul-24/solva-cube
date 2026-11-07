import { useSettingsStore } from '../store/settingsStore';

export const isExpoGo = true;

export const AD_CONFIG = {
  USE_TEST_IDS: true,
  PRODUCTION_IDS: {
    BANNER: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    INTERSTITIAL: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    REWARDED: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  },
  MIN_INTERSTITIAL_GAP_MS: 3 * 60 * 1000,
};

export function getBannerAdUnitId(): string {
  return 'web-banner';
}

export function getInterstitialAdUnitId(): string {
  return 'web-interstitial';
}

export function getRewardedAdUnitId(): string {
  return 'web-rewarded';
}

class WebAdService {
  private lastInterstitialTime = 0;

  async initializeWithConsent(): Promise<void> {
    console.log('AdMob: Running in Web mode. Native AdMob disabled.');
  }

  preloadInterstitial() {}

  showInterstitialIfAllowed(): boolean {
    if (useSettingsStore.getState().adsRemoved) return false;

    const now = Date.now();
    if (now - this.lastInterstitialTime < AD_CONFIG.MIN_INTERSTITIAL_GAP_MS) {
      return false;
    }
    console.log('[Web Mock] Interstitial ad shown (3-min gap verified)');
    this.lastInterstitialTime = now;
    return true;
  }

  preloadRewarded() {}

  showRewarded(onReward: () => void): boolean {
    console.log('[Web Mock] Rewarded ad watched, reward granted.');
    onReward();
    return true;
  }

  async showConsentFormAgain(): Promise<void> {
    console.log('[Web Mock] Consent form toggled.');
  }
}

export const adService = new WebAdService();


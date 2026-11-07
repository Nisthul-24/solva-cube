import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSettingsStore } from '../store/settingsStore';

// Safe check: Is running inside Expo Go client?
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Platform.OS === 'web';

let mobileAds: any = null;
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;
let AdsConsent: any = null;
let AdsConsentStatus: any = null;

if (!isExpoGo) {
  try {
    const rnadmob = require('react-native-google-mobile-ads');
    mobileAds = rnadmob.default;
    InterstitialAd = rnadmob.InterstitialAd;
    RewardedAd = rnadmob.RewardedAd;
    AdEventType = rnadmob.AdEventType;
    RewardedAdEventType = rnadmob.RewardedAdEventType;
    TestIds = rnadmob.TestIds;
    AdsConsent = rnadmob.AdsConsent;
    AdsConsentStatus = rnadmob.AdsConsentStatus;
  } catch (e) {
    console.warn('Native AdMob not available in current environment:', e);
  }
}

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
  if (TestIds && (AD_CONFIG.USE_TEST_IDS || __DEV__)) {
    return TestIds.ADAPTIVE_BANNER;
  }
  return AD_CONFIG.PRODUCTION_IDS.BANNER;
}

export function getInterstitialAdUnitId(): string {
  if (TestIds && (AD_CONFIG.USE_TEST_IDS || __DEV__)) {
    return TestIds.INTERSTITIAL;
  }
  return AD_CONFIG.PRODUCTION_IDS.INTERSTITIAL;
}

export function getRewardedAdUnitId(): string {
  if (TestIds && (AD_CONFIG.USE_TEST_IDS || __DEV__)) {
    return TestIds.REWARDED;
  }
  return AD_CONFIG.PRODUCTION_IDS.REWARDED;
}

class AdService {
  private lastInterstitialTime = 0;
  private interstitial: any = null;
  private isInterstitialLoaded = false;
  private rewarded: any = null;
  private isRewardedLoaded = false;
  private isInitialized = false;

  async initializeWithConsent(): Promise<void> {
    if (this.isInitialized) return;

    if (isExpoGo || !mobileAds) {
      console.log('AdMob: Running in Expo Go / Web mode. Native ads disabled, using mock fallbacks.');
      this.isInitialized = true;
      return;
    }

    try {
      if (AdsConsent) {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (consentInfo.isConsentFormAvailable && consentInfo.status === AdsConsentStatus?.REQUIRED) {
          const formResult = await AdsConsent.showForm();
          const status = formResult.status === AdsConsentStatus?.OBTAINED ? 'granted' : 'denied';
          useSettingsStore.getState().setConsentStatus(status);
        }
      }

      await mobileAds().initialize();
      this.isInitialized = true;

      this.preloadInterstitial();
      this.preloadRewarded();
    } catch (e) {
      console.warn('AdMob/UMP init warning (gracefully non-blocking):', e);
      this.isInitialized = true;
    }
  }

  preloadInterstitial() {
    if (isExpoGo || !InterstitialAd || useSettingsStore.getState().adsRemoved) return;
    try {
      const adUnitId = getInterstitialAdUnitId();
      this.interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: useSettingsStore.getState().consentStatus === 'denied',
      });

      this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
        this.isInterstitialLoaded = true;
      });

      this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        this.isInterstitialLoaded = false;
        this.preloadInterstitial();
      });

      this.interstitial.addAdEventListener(AdEventType.ERROR, () => {
        this.isInterstitialLoaded = false;
      });

      this.interstitial.load();
    } catch {}
  }

  showInterstitialIfAllowed(): boolean {
    if (useSettingsStore.getState().adsRemoved) return false;

    const now = Date.now();
    const elapsed = now - this.lastInterstitialTime;
    if (elapsed < AD_CONFIG.MIN_INTERSTITIAL_GAP_MS) {
      return false;
    }

    if (isExpoGo) {
      console.log('[Expo Go Mock] Interstitial displayed successfully (3-min gap verified)');
      this.lastInterstitialTime = now;
      return true;
    }

    if (this.interstitial && this.isInterstitialLoaded) {
      try {
        this.interstitial.show();
        this.lastInterstitialTime = now;
        this.isInterstitialLoaded = false;
        return true;
      } catch (e) {
        console.warn('Interstitial show error:', e);
      }
    }
    return false;
  }

  preloadRewarded() {
    if (isExpoGo || !RewardedAd) return;
    try {
      const adUnitId = getRewardedAdUnitId();
      this.rewarded = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: useSettingsStore.getState().consentStatus === 'denied',
      });

      this.rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.isRewardedLoaded = true;
      });

      this.rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        this.isRewardedLoaded = false;
        this.preloadRewarded();
      });

      this.rewarded.addAdEventListener(AdEventType.ERROR, () => {
        this.isRewardedLoaded = false;
      });

      this.rewarded.load();
    } catch {}
  }

  showRewarded(onReward: () => void): boolean {
    if (isExpoGo) {
      console.log('[Expo Go Mock] Rewarded ad completed, reward granted.');
      onReward();
      return true;
    }

    if (this.rewarded && this.isRewardedLoaded) {
      try {
        const unsubscribe = this.rewarded.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          () => {
            onReward();
            unsubscribe();
          }
        );
        this.rewarded.show();
        this.isRewardedLoaded = false;
        return true;
      } catch (e) {
        console.warn('Rewarded ad display error:', e);
      }
    }
    return false;
  }

  async showConsentFormAgain(): Promise<void> {
    if (isExpoGo || !AdsConsent) {
      console.log('[Expo Go Mock] Consent form toggled.');
      return;
    }
    try {
      await AdsConsent.requestInfoUpdate();
      const formResult = await AdsConsent.showForm();
      const status = formResult.status === AdsConsentStatus?.OBTAINED ? 'granted' : 'denied';
      useSettingsStore.getState().setConsentStatus(status);
    } catch (e) {
      console.warn('Consent form error:', e);
    }
  }
}

export const adService = new AdService();

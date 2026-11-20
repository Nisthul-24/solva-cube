import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getAdUnitId, getTestDeviceIdentifiers, ADS_TIMING_RULES } from '../constants/adsConfig';
import { adController } from './adController';
import { AdRewardResult } from './adTypes';

export const isExpoGoOrWeb =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Platform.OS === 'web';

let mobileAds: any = null;
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let AdsConsent: any = null;
let AdsConsentStatus: any = null;

if (!isExpoGoOrWeb) {
  try {
    const rnadmob = require('react-native-google-mobile-ads');
    mobileAds = rnadmob.default;
    InterstitialAd = rnadmob.InterstitialAd;
    RewardedAd = rnadmob.RewardedAd;
    AdEventType = rnadmob.AdEventType;
    RewardedAdEventType = rnadmob.RewardedAdEventType;
    AdsConsent = rnadmob.AdsConsent;
    AdsConsentStatus = rnadmob.AdsConsentStatus;
  } catch (e) {
    // native ad module unavailable
  }
}

class NativeAdAdapter {
  private interstitial: any = null;
  private isInterstitialLoaded = false;
  private rewarded: any = null;
  private isRewardedLoaded = false;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await adController.initialize();

    if (isExpoGoOrWeb || !mobileAds) {
      this.isInitialized = true;
      return;
    }

    try {
      // UMP Consent Check
      if (AdsConsent) {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (consentInfo.isConsentFormAvailable && consentInfo.status === AdsConsentStatus?.REQUIRED) {
          const formResult = await AdsConsent.showForm();
          const status = formResult.status === AdsConsentStatus?.OBTAINED ? 'OBTAINED' : 'REQUIRED';
          await adController.setConsentStatus(status);
        } else if (consentInfo.status === AdsConsentStatus?.NOT_REQUIRED) {
          await adController.setConsentStatus('NOT_REQUIRED');
        }
      }

      try {
        await mobileAds().setRequestConfiguration({
          testDeviceIdentifiers: getTestDeviceIdentifiers(),
        });
      } catch (e) {
        // non-blocking
      }

      await mobileAds().initialize();
      this.isInitialized = true;

      this.preloadInterstitial();
      this.preloadRewarded();
    } catch (e) {
      this.isInitialized = true;
    }
  }

  preloadInterstitial(): void {
    if (isExpoGoOrWeb || !InterstitialAd) return;
    try {
      const adUnitId = getAdUnitId('interstitial');
      this.interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: adController.getState().consentStatus !== 'OBTAINED',
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
    } catch (e) {
      this.isInterstitialLoaded = false;
    }
  }

  preloadRewarded(): void {
    if (isExpoGoOrWeb || !RewardedAd) return;
    try {
      const adUnitId = getAdUnitId('rewarded');
      this.rewarded = RewardedAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: adController.getState().consentStatus !== 'OBTAINED',
      });

      this.rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.isRewardedLoaded = true;
      });

      this.rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        // Handled in showRewarded
      });

      this.rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        this.isRewardedLoaded = false;
        this.preloadRewarded();
      });

      this.rewarded.addAdEventListener(AdEventType.ERROR, () => {
        this.isRewardedLoaded = false;
      });

      this.rewarded.load();
    } catch (e) {
      this.isRewardedLoaded = false;
    }
  }

  async showInterstitial(puzzleId: string): Promise<boolean> {
    const canShow = adController.canShowInterstitial(puzzleId);
    if (!canShow) return false;

    if (adController.getState().devSimulationMode || isExpoGoOrWeb || !this.interstitial) {
      await adController.markInterstitialShown();
      return true;
    }

    if (this.isInterstitialLoaded) {
      try {
        await this.interstitial.show();
        await adController.markInterstitialShown();
        this.isInterstitialLoaded = false;
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Show Rewarded Ad for 4x4 Unlock:
   * Returns true if user earned reward OR if ad errored/timed out after 5s.
   */
  async showRewarded4x4(solutionHash: string): Promise<AdRewardResult> {
    const state = adController.getState();
    if (state.adsRemoved) {
      await adController.unlock4x4Solution(solutionHash);
      return { rewardEarned: true, reason: 'ads_removed' };
    }

    // Dev simulation mode or Web / Expo Go
    if (state.devSimulationMode || isExpoGoOrWeb || !this.rewarded) {
      await adController.unlock4x4Solution(solutionHash);
      return { rewardEarned: true, reason: 'simulated' };
    }

    // Fallback: If not loaded yet, wait up to 5s timeout, then grant free unlock
    return new Promise<AdRewardResult>((resolve) => {
      let resolved = false;

      const finish = async (result: AdRewardResult) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        if (result.rewardEarned) {
          await adController.unlock4x4Solution(solutionHash);
        }
        resolve(result);
        this.preloadRewarded();
      };

      const timer = setTimeout(() => {
        // 5s timeout: grant unlock for free (never block user because an ad failed)
        finish({ rewardEarned: true, reason: 'timeout_fallback' });
      }, ADS_TIMING_RULES.REWARDED_TIMEOUT_MS);

      if (this.isRewardedLoaded) {
        try {
          const unsubscribeEarned = this.rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            () => {
              unsubscribeEarned?.();
              finish({ rewardEarned: true, reason: 'watched' });
            }
          );

          const unsubscribeError = this.rewarded.addAdEventListener(
            AdEventType.ERROR,
            () => {
              unsubscribeError?.();
              finish({ rewardEarned: true, reason: 'error_fallback' });
            }
          );

          this.rewarded.show().catch(() => {
            finish({ rewardEarned: true, reason: 'error_fallback' });
          });
        } catch (e) {
          finish({ rewardEarned: true, reason: 'error_fallback' });
        }
      } else {
        // Attempt load with 5s timeout fallback
        try {
          this.rewarded.load();
          const unsubscribeLoaded = this.rewarded.addAdEventListener(
            RewardedAdEventType.LOADED,
            () => {
              unsubscribeLoaded?.();
              this.isRewardedLoaded = true;
              this.rewarded.show().catch(() => {
                finish({ rewardEarned: true, reason: 'error_fallback' });
              });
            }
          );
          const unsubscribeError = this.rewarded.addAdEventListener(
            AdEventType.ERROR,
            () => {
              unsubscribeError?.();
              finish({ rewardEarned: true, reason: 'error_fallback' });
            }
          );
        } catch (e) {
          finish({ rewardEarned: true, reason: 'error_fallback' });
        }
      }
    });
  }
}

export const nativeAdAdapter = new NativeAdAdapter();


import { adController } from './adController';
import { AdRewardResult } from './adTypes';

export const isExpoGoOrWeb = true;

class WebNativeAdAdapter {
  async initialize(): Promise<void> {
    await adController.initialize();
  }

  preloadInterstitial(): void {}

  preloadRewarded(): void {}

  async showInterstitial(puzzleId: string): Promise<boolean> {
    const canShow = adController.canShowInterstitial(puzzleId);
    if (!canShow) return false;
    await adController.markInterstitialShown();
    return true;
  }

  async showRewarded4x4(solutionHash: string): Promise<AdRewardResult> {
    await adController.unlock4x4Solution(solutionHash);
    return { rewardEarned: true, reason: 'simulated' };
  }
}

export const nativeAdAdapter = new WebNativeAdAdapter();


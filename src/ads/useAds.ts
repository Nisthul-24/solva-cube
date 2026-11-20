import { useState, useEffect, useCallback } from 'react';
import { adController } from './adController';
import { nativeAdAdapter } from './nativeAdAdapter';
import { AdRewardResult } from './adTypes';

export function useRewardedAd() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkUnlocked = useCallback((solutionHash: string) => {
    const unlocked = adController.is4x4SolutionUnlocked(solutionHash);
    setIsUnlocked(unlocked);
    return unlocked;
  }, []);

  const requestUnlock = useCallback(async (solutionHash: string): Promise<AdRewardResult> => {
    setIsLoading(true);
    try {
      const result = await nativeAdAdapter.showRewarded4x4(solutionHash);
      if (result.rewardEarned) {
        setIsUnlocked(true);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isUnlocked,
    isLoading,
    checkUnlocked,
    requestUnlock,
  };
}

export function useInterstitialAd() {
  const [canShow, setCanShow] = useState(false);

  const checkCanShow = useCallback((puzzleId: string) => {
    const allowed = adController.canShowInterstitial(puzzleId);
    setCanShow(allowed);
    return allowed;
  }, []);

  const showIfReady = useCallback(async (puzzleId: string): Promise<boolean> => {
    return nativeAdAdapter.showInterstitial(puzzleId);
  }, []);

  return {
    canShow,
    checkCanShow,
    showIfReady,
  };
}


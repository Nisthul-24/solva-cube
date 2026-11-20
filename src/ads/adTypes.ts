export type UmpConsentStatus = 'UNKNOWN' | 'REQUIRED' | 'NOT_REQUIRED' | 'OBTAINED';

export interface AdControllerState {
  consentStatus: UmpConsentStatus;
  adsRemoved: boolean;
  firstLaunchTime: number;
  lastInterstitialTime: number;
  completedSolvesCount: number;
  unlocked4x4SolutionHash: string | null;
  devSimulationMode: boolean;
}

export interface AdRewardResult {
  rewardEarned: boolean;
  reason?: 'watched' | 'error_fallback' | 'timeout_fallback' | 'ads_removed' | 'simulated';
}


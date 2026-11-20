import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdControllerState, UmpConsentStatus } from './adTypes';
import { ADS_TIMING_RULES } from '../constants/adsConfig';

const STORAGE_KEY = '@solvacube_ads_controller_state_v1';

export class AdController {
  private state: AdControllerState = {
    consentStatus: 'UNKNOWN',
    adsRemoved: false,
    firstLaunchTime: 0,
    lastInterstitialTime: 0,
    completedSolvesCount: 0,
    unlocked4x4SolutionHash: null,
    devSimulationMode: false,
  };

  private isLoaded = false;

  async initialize(now = Date.now()): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = {
          ...this.state,
          ...parsed,
        };
      }
    } catch (e) {
      // storage fallback
    }

    if (!this.state.firstLaunchTime) {
      this.state.firstLaunchTime = now;
      await this.persist();
    }

    this.isLoaded = true;
  }

  getState(): AdControllerState {
    return { ...this.state };
  }

  async setConsentStatus(status: UmpConsentStatus): Promise<void> {
    this.state.consentStatus = status;
    await this.persist();
  }

  async setAdsRemoved(removed: boolean): Promise<void> {
    this.state.adsRemoved = removed;
    await this.persist();
  }

  async setDevSimulationMode(enabled: boolean): Promise<void> {
    this.state.devSimulationMode = enabled;
    await this.persist();
  }

  /**
   * Interstitial Rules:
   * - 3x3, 2x2, Pyraminx only (NOT 4x4)
   * - Shown on 3rd completed solve and every 3rd thereafter
   * - Minimum 3-minute cooldown between interstitials
   * - Never in the first 5 minutes of app use
   * - Never if ads have been removed
   */
  canShowInterstitial(puzzleId: string, now = Date.now()): boolean {
    if (this.state.adsRemoved) return false;
    if (puzzleId === '4x4') return false;

    // Check first launch 5 min delay
    const timeSinceFirstLaunch = now - (this.state.firstLaunchTime || now);
    if (timeSinceFirstLaunch < ADS_TIMING_RULES.FIRST_LAUNCH_DELAY_MS) {
      return false;
    }

    // Check 3 min cooldown
    const timeSinceLastInterstitial = now - (this.state.lastInterstitialTime || 0);
    if (timeSinceLastInterstitial < ADS_TIMING_RULES.INTERSTITIAL_COOLDOWN_MS) {
      return false;
    }

    // Check 3-solve cadence
    if (this.state.completedSolvesCount === 0 || this.state.completedSolvesCount % ADS_TIMING_RULES.INTERSTITIAL_SOLVE_INTERVAL !== 0) {
      return false;
    }

    return true;
  }

  async recordCompletedSolve(puzzleId: string, now = Date.now()): Promise<{ shouldShowInterstitial: boolean }> {
    if (puzzleId !== '4x4') {
      this.state.completedSolvesCount += 1;
    }
    await this.persist();
    const shouldShow = this.canShowInterstitial(puzzleId, now);
    return { shouldShowInterstitial: shouldShow };
  }

  async markInterstitialShown(now = Date.now()): Promise<void> {
    this.state.lastInterstitialTime = now;
    await this.persist();
  }

  /**
   * 4x4 Rewarded Video Rules:
   * - Unlocking is per-solution (persisted across app restarts for that solve)
   * - Back/Next/Start over/Replay within that solve never ask again
   * - A new 4x4 solve (new scramble or new paint) asks again
   * - Ads removed unlocks immediately
   */
  is4x4SolutionUnlocked(solutionHash: string): boolean {
    if (this.state.adsRemoved) return true;
    if (!solutionHash) return false;
    return this.state.unlocked4x4SolutionHash === solutionHash;
  }

  async unlock4x4Solution(solutionHash: string): Promise<void> {
    this.state.unlocked4x4SolutionHash = solutionHash;
    await this.persist();
  }

  async clear4x4SolutionUnlock(): Promise<void> {
    this.state.unlocked4x4SolutionHash = null;
    await this.persist();
  }

  /**
   * Reset state for testing
   */
  async resetState(): Promise<void> {
    this.state = {
      consentStatus: 'UNKNOWN',
      adsRemoved: false,
      firstLaunchTime: 0,
      lastInterstitialTime: 0,
      completedSolvesCount: 0,
      unlocked4x4SolutionHash: null,
      devSimulationMode: false,
    };
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      // ignore
    }
  }
}

export const adController = new AdController();


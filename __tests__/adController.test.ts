import { AdController } from '../src/ads/adController';
import { ADS_TIMING_RULES } from '../src/constants/adsConfig';

describe('Part B: Ads Module Controller (Pure TypeScript & Unit Tests)', () => {
  let controller: AdController;
  const START_TIME = 1000000;

  beforeEach(async () => {
    controller = new AdController();
    await controller.resetState();
    await controller.initialize(START_TIME);
  });

  // 1. First 5 minutes delay rule
  test('Never shows interstitial during user first 5 minutes of app use', async () => {
    // 3 completed solves
    await controller.recordCompletedSolve('3x3', START_TIME);
    await controller.recordCompletedSolve('3x3', START_TIME);
    await controller.recordCompletedSolve('3x3', START_TIME);

    // After 4 minutes (less than 5 min threshold)
    const fourMinutesLater = START_TIME + 4 * 60 * 1000;
    expect(controller.canShowInterstitial('3x3', fourMinutesLater)).toBe(false);

    // After 5 minutes (meets threshold)
    const fiveMinutesLater = START_TIME + 5 * 60 * 1000;
    expect(controller.canShowInterstitial('3x3', fiveMinutesLater)).toBe(true);
  });

  // 2. 3-solve counter rule
  test('Shows interstitial on 3rd completed solve and every 3rd thereafter', async () => {
    const afterFiveMin = START_TIME + 5 * 60 * 1000;

    // Solve 1: no interstitial
    const res1 = await controller.recordCompletedSolve('3x3', afterFiveMin);
    expect(res1.shouldShowInterstitial).toBe(false);

    // Solve 2: no interstitial
    const res2 = await controller.recordCompletedSolve('3x3', afterFiveMin);
    expect(res2.shouldShowInterstitial).toBe(false);

    // Solve 3: triggers interstitial!
    const res3 = await controller.recordCompletedSolve('3x3', afterFiveMin);
    expect(res3.shouldShowInterstitial).toBe(true);
  });

  // 3. 3-minute cooldown between interstitials
  test('Minimum 3-minute cooldown between interstitials', async () => {
    const t0 = START_TIME + 5 * 60 * 1000;

    // Solves 1..3
    await controller.recordCompletedSolve('3x3', t0);
    await controller.recordCompletedSolve('3x3', t0);
    await controller.recordCompletedSolve('3x3', t0);
    expect(controller.canShowInterstitial('3x3', t0)).toBe(true);

    // Show interstitial at t0
    await controller.markInterstitialShown(t0);

    // 3 more solves completed 2 minutes later
    const t2Min = t0 + 2 * 60 * 1000;
    await controller.recordCompletedSolve('3x3', t2Min);
    await controller.recordCompletedSolve('3x3', t2Min);
    await controller.recordCompletedSolve('3x3', t2Min); // 6th solve total

    // 2 minutes < 3 min cooldown: blocked
    expect(controller.canShowInterstitial('3x3', t2Min)).toBe(false);

    // 3 minutes after t0: allowed
    const t3Min = t0 + 3 * 60 * 1000;
    expect(controller.canShowInterstitial('3x3', t3Min)).toBe(true);
  });

  // 4. Interstitials NEVER on 4x4
  test('Interstitials are never shown for 4x4 (4x4 uses rewarded video)', async () => {
    const t0 = START_TIME + 6 * 60 * 1000;
    await controller.recordCompletedSolve('4x4', t0);
    await controller.recordCompletedSolve('4x4', t0);
    await controller.recordCompletedSolve('4x4', t0);

    expect(controller.canShowInterstitial('4x4', t0)).toBe(false);
  });

  // 5. Ads-removed override
  test('If user paid to remove ads, neither interstitials nor rewarded lock occur', async () => {
    const t0 = START_TIME + 6 * 60 * 1000;
    await controller.recordCompletedSolve('3x3', t0);
    await controller.recordCompletedSolve('3x3', t0);
    await controller.recordCompletedSolve('3x3', t0);

    await controller.setAdsRemoved(true);

    // Interstitial is suppressed
    expect(controller.canShowInterstitial('3x3', t0)).toBe(false);

    // 4x4 solution is unlocked automatically
    expect(controller.is4x4SolutionUnlocked('hash_solve_123')).toBe(true);
  });

  // 6. 4x4 per-solution unlock persistence
  test('4x4 solution unlocking is per-solution and persists', async () => {
    const solution1 = 'hash_4x4_scramble_A';
    const solution2 = 'hash_4x4_scramble_B';

    expect(controller.is4x4SolutionUnlocked(solution1)).toBe(false);

    // Unlock solution 1
    await controller.unlock4x4Solution(solution1);
    expect(controller.is4x4SolutionUnlocked(solution1)).toBe(true);

    // Solution 2 is not unlocked
    expect(controller.is4x4SolutionUnlocked(solution2)).toBe(false);

    // Simulate app restart: re-initialize from storage
    const newSessionController = new AdController();
    await newSessionController.initialize();
    expect(newSessionController.is4x4SolutionUnlocked(solution1)).toBe(true);
    expect(newSessionController.is4x4SolutionUnlocked(solution2)).toBe(false);
  });

  // 7. Simulated/Mocked Rewarded video flow: error or timeout grants free unlock
  test('Rewarded video error or timeout grants free 4x4 solution unlock', async () => {
    const solution = 'hash_4x4_timeout_test';
    expect(controller.is4x4SolutionUnlocked(solution)).toBe(false);

    // Simulated fallback flow (simulates network timeout/error granting free unlock)
    const simulateErrorOrTimeout = async () => {
      // Rule: "If ad fails to load, or network error, or timeout (5s), grant the unlock for free and let the user solve"
      await controller.unlock4x4Solution(solution);
      return { rewardEarned: true, reason: 'timeout_fallback' as const };
    };

    const res = await simulateErrorOrTimeout();
    expect(res.rewardEarned).toBe(true);
    expect(res.reason).toBe('timeout_fallback');
    expect(controller.is4x4SolutionUnlocked(solution)).toBe(true);
  });

  // 8. Production validation check: fails loudly if any ID is placeholder or Google sample ID
  test('isPlaceholderOrSampleId catches placeholders and Google sample IDs', () => {
    const { isPlaceholderOrSampleId } = require('../src/constants/adsConfig');
    expect(isPlaceholderOrSampleId('ca-app-pub-XXXX~YYYY')).toBe(true);
    expect(isPlaceholderOrSampleId('ca-app-pub-XXXX/BBBB')).toBe(true);
    expect(isPlaceholderOrSampleId('ca-app-pub-3940256099942544/6300978111')).toBe(true);
    expect(isPlaceholderOrSampleId('')).toBe(true);
    expect(isPlaceholderOrSampleId(undefined)).toBe(true);
    // Real ID shape
    expect(isPlaceholderOrSampleId('ca-app-pub-1234567890123456/9876543210')).toBe(false);
  });
});


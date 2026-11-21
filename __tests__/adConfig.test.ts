import {
  isUsingTestAds,
  getAdUnitId,
  isPlaceholderOrSampleId,
  validateProductionAdConfig,
  GOOGLE_TEST_AD_UNIT_IDS,
} from '../src/constants/adsConfig';

describe('AdMob Configuration & Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('isPlaceholderOrSampleId detects placeholders and Google sample IDs', () => {
    expect(isPlaceholderOrSampleId('ca-app-pub-XXXX~YYYY')).toBe(true);
    expect(isPlaceholderOrSampleId('ca-app-pub-XXXX/BBBB')).toBe(true);
    expect(isPlaceholderOrSampleId('ca-app-pub-3940256099942544/6300978111')).toBe(true);
    expect(isPlaceholderOrSampleId('')).toBe(true);
    expect(isPlaceholderOrSampleId(undefined)).toBe(true);

    // Genuine IDs return false
    expect(isPlaceholderOrSampleId('ca-app-pub-1234567890123456/1234567890')).toBe(false);
  });

  test('validateProductionAdConfig fails loudly if production IDs are placeholders or samples', () => {
    process.env.EXPO_PUBLIC_USE_TEST_ADS = 'false';
    const oldDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    try {
      expect(() => validateProductionAdConfig()).toThrow();
    } finally {
      (global as any).__DEV__ = oldDev;
    }
  });

  test('getAdUnitId returns test IDs when in dev or when EXPO_PUBLIC_USE_TEST_ADS="true"', () => {
    process.env.EXPO_PUBLIC_USE_TEST_ADS = 'true';
    expect(getAdUnitId('banner')).toBe(GOOGLE_TEST_AD_UNIT_IDS.banner);
    expect(getAdUnitId('interstitial')).toBe(GOOGLE_TEST_AD_UNIT_IDS.interstitial);
    expect(getAdUnitId('rewarded')).toBe(GOOGLE_TEST_AD_UNIT_IDS.rewarded);
  });

  test('in production mode, genuine IDs are returned without sample IDs or empty strings', () => {
    process.env.EXPO_PUBLIC_USE_TEST_ADS = 'false';
    process.env.EXPO_PUBLIC_ADMOB_APP_ID = 'ca-app-pub-1234567890123456~1234567890';
    process.env.EXPO_PUBLIC_BANNER_ID = 'ca-app-pub-1234567890123456/1111111111';
    process.env.EXPO_PUBLIC_INTERSTITIAL_ID = 'ca-app-pub-1234567890123456/2222222222';
    process.env.EXPO_PUBLIC_REWARDED_ID = 'ca-app-pub-1234567890123456/3333333333';

    const oldDev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    try {
      const banner = getAdUnitId('banner');
      const interstitial = getAdUnitId('interstitial');
      const rewarded = getAdUnitId('rewarded');

      for (const id of [banner, interstitial, rewarded]) {
        expect(id).toBeTruthy();
        expect(id).not.toContain('3940256099942544');
        expect(isPlaceholderOrSampleId(id)).toBe(false);
      }
    } finally {
      (global as any).__DEV__ = oldDev;
    }
  });
});

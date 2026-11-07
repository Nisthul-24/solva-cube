import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { getBannerAdUnitId, isExpoGo } from '../services/adService';
import { useSettingsStore } from '../store/settingsStore';

let BannerAd: any = null;
let BannerAdSize: any = null;

if (!isExpoGo) {
  try {
    const rnadmob = require('react-native-google-mobile-ads');
    BannerAd = rnadmob.BannerAd;
    BannerAdSize = rnadmob.BannerAdSize;
  } catch {}
}

export function BannerAdComponent() {
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);
  const consentStatus = useSettingsStore((s) => s.consentStatus);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const [hasError, setHasError] = useState(false);

  if (adsRemoved || hasError) {
    return null;
  }

  // In Expo Go or Web, render a clean banner preview placeholder
  if (isExpoGo || !BannerAd || !BannerAdSize) {
    return (
      <View style={[styles.container, styles.mockBanner, { borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
        <Text style={[styles.mockText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          AdMob Adaptive Banner • Active in Release APK
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: consentStatus === 'denied',
        }}
        onAdFailedToLoad={(error: any) => {
          console.log('Banner failed to load, hiding gracefully:', error);
          setHasError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  mockBanner: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 16,
    width: '92%',
    alignSelf: 'center',
    borderStyle: 'dashed',
  },
  mockText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

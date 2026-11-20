import React, { useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { getAdUnitId } from '../constants/adsConfig';
import { isExpoGoOrWeb } from './nativeAdAdapter';
import { useSettingsStore } from '../store/settingsStore';

let BannerAd: any = null;
let BannerAdSize: any = null;

if (!isExpoGoOrWeb) {
  try {
    const rnadmob = require('react-native-google-mobile-ads');
    BannerAd = rnadmob.BannerAd;
    BannerAdSize = rnadmob.BannerAdSize;
  } catch {}
}

export function BannerAdView() {
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);
  const consentStatus = useSettingsStore((s) => s.consentStatus);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Collapses to height 0 if ad fails to load or user paid to remove ads
  if (adsRemoved || hasError) {
    return null;
  }

  // Fallback for Expo Go or Web: renders quiet clean banner preview placeholder
  if (isExpoGoOrWeb || !BannerAd || !BannerAdSize) {
    return (
      <View style={styles.anchorWrapper}>
        <View style={styles.mockBanner}>
          <Text style={styles.mockText}>Ad</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.anchorWrapper, !isLoaded && styles.reservedLoadingHeight]}>
      <BannerAd
        unitId={getAdUnitId('banner')}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: consentStatus === 'denied',
        }}
        onAdLoaded={() => setIsLoaded(true)}
        onAdFailedToLoad={(error: any) => {
          setHasError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  anchorWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8, // 8 dp spacing from bottom
    backgroundColor: 'transparent',
  },
  reservedLoadingHeight: {
    minHeight: 50, // Reserve height while loading to prevent layout shift
  },
  mockBanner: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    width: '92%',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#3A352E',
    backgroundColor: '#2B2722',
  },
  mockText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#B3AA9A',
    letterSpacing: 0.2,
  },
});


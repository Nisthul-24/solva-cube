import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export function BannerAdView() {
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);

  if (adsRemoved) {
    return null;
  }

  return (
    <View style={styles.anchorWrapper}>
      <View style={styles.mockBanner}>
        <Text style={styles.mockText}>Ad</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchorWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
    backgroundColor: '#181614',
  },
  mockBanner: {
    width: 320,
    height: 50,
    backgroundColor: '#221F1B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3A352E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockText: {
    color: '#B3AA9A',
    fontSize: 12,
    fontWeight: '600',
  },
});


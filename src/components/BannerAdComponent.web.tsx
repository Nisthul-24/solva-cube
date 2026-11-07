import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export function BannerAdComponent() {
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);

  if (adsRemoved) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mockBanner,
          {
            borderColor: isDarkMode ? '#334155' : '#E2E8F0',
            backgroundColor: isDarkMode ? '#1E293B40' : '#F8FAFC',
          },
        ]}
      >
        <Text style={[styles.mockText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          AdMob Adaptive Banner • Active in Mobile Release
        </Text>
      </View>
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
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 16,
    width: '92%',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  mockText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});


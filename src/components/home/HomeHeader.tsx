import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, HelpCircle, Box } from 'lucide-react-native';
import { HOME_THEME } from '../../constants/homeTheme';

interface HomeHeaderProps {
  scrolled?: boolean;
}

export function HomeHeader({ scrolled = false }: HomeHeaderProps) {
  const router = useRouter();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: scrolled ? 'rgba(4, 42, 54, 0.92)' : 'transparent',
          borderBottomColor: scrolled ? 'rgba(34, 211, 238, 0.28)' : 'transparent',
          borderBottomWidth: 1,
        },
      ]}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => router.push('/')}
          accessibilityRole="button"
          accessibilityLabel="SolvaCube Home"
          activeOpacity={0.8}
        >
          {/* Flat Amber Rounded Square with Dark Ink Glyph, No Glow */}
          <View style={styles.logoMark}>
            <Box color={HOME_THEME.onPrimary} size={18} strokeWidth={2.4} />
          </View>
          <Text style={styles.title}>SolvaCube</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/learn')}
            accessibilityRole="button"
            accessibilityLabel="Help and guide"
            activeOpacity={0.7}
            hitSlop={Platform.OS !== 'web' ? { top: 10, bottom: 10, left: 10, right: 10 } : undefined}
          >
            <HelpCircle color={HOME_THEME.textMuted} size={22} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            activeOpacity={0.7}
            hitSlop={Platform.OS !== 'web' ? { top: 10, bottom: 10, left: 10, right: 10 } : undefined}
          >
            <Settings color={HOME_THEME.textMuted} size={22} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    zIndex: 20,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: HOME_THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: HOME_THEME.text,
    letterSpacing: -0.3,
    fontFamily: Platform.select({
      web: "'DM Sans', 'Nunito', system-ui, -apple-system, sans-serif",
      default: undefined,
    }),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});

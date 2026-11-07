import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, HelpCircle, Box } from 'lucide-react-native';
import { useSettingsStore } from '../store/settingsStore';
import { UI_COLORS } from '../constants/colors';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export function Header({ title = 'SolvaCube', subtitle }: HeaderProps) {
  const router = useRouter();
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={styles.logoRow}
        onPress={() => router.push('/')}
        accessibilityRole="button"
        accessibilityLabel="Go to Home"
      >
        <View style={[styles.iconBox, { backgroundColor: theme.primary }]}>
          <Box color="#FFFFFF" size={20} strokeWidth={2.5} />
        </View>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.border }]}
          onPress={() => router.push('/learn')}
          accessibilityRole="button"
          accessibilityLabel="Learn notation and how to use"
        >
          <HelpCircle color={theme.textSecondary} size={22} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.border }]}
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Settings color={theme.textSecondary} size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


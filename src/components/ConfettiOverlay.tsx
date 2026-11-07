import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Award, Star, RefreshCw } from 'lucide-react-native';
import { useSettingsStore } from '../store/settingsStore';
import { UI_COLORS } from '../constants/colors';
import { hapticFeedback } from '../services/hapticsService';

interface ConfettiOverlayProps {
  movesCount: number;
  onSolveAnother: () => void;
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FFD500', '#009E60', '#0051BA', '#C41E3A', '#FF5800', '#38BDF8'];

export function ConfettiOverlay({
  movesCount,
  onSolveAnother,
  onDismiss,
}: ConfettiOverlayProps) {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    hapticFeedback.success();
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleRate = () => {
    hapticFeedback.light();
    Linking.openURL('market://details?id=com.solvacube.app').catch(() => {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.solvacube.app');
    });
  };

  // Generate 25 confetti particles with random initial trajectories
  const particles = Array.from({ length: 30 }).map((_, i) => {
    const left = Math.random() * SCREEN_WIDTH;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const size = 6 + Math.random() * 8;
    return { id: i, left, color, size };
  });

  return (
    <View style={styles.overlay}>
      {/* Falling confetti particles */}
      {particles.map((p) => (
        <ConfettiParticle key={p.id} {...p} />
      ))}

      <Animated.View
        style={[
          styles.card,
          cardStyle,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={[styles.badge, { backgroundColor: theme.success + '20' }]}>
          <Award color={theme.success} size={48} />
        </View>

        <Text style={[styles.heading, { color: theme.text }]}>Solved! 🎉</Text>
        <Text style={[styles.subtext, { color: theme.textSecondary }]}>
          You cracked it in <Text style={{ color: theme.primary, fontWeight: '800' }}>{movesCount}</Text> moves!
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={onSolveAnother}
            accessibilityRole="button"
            accessibilityLabel="Solve another puzzle"
          >
            <RefreshCw color="#FFFFFF" size={18} />
            <Text style={styles.primaryBtnText}>Solve Another</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={handleRate}
            accessibilityRole="button"
            accessibilityLabel="Rate SolvaCube on Google Play"
          >
            <Star color="#F59E0B" size={18} fill="#F59E0B" />
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Rate SolvaCube</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: theme.textSecondary }]}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function ConfettiParticle({ left, color, size }: { left: number; color: string; size: number }) {
  const translateY = useSharedValue(-20);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const duration = 2500 + Math.random() * 1500;
    translateY.value = withRepeat(
      withTiming(SCREEN_HEIGHT + 50, { duration, easing: Easing.linear }),
      -1,
      false
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: duration / 2, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animStyle,
        {
          left,
          backgroundColor: color,
          width: size,
          height: size * 1.5,
          borderRadius: 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000085',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 360),
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dismissBtn: {
    marginTop: 14,
    padding: 6,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

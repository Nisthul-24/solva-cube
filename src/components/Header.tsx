import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, HelpCircle, ArrowLeft } from 'lucide-react-native';
import Svg, { Polygon, G, Line } from 'react-native-svg';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

/**
 * 3D Isometric Mini Cube Badge (White top, Green front, Red right)
 */
function MiniCubeBadge({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G>
        {/* Top Face (White) */}
        <Polygon
          points="16,3 28,10 16,17 4,10"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Grid lines top */}
        <Line x1="12" y1="5.3" x2="20" y2="14.7" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="20" y1="5.3" x2="12" y2="14.7" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="8" y1="7.7" x2="24" y2="12.3" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="24" y1="7.7" x2="8" y2="12.3" stroke="#0F172A" strokeWidth="0.8" />

        {/* Left/Front Face (Green) */}
        <Polygon
          points="4,10 16,17 16,30 4,23"
          fill="#009B48"
          stroke="#0F172A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Grid lines left */}
        <Line x1="8" y1="12.3" x2="8" y2="25.3" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="12" y1="14.7" x2="12" y2="27.7" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="4" y1="14.3" x2="16" y2="21.3" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="4" y1="18.7" x2="16" y2="25.7" stroke="#0F172A" strokeWidth="0.8" />

        {/* Right Face (Red) */}
        <Polygon
          points="16,17 28,10 28,23 16,30"
          fill="#B71234"
          stroke="#0F172A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Grid lines right */}
        <Line x1="20" y1="14.7" x2="20" y2="27.7" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="24" y1="12.3" x2="24" y2="25.3" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="16" y1="21.3" x2="28" y2="14.3" stroke="#0F172A" strokeWidth="0.8" />
        <Line x1="16" y1="25.7" x2="28" y2="18.7" stroke="#0F172A" strokeWidth="0.8" />
      </G>
    </Svg>
  );
}

export function Header({
  title = 'SolvaCube',
  subtitle,
  showBack = false,
  onBack,
}: HeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.glassCircleBtn}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.8}
          >
            <ArrowLeft color="#FFFFFF" size={20} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => router.push('/')}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
          activeOpacity={0.8}
        >
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <MiniCubeBadge size={28} />
          {subtitle && (
            <>
              <Text style={styles.divider}>|</Text>
              <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.glassCircleBtn}
          onPress={() => router.push('/learn')}
          accessibilityRole="button"
          accessibilityLabel="Learn notation and guide"
          activeOpacity={0.8}
        >
          <HelpCircle color="#A5F3FC" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.glassCircleBtn}
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          activeOpacity={0.8}
        >
          <Settings color="#A5F3FC" size={20} />
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
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    marginRight: 8,
  },
  logoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 0,
  },
  divider: {
    color: 'rgba(165, 243, 252, 0.4)',
    fontSize: 18,
    fontWeight: '300',
    marginHorizontal: 4,
    flexShrink: 0,
  },
  subtitle: {
    color: '#67E8F9',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glassCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(6, 52, 66, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
});

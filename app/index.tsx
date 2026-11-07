import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Box, Layers, Triangle, Sparkles, ChevronRight, BookOpen, Grid } from 'lucide-react-native';
import { Header } from '../src/components/Header';
import { BannerAdComponent } from '../src/components/BannerAdComponent';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { PuzzleId } from '../src/types/puzzle';
import { hapticFeedback } from '../src/services/hapticsService';
import { adService } from '../src/services/adService';
import { getPuzzle } from '../src/solvers';

interface PuzzleOption {
  id: PuzzleId;
  name: string;
  badge: string;
  description: string;
  icon: typeof Box;
  color: string;
}

const PUZZLES: PuzzleOption[] = [
  {
    id: '3x3',
    name: "3x3 Rubik's Cube",
    badge: 'Popular',
    description: 'The classic twisty puzzle solved step-by-step with optimal moves.',
    icon: Box,
    color: '#0284C7',
  },
  {
    id: '2x2',
    name: '2x2 Pocket Cube',
    badge: 'Fast',
    description: 'Corner-only mini cube solved in intuitive, beginner-friendly stages.',
    icon: Layers,
    color: '#10B981',
  },
  {
    id: '4x4',
    name: '4x4 Revenge Cube',
    badge: 'Pro',
    description: 'Master the 4x4: reduction to centres and paired edges, 3x3 stage and parity fixes.',
    icon: Grid,
    color: '#8B5CF6',
  },
  {
    id: 'pyraminx',
    name: 'Pyraminx',
    badge: 'Pyramid',
    description: 'Regular tetrahedron solved via tips, centres, and edge cycles.',
    icon: Triangle,
    color: '#F59E0B',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const setActivePuzzle = usePuzzleStore((s) => s.setActivePuzzle);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const adsRemoved = useSettingsStore((s) => s.adsRemoved);
  const cube4x4UnlockedUntil = useSettingsStore((s) => s.cube4x4UnlockedUntil);
  const unlock4x4For24h = useSettingsStore((s) => s.unlock4x4For24h);
  const setAdsRemoved = useSettingsStore((s) => s.setAdsRemoved);
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const [loadError, setLoadError] = useState<{ id: string; name: string } | null>(null);

  const handleSelectPuzzle = async (id: PuzzleId) => {
    hapticFeedback.light();
    setLoadError(null);

    try {
      // Verify puzzle plugin exists and loads
      const plugin = getPuzzle(id);
      if (!plugin) {
        throw new Error(`Plugin not found for ${id}`);
      }
      await setActivePuzzle(id);
      router.push('/input');
    } catch (err) {
      const pInfo = PUZZLES.find((p) => p.id === id);
      setLoadError({
        id,
        name: pInfo?.name || id,
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <Header subtitle="Instant Puzzle Solver" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.heroTextCol}>
            <View style={styles.heroBadge}>
              <Sparkles color="#38BDF8" size={14} />
              <Text style={styles.heroBadgeText}>Animated 3D/2D Solutions</Text>
            </View>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Solve any twisty puzzle in minutes</Text>
            <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>
              Enter your physical cube's colours, and SolvaCube guides you with step-by-step plain-English moves.
            </Text>
          </View>
        </View>

        {/* Error Dialog / Banner if puzzle failed to load */}
        {loadError && (
          <View style={styles.errorBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>The {loadError.name} could not be opened</Text>
              <Text style={styles.errorSubtitle}>Please check your connection or retry.</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleSelectPuzzle(loadError.id as PuzzleId)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Puzzle Selection */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>CHOOSE YOUR PUZZLE</Text>

        <View style={styles.puzzleList}>
          {PUZZLES.map((p) => {
            const Icon = p.icon;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.puzzleCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleSelectPuzzle(p.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Select ${p.name}`}
              >
                <View style={[styles.puzzleIconBox, { backgroundColor: p.color + '20' }]}>
                  <Icon color={p.color} size={32} strokeWidth={2.2} />
                </View>

                <View style={styles.puzzleInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.puzzleName, { color: theme.text }]}>{p.name}</Text>
                    <View style={[styles.puzzleBadge, { backgroundColor: p.color + '20' }]}>
                      <Text style={[styles.puzzleBadgeText, { color: p.color }]}>{p.badge}</Text>
                    </View>
                  </View>
                  <Text style={[styles.puzzleDesc, { color: theme.textSecondary }]}>
                    {p.description}
                  </Text>
                </View>

                <ChevronRight color={theme.textSecondary} size={22} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* How to use link card */}
        <TouchableOpacity
          style={[styles.howToCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/learn')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Learn how to hold the cube and read notation"
        >
          <View style={[styles.howToIconBox, { backgroundColor: theme.primary + '20' }]}>
            <BookOpen color={theme.primary} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.howToTitle, { color: theme.text }]}>New to twisty puzzles?</Text>
            <Text style={[styles.howToSubtitle, { color: theme.textSecondary }]}>
              Learn standard move notation (R, U', F2) and how to hold your cube.
            </Text>
          </View>
          <ChevronRight color={theme.textSecondary} size={20} />
        </TouchableOpacity>
      </ScrollView>

      {/* Banner Ad positioned safely at bottom */}
      <BannerAdComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  heroTextCol: {
    gap: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#38BDF820',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  heroBadgeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  errorSubtitle: {
    color: '#f87171',
    fontSize: 13,
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  puzzleList: {
    gap: 12,
    marginBottom: 20,
  },
  puzzleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 14,
  },
  puzzleIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puzzleInfo: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  puzzleName: {
    fontSize: 17,
    fontWeight: '700',
  },
  puzzleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  puzzleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  puzzleDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  howToCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  howToIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howToTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  howToSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});

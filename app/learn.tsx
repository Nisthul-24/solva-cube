import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Compass, RotateCw, RotateCcw, Box, Check, Palette, Sparkles } from 'lucide-react-native';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { PUZZLE_LEARN_CONTENT } from '../src/constants/learnContent';
import { PuzzleId } from '../src/types/puzzle';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

const PUZZLES: Array<{ id: PuzzleId; label: string }> = [
  { id: '3x3', label: "3x3 Cube" },
  { id: '2x2', label: '2x2 Cube' },
  { id: 'pyraminx', label: 'Pyraminx' },
];

function LearnContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ puzzle?: string }>();
  const activePuzzleId = usePuzzleStore((s) => s.activePuzzleId);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const initialPuzzle: PuzzleId =
    params.puzzle && PUZZLE_LEARN_CONTENT[params.puzzle as PuzzleId]
      ? (params.puzzle as PuzzleId)
      : activePuzzleId || '3x3';

  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleId>(initialPuzzle);

  const content = PUZZLE_LEARN_CONTENT[selectedPuzzle] || PUZZLE_LEARN_CONTENT['3x3'];
  const holdBullets = content?.howToHold?.bullets ?? [];
  const colorOpposites = content?.colorLayout?.opposites ?? [];
  const notations = content?.notations ?? [];
  const tips = content?.tips ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      {/* Navigation Header */}
      <View style={[styles.navHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft color={theme.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>How to Use & Notation</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Puzzle Selector Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {PUZZLES.map((p) => {
          const isActive = p.id === selectedPuzzle;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.tabItem,
                isActive && { borderBottomColor: theme.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setSelectedPuzzle(p.id)}
              accessibilityRole="tab"
              accessibilityLabel={`Select ${p.label}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? theme.primary : theme.textSecondary },
                  isActive && { fontWeight: '800' },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* How to hold card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Compass color={theme.primary} size={22} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>How to Hold the {content?.title ?? 'Puzzle'}</Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            {content?.howToHold?.description ?? 'Hold your puzzle with a steady grip throughout all steps:'}
          </Text>

          <View style={styles.bulletList}>
            {holdBullets.map((bullet, idx) => (
              <View key={idx} style={styles.bulletItem}>
                <Check color={theme.success} size={16} />
                <Text style={[styles.bulletText, { color: theme.text }]}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Colour Layout Card */}
        {colorOpposites.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Palette color="#F59E0B" size={22} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Colour Layout</Text>
            </View>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              {content?.colorLayout?.description ?? ''}
            </Text>
            <View style={styles.bulletList}>
              {colorOpposites.map((item, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Sparkles color="#F59E0B" size={14} />
                  <Text style={[styles.bulletText, { color: theme.text }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Move Notation Guide */}
        <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
          {content?.title?.toUpperCase() ?? 'PUZZLE'} MOVE NOTATION
        </Text>

        <View style={styles.notationGrid}>
          {notations.map((n) => (
            <View
              key={n.move}
              style={[styles.notationCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={[styles.moveBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.moveLetter, { color: theme.primary }]}>{n.move}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moveDesc, { color: theme.text }]}>{n.desc}</Text>
                <View style={styles.dirRow}>
                  {n.dir === 'CCW' ? (
                    <RotateCcw color={theme.textSecondary} size={12} />
                  ) : (
                    <RotateCw color={theme.textSecondary} size={12} />
                  )}
                  <Text style={[styles.dirText, { color: theme.textSecondary }]}>
                    {n.dir === 'DOUBLE' ? '180° Half turn' : n.dir === 'CCW' ? 'Counter-clockwise' : 'Clockwise'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Beginner Tips */}
        {tips.length > 0 && (
          <View style={[styles.tipCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
            <Box color={theme.primary} size={24} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.tipTitle, { color: theme.text }]}>Helpful Tips</Text>
              {tips.map((t, idx) => (
                <Text key={idx} style={[styles.tipDesc, { color: theme.textSecondary }]}>
                  • {t}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function LearnScreen() {
  return (
    <ErrorBoundary>
      <LearnContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletText: {
    fontSize: 13,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  notationGrid: {
    gap: 10,
    marginBottom: 20,
  },
  notationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  moveBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveLetter: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  moveDesc: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  dirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dirText: {
    fontSize: 11,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Compass,
  RotateCw,
  RotateCcw,
  Box,
  Check,
  Palette,
  Circle,
  ListOrdered,
  Layers,
  Info,
} from 'lucide-react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { usePuzzleStore } from '../src/store/puzzleStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { UI_COLORS } from '../src/constants/colors';
import { PUZZLE_LEARN_CONTENT } from '../src/constants/learnContent';
import { PuzzleId } from '../src/types/puzzle';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { AquaticBackground } from '../src/components/common/AquaticBackground';

const PUZZLES: Array<{ id: PuzzleId; label: string }> = [
  { id: '3x3', label: '3x3 Cube' },
  { id: '2x2', label: '2x2 Cube' },
  { id: '4x4', label: '4x4 Cube' },
  { id: 'pyraminx', label: 'Pyraminx' },
];

/**
 * Visual SVG diagram illustrating the 4 distinct layers per axis on a 4x4 cube:
 * Outer, Inner, Inner, Outer (both horizontal & vertical).
 */
function LayerNumberingDiagram() {
  const cellSize = 38;
  const gap = 3;
  const startX = 64;
  const startY = 36;
  const layerLabelsX = ['Outer (L)', 'Inner (l)', 'Inner (r)', 'Outer (R)'];
  const layerLabelsY = ['Outer (U)', 'Inner (u)', 'Inner (d)', 'Outer (D)'];

  return (
    <View style={styles.diagramContainer}>
      <Svg width={290} height={210} viewBox="0 0 290 210">
        {/* Column Labels (Top) */}
        {layerLabelsX.map((lbl, colIdx) => {
          const x = startX + colIdx * (cellSize + gap) + cellSize / 2;
          const isOuter = colIdx === 0 || colIdx === 3;
          return (
            <SvgText
              key={`col-${colIdx}`}
              x={x}
              y={24}
              fill={isOuter ? '#22D3EE' : '#F59E0B'}
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              {lbl}
            </SvgText>
          );
        })}

        {/* 4x4 Sticker Grid */}
        {Array.from({ length: 4 }).map((_, r) => {
          const isOuterRow = r === 0 || r === 3;
          return Array.from({ length: 4 }).map((__, c) => {
            const isOuterCol = c === 0 || c === 3;
            const isOuter = isOuterRow || isOuterCol;
            const x = startX + c * (cellSize + gap);
            const y = startY + r * (cellSize + gap);
            return (
              <G key={`cell-${r}-${c}`}>
                <Rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={4}
                  fill={isOuter ? '#1E293B' : '#334155'}
                  stroke={isOuter ? '#38BDF8' : '#F59E0B'}
                  strokeWidth={1.2}
                />
              </G>
            );
          });
        })}

        {/* Row Labels (Right) */}
        {layerLabelsY.map((lbl, rowIdx) => {
          const y = startY + rowIdx * (cellSize + gap) + cellSize / 2 + 3;
          const isOuter = rowIdx === 0 || rowIdx === 3;
          return (
            <SvgText
              key={`row-${rowIdx}`}
              x={startX + 4 * (cellSize + gap) + 6}
              y={y}
              fill={isOuter ? '#22D3EE' : '#F59E0B'}
              fontSize="9"
              fontWeight="bold"
              textAnchor="start"
            >
              {lbl}
            </SvgText>
          );
        })}
      </Svg>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendChip, { backgroundColor: '#38BDF8', borderColor: '#22D3EE' }]} />
          <Text style={styles.legendLabel}>Outer Layers (1 & 4)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendChip, { backgroundColor: '#F59E0B', borderColor: '#D97706' }]} />
          <Text style={styles.legendLabel}>Inner Slices (2 & 3)</Text>
        </View>
      </View>
    </View>
  );
}

function LearnContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <AquaticBackground>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right']}>
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

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
                  <Circle color="#F59E0B" fill="#F59E0B" size={8} />
                  <Text style={[styles.bulletText, { color: theme.text }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 4x4 Layer Numbering Diagram Card */}
        {selectedPuzzle === '4x4' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Layers color="#22D3EE" size={22} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Layer Numbering</Text>
            </View>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Each axis has 4 layers: outer, inner, inner, outer. Outer moves turn a single outer face, inner slices turn an internal slice (r / 2R), and wide moves (Rw) turn both outer and inner together:
            </Text>
            <LayerNumberingDiagram />
          </View>
        )}

        {/* 4-Step Solution Overview Card */}
        {content?.solutionSteps && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <ListOrdered color="#22D3EE" size={22} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>4-Step Solving Overview</Text>
            </View>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              The 4x4 is solved using the Reduction Method in 4 distinct phases:
            </Text>

            <View style={styles.stepsList}>
              {content.solutionSteps.map((step) => (
                <View key={step.number} style={styles.stepRow}>
                  <View style={[styles.stepNumBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
                    <Text style={[styles.stepNumText, { color: theme.primary }]}>{step.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
                    <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>{step.desc}</Text>
                    {step.detail && (
                      <View style={styles.parityCallout}>
                        <Info color="#F59E0B" size={13} style={{ marginTop: 2 }} />
                        <Text style={styles.parityCalloutText}>{step.detail}</Text>
                      </View>
                    )}
                  </View>
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
  </AquaticBackground>
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
  diagramContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendChip: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stepsList: {
    gap: 12,
    marginTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  parityCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  parityCalloutText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
    color: '#FCD34D',
  },
});

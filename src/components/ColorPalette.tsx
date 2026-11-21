import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PuzzleColor } from '../types/puzzle';
import { COLORBLIND_COLORS, STANDARD_COLORS, UI_COLORS } from '../constants/colors';
import { useSettingsStore } from '../store/settingsStore';
import { Check, AlertTriangle } from 'lucide-react-native';

interface ColorPaletteProps {
  availableColors: PuzzleColor[];
  selectedColor: PuzzleColor;
  onSelectColor: (color: PuzzleColor) => void;
  colorCounts: Record<PuzzleColor, number>;
  expectedCountPerColor: number;
  layout?: 'grid' | 'horizontal';
}

export function ColorPalette({
  availableColors,
  selectedColor,
  onSelectColor,
  colorCounts,
  expectedCountPerColor,
  layout = 'grid',
}: ColorPaletteProps) {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const isColorBlind = useSettingsStore((s) => s.isColorBlindMode);
  const colorMap = isColorBlind ? COLORBLIND_COLORS : STANDARD_COLORS;
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  if (layout === 'grid') {
    // 2-column grid of glossy horizontal pills as shown in the mockup
    return (
      <View style={styles.gridContainer}>
        {availableColors.map((color) => {
          const isSelected = color === selectedColor;
          const info = colorMap[color];
          const count = colorCounts[color] || 0;
          const isComplete = count === expectedCountPerColor;
          const isOver = count > expectedCountPerColor;

          return (
            <TouchableOpacity
              key={color}
              style={[
                styles.gridPill,
                isSelected && styles.gridPillSelected,
              ]}
              onPress={() => onSelectColor(color)}
              accessibilityRole="button"
              accessibilityLabel={`${info.name}, ${count} of ${expectedCountPerColor}`}
              activeOpacity={0.8}
            >
              {/* 3D Glossy Color Gem */}
              <View
                style={[
                  styles.glossyGem,
                  { backgroundColor: info.hex },
                  color === 'white' && styles.whiteGemBorder,
                ]}
              >
                {/* Specular curved highlight sheen on gem */}
                <View style={styles.gemGlossSheen} />
                {isColorBlind && (
                  <Text style={[styles.swatchLetter, { color: info.contrastText }]}>
                    {info.letter}
                  </Text>
                )}
              </View>

              {/* Color Name & Count */}
              <View style={styles.pillTextCol}>
                <View style={styles.pillNameRow}>
                  <Text style={styles.gridPillName} numberOfLines={1}>
                    {info.name.split(' ')[0]}
                  </Text>
                  {isSelected && (
                    <View style={styles.inlineCheckBadge}>
                      <Check color="#02242C" size={10} strokeWidth={3.5} />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.gridPillCount,
                    isComplete && styles.gridPillCountComplete,
                    isOver && styles.gridPillCountOver,
                  ]}
                >
                  {count}/{expectedCountPerColor}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Fallback Horizontal Scroll List
  return (
    <View style={styles.horizontalContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {availableColors.map((color) => {
          const isSelected = color === selectedColor;
          const info = colorMap[color];
          const count = colorCounts[color] || 0;
          const isComplete = count === expectedCountPerColor;
          const isOver = count > expectedCountPerColor;

          return (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorCard,
                isSelected && styles.colorCardSelected,
              ]}
              onPress={() => onSelectColor(color)}
              accessibilityRole="button"
              accessibilityLabel={`${info.name}, ${count} of ${expectedCountPerColor}`}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.glossyGem,
                  { backgroundColor: info.hex },
                  color === 'white' && styles.whiteGemBorder,
                ]}
              >
                <View style={styles.gemGlossSheen} />
                {isColorBlind && (
                  <Text style={[styles.swatchLetter, { color: info.contrastText }]}>
                    {info.letter}
                  </Text>
                )}
                {isSelected && !isColorBlind && (
                  <Check color={info.contrastText} size={15} strokeWidth={3} />
                )}
              </View>

              <Text style={styles.colorName} numberOfLines={1}>
                {info.name.split(' ')[0]}
              </Text>

              <Text
                style={[
                  styles.countText,
                  isComplete && styles.gridPillCountComplete,
                  isOver && styles.gridPillCountOver,
                ]}
              >
                {count}/{expectedCountPerColor}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Grid Layout (2-columns matching screenshot) */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  gridPill: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 48, 60, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.22)',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  gridPillSelected: {
    backgroundColor: 'rgba(8, 64, 82, 0.85)',
    borderColor: '#22D3EE',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  glossyGem: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 2,
  },
  whiteGemBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  gemGlossSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  swatchLetter: {
    fontSize: 13,
    fontWeight: '800',
  },
  pillTextCol: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  pillNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gridPillName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  inlineCheckBadge: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#22D3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPillCount: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  gridPillCountComplete: {
    color: '#34D399',
    fontWeight: '700',
  },
  gridPillCountOver: {
    color: '#F87171',
    fontWeight: '700',
  },

  /* Horizontal Scroll Layout */
  horizontalContainer: {
    paddingVertical: 4,
  },
  scrollList: {
    paddingHorizontal: 4,
    gap: 8,
  },
  colorCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(6, 48, 60, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.22)',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 64,
  },
  colorCardSelected: {
    backgroundColor: 'rgba(8, 64, 82, 0.85)',
    borderColor: '#22D3EE',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  colorName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  countText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
});

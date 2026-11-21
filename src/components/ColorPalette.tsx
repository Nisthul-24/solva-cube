import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PuzzleColor } from '../types/puzzle';
import { COLORBLIND_COLORS, STANDARD_COLORS, UI_COLORS } from '../constants/colors';
import { useSettingsStore } from '../store/settingsStore';
import { Check } from 'lucide-react-native';

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
  const isPyraminx = availableColors.length === 4;

  if (layout === 'grid') {
    // Clean color-only grid (3 columns for 6 colors, 4 columns for 4 colors)
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
                styles.gridTile,
                isPyraminx && styles.gridTilePyraminx,
                isSelected && styles.gridTileSelected,
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
                {isColorBlind ? (
                  <Text style={[styles.swatchLetter, { color: info.contrastText }]}>
                    {info.letter}
                  </Text>
                ) : isSelected ? (
                  <Check color={info.contrastText} size={18} strokeWidth={3.5} />
                ) : null}
              </View>

              {/* Count Indicator Only (No color name) */}
              <Text
                style={[
                  styles.tileCount,
                  isComplete && styles.tileCountComplete,
                  isOver && styles.tileCountOver,
                ]}
              >
                {count}/{expectedCountPerColor}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Horizontal Scroll Layout (Color Only)
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
                {isColorBlind ? (
                  <Text style={[styles.swatchLetter, { color: info.contrastText }]}>
                    {info.letter}
                  </Text>
                ) : isSelected ? (
                  <Check color={info.contrastText} size={18} strokeWidth={3.5} />
                ) : null}
              </View>

              <Text
                style={[
                  styles.tileCount,
                  isComplete && styles.tileCountComplete,
                  isOver && styles.tileCountOver,
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
  /* Grid Layout (3-columns for 6-color cubes, 4-columns for Pyraminx) */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  gridTile: {
    width: '31.2%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 48, 60, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.22)',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  gridTilePyraminx: {
    width: '22.8%',
  },
  gridTileSelected: {
    backgroundColor: 'rgba(8, 64, 82, 0.85)',
    borderColor: '#22D3EE',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 4,
  },

  /* 3D Glossy Color Gem */
  glossyGem: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 2,
  },
  whiteGemBorder: {
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  gemGlossSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  swatchLetter: {
    fontSize: 14,
    fontWeight: '800',
  },

  /* Count Indicator */
  tileCount: {
    color: '#A5F3FC',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  tileCountComplete: {
    color: '#34D399',
    fontWeight: '800',
  },
  tileCountOver: {
    color: '#F87171',
    fontWeight: '800',
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
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 58,
  },
  colorCardSelected: {
    backgroundColor: 'rgba(8, 64, 82, 0.85)',
    borderColor: '#22D3EE',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 4,
  },
});

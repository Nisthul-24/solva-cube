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
}

export function ColorPalette({
  availableColors,
  selectedColor,
  onSelectColor,
  colorCounts,
  expectedCountPerColor,
}: ColorPaletteProps) {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const isColorBlind = useSettingsStore((s) => s.isColorBlindMode);
  const colorMap = isColorBlind ? COLORBLIND_COLORS : STANDARD_COLORS;
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        Tap a colour, then tap stickers to paint:
      </Text>

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
                { backgroundColor: theme.card, borderColor: isSelected ? theme.primary : theme.border },
                isSelected && styles.colorCardSelected,
              ]}
              onPress={() => onSelectColor(color)}
              accessibilityRole="button"
              accessibilityLabel={`${info.name}, ${count} of ${expectedCountPerColor}`}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: info.hex, borderColor: isDarkMode ? '#475569' : '#CBD5E1' },
                ]}
              >
                {isColorBlind && (
                  <Text style={[styles.swatchLetter, { color: info.contrastText }]}>
                    {info.letter}
                  </Text>
                )}
                {isSelected && !isColorBlind && (
                  <Check color={info.contrastText} size={16} strokeWidth={3} />
                )}
              </View>

              <Text style={[styles.colorName, { color: theme.text }]}>
                {info.name.split(' ')[0]}
              </Text>

              <View style={styles.badgeRow}>
                {isOver ? (
                  <View style={[styles.countBadge, { backgroundColor: theme.error + '20' }]}>
                    <AlertTriangle color={theme.error} size={11} style={{ marginRight: 2 }} />
                    <Text style={[styles.countText, { color: theme.error, fontWeight: '700' }]}>
                      {count}/{expectedCountPerColor}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: isComplete ? theme.success + '20' : theme.surfaceHover,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        {
                          color: isComplete ? theme.success : theme.textSecondary,
                          fontWeight: isComplete ? '700' : '500',
                        },
                      ]}
                    >
                      {count}/{expectedCountPerColor}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  colorCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 68,
  },
  colorCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  swatchLetter: {
    fontSize: 14,
    fontWeight: '800',
  },
  colorName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countText: {
    fontSize: 11,
  },
});


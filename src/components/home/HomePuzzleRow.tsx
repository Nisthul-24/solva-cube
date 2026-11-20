import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { HOME_THEME } from '../../constants/homeTheme';
import { PuzzleId } from '../../types/puzzle';
import { HomePuzzleIllustration } from './HomePuzzleIllustration';

export interface HomePuzzleItem {
  id: PuzzleId;
  name: string;
  description: string;
  meaningfulLabel?: string;
  labelColor?: string;
}

interface HomePuzzleRowProps {
  puzzle: HomePuzzleItem;
  onPress: (id: PuzzleId) => void;
}

export function HomePuzzleRow({ puzzle, onPress }: HomePuzzleRowProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const fullAccessibilityLabel = `${puzzle.name}. ${puzzle.description}${
    puzzle.meaningfulLabel ? `. ${puzzle.meaningfulLabel}` : ''
  }`;

  return (
    <Pressable
      style={[
        styles.rowCard,
        {
          backgroundColor: isPressed ? HOME_THEME.surface2 : HOME_THEME.surface,
          borderColor: isFocused ? HOME_THEME.primary : HOME_THEME.border,
        },
        Platform.OS === 'web' && isFocused
          ? ({
              outlineColor: HOME_THEME.primary,
              outlineWidth: 2,
              outlineStyle: 'solid',
            } as any)
          : null,
      ]}
      onPress={() => onPress(puzzle.id)}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={fullAccessibilityLabel}
    >
      {/* 72x72 Tile with Illustration */}
      <HomePuzzleIllustration puzzleId={puzzle.id} />

      {/* Center Details */}
      <View style={styles.detailsCol}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {puzzle.name}
          </Text>
          {puzzle.meaningfulLabel && (
            <Text
              style={[
                styles.label,
                { color: puzzle.labelColor || HOME_THEME.textMuted },
              ]}
            >
              {puzzle.meaningfulLabel}
            </Text>
          )}
        </View>

        <Text style={styles.description}>
          {puzzle.description}
        </Text>
      </View>

      {/* Far Right Chevron */}
      <View style={styles.chevronWrap}>
        <ChevronRight color={HOME_THEME.textMuted} size={20} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowCard: {
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 100ms ease, border-color 100ms ease',
      },
      default: {},
    }),
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: HOME_THEME.text,
    fontFamily: Platform.select({
      web: "'DM Sans', 'Nunito', system-ui, -apple-system, sans-serif",
      default: undefined,
    }),
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.select({
      web: "'DM Sans', 'Nunito', system-ui, -apple-system, sans-serif",
      default: undefined,
    }),
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: HOME_THEME.textMuted,
    fontFamily: Platform.select({
      web: "'DM Sans', 'Nunito', system-ui, -apple-system, sans-serif",
      default: undefined,
    }),
  },
  chevronWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
});

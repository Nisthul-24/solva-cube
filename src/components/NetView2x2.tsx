import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Cube2x2State, FaceName2x2 } from '../solvers/cube2x2/cube2x2Facelets';
import { COLORBLIND_COLORS, STANDARD_COLORS, UI_COLORS } from '../constants/colors';
import { useSettingsStore } from '../store/settingsStore';
import { RotateCw, RotateCcw } from 'lucide-react-native';

interface NetView2x2Props {
  state: Cube2x2State;
  onStickerPress?: (faceId: FaceName2x2, stickerIdx: number) => void;
  activeFaceIndex?: { faceId: string; stickerIdx: number } | null;
  highlightFace?: string;
  highlightDirection?: 'CW' | 'CCW' | 'DOUBLE';
  readOnly?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const STICKER_SIZE = Math.min(36, Math.floor((SCREEN_WIDTH - 48) / 8));
const FACE_SIZE = STICKER_SIZE * 2 + 4;

export function NetView2x2({
  state,
  onStickerPress,
  activeFaceIndex,
  highlightFace,
  highlightDirection,
  readOnly = false,
}: NetView2x2Props) {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const isColorBlind = useSettingsStore((s) => s.isColorBlindMode);
  const colorMap = isColorBlind ? COLORBLIND_COLORS : STANDARD_COLORS;
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const renderFace = (faceId: FaceName2x2, label: string) => {
    const faceColors = state[faceId];
    const isFaceHighlighted = highlightFace === faceId;

    return (
      <View
        style={[
          styles.faceBox,
          {
            width: FACE_SIZE,
            height: FACE_SIZE,
            borderColor: isFaceHighlighted ? theme.primary : theme.border,
            borderWidth: isFaceHighlighted ? 2.5 : 1,
            backgroundColor: isFaceHighlighted ? theme.primary + '15' : 'transparent',
          },
        ]}
      >
        {isFaceHighlighted && (
          <View style={styles.turnIndicator}>
            {highlightDirection === 'CCW' ? (
              <RotateCcw color={theme.primary} size={14} strokeWidth={3} />
            ) : (
              <RotateCw color={theme.primary} size={14} strokeWidth={3} />
            )}
            <Text style={[styles.turnText, { color: theme.primary }]}>
              {highlightDirection === 'DOUBLE' ? '180°' : highlightDirection === 'CCW' ? "90° CCW" : '90° CW'}
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {faceColors.map((color, idx) => {
            const isStickerActive =
              activeFaceIndex?.faceId === faceId && activeFaceIndex?.stickerIdx === idx;
            const info = colorMap[color];

            return (
              <TouchableOpacity
                key={idx}
                disabled={readOnly}
                style={[
                  styles.sticker,
                  {
                    width: STICKER_SIZE,
                    height: STICKER_SIZE,
                    backgroundColor: info.hex,
                    borderColor: isStickerActive
                      ? theme.primary
                      : isDarkMode
                      ? '#1E293B'
                      : '#CBD5E1',
                    borderWidth: isStickerActive ? 2.5 : 1,
                  },
                ]}
                onPress={() => onStickerPress && onStickerPress(faceId, idx)}
                accessibilityRole="button"
                accessibilityLabel={`${label} sticker ${idx + 1}, ${info.name}`}
              >
                {isColorBlind && (
                  <Text style={[styles.stickerText, { color: info.contrastText }]}>
                    {info.letter}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.faceLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={{ width: FACE_SIZE }} />
        {renderFace('U', 'TOP (White)')}
        <View style={{ width: FACE_SIZE }} />
        <View style={{ width: FACE_SIZE }} />
      </View>

      <View style={styles.row}>
        {renderFace('L', 'LEFT (Orange)')}
        {renderFace('F', 'FRONT (Green)')}
        {renderFace('R', 'RIGHT (Red)')}
        {renderFace('B', 'BACK (Blue)')}
      </View>

      <View style={styles.row}>
        <View style={{ width: FACE_SIZE }} />
        {renderFace('D', 'BOTTOM (Yellow)')}
        <View style={{ width: FACE_SIZE }} />
        <View style={{ width: FACE_SIZE }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 3,
  },
  faceBox: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    position: 'relative',
  },
  turnIndicator: {
    position: 'absolute',
    top: -18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
    zIndex: 10,
  },
  turnText: {
    fontSize: 9,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: STICKER_SIZE * 2 + 2,
    gap: 2,
  },
  sticker: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  faceLabel: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 3,
    textTransform: 'uppercase',
  },
});


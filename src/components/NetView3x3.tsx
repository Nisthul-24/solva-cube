import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Cube3x3State, FaceName3x3 } from '../solvers/cube3x3/cube3x3Facelets';
import { COLORBLIND_COLORS, STANDARD_COLORS, UI_COLORS } from '../constants/colors';
import { useSettingsStore } from '../store/settingsStore';
import { Lock, RotateCw, RotateCcw } from 'lucide-react-native';

interface NetView3x3Props {
  state: Cube3x3State;
  onStickerPress?: (faceId: FaceName3x3, stickerIdx: number) => void;
  activeFaceIndex?: { faceId: string; stickerIdx: number } | null;
  highlightFace?: string; // e.g. 'R', 'U', 'F'
  highlightDirection?: 'CW' | 'CCW' | 'DOUBLE';
  readOnly?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
// Net has 4 faces horizontally: L, F, R, B.
// Each face has 3 stickers. Total stickers horizontally = 12.
// Available width ~ (SCREEN_WIDTH - 32)
const STICKER_SIZE = Math.min(26, Math.floor((SCREEN_WIDTH - 48) / 12));
const FACE_SIZE = STICKER_SIZE * 3 + 4;

export function NetView3x3({
  state,
  onStickerPress,
  activeFaceIndex,
  highlightFace,
  highlightDirection,
  readOnly = false,
}: NetView3x3Props) {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const isColorBlind = useSettingsStore((s) => s.isColorBlindMode);
  const colorMap = isColorBlind ? COLORBLIND_COLORS : STANDARD_COLORS;
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  const renderFace = (faceId: FaceName3x3, label: string) => {
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
            const isCenter = idx === 4;
            const isStickerActive =
              activeFaceIndex?.faceId === faceId && activeFaceIndex?.stickerIdx === idx;
            const info = colorMap[color];

            return (
              <TouchableOpacity
                key={idx}
                disabled={readOnly || isCenter}
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
                {isCenter && !isColorBlind && (
                  <Lock color={info.contrastText + '80'} size={9} strokeWidth={2.5} />
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
      {/* Top Row: Up (U) */}
      <View style={styles.row}>
        <View style={{ width: FACE_SIZE }} />
        {renderFace('U', 'TOP (White)')}
        <View style={{ width: FACE_SIZE }} />
        <View style={{ width: FACE_SIZE }} />
      </View>

      {/* Middle Row: Left (L), Front (F), Right (R), Back (B) */}
      <View style={styles.row}>
        {renderFace('L', 'LEFT (Orange)')}
        {renderFace('F', 'FRONT (Green)')}
        {renderFace('R', 'RIGHT (Red)')}
        {renderFace('B', 'BACK (Blue)')}
      </View>

      {/* Bottom Row: Down (D) */}
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
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 3,
    marginVertical: 2,
  },
  faceBox: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
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
    width: STICKER_SIZE * 3 + 2,
    gap: 1,
  },
  sticker: {
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerText: {
    fontSize: 9,
    fontWeight: '800',
  },
  faceLabel: {
    fontSize: 7,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});


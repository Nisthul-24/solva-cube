import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import { PyraminxState, FaceNamePyraminx } from '../solvers/pyraminx/pyraminxFacelets';
import { COLORBLIND_COLORS, STANDARD_COLORS, UI_COLORS } from '../constants/colors';
import { useSettingsStore } from '../store/settingsStore';
import { RotateCw, RotateCcw } from 'lucide-react-native';

interface NetViewPyraminxProps {
  state: PyraminxState;
  onStickerPress?: (faceId: FaceNamePyraminx, stickerIdx: number) => void;
  activeFaceIndex?: { faceId: string; stickerIdx: number } | null;
  highlightFace?: string;
  highlightDirection?: 'CW' | 'CCW' | 'DOUBLE';
  readOnly?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const TRIANGLE_WIDTH = Math.min(100, Math.floor((SCREEN_WIDTH - 48) / 3.2));
const TRIANGLE_HEIGHT = TRIANGLE_WIDTH * (Math.sqrt(3) / 2);

export function NetViewPyraminx({
  state,
  onStickerPress,
  activeFaceIndex,
  highlightFace,
  highlightDirection,
  readOnly = false,
}: NetViewPyraminxProps) {
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const isColorBlind = useSettingsStore((s) => s.isColorBlindMode);
  const colorMap = isColorBlind ? COLORBLIND_COLORS : STANDARD_COLORS;
  const theme = isDarkMode ? UI_COLORS.dark : UI_COLORS.light;

  /**
   * Generates polygon coordinates for 9 sub-triangles of side 1/3:
   * (Base width = W, Height = H)
   */
  const getSubTrianglePoints = (idx: number, W: number, H: number): string => {
    const w = W / 3;
    const h = H / 3;

    // Row 0:
    // [0]: top tip pointing up
    if (idx === 0) {
      return `${W / 2},0 ${W / 2 - w / 2},${h} ${W / 2 + w / 2},${h}`;
    }

    // Row 1:
    // [1]: pointing down
    if (idx === 1) {
      return `${W / 2 - w / 2},${h} ${W / 2},${2 * h} ${W / 2 - w},${2 * h}`;
    }
    // [2]: pointing up (center)
    if (idx === 2) {
      return `${W / 2},${h} ${W / 2 - w / 2},${2 * h} ${W / 2 + w / 2},${2 * h}`;
    }
    // [3]: pointing down
    if (idx === 3) {
      return `${W / 2 + w / 2},${h} ${W / 2 + w},${2 * h} ${W / 2},${2 * h}`;
    }

    // Row 2:
    // [4]: bottom-left tip (pointing up)
    if (idx === 4) {
      return `${W / 2 - w},${2 * h} ${0},${3 * h} ${w},${3 * h}`;
    }
    // [5]: pointing down
    if (idx === 5) {
      return `${W / 2 - w / 2},${2 * h} ${2 * w},${3 * h} ${w},${3 * h}`;
    }
    // [6]: pointing up
    if (idx === 6) {
      return `${W / 2},${2 * h} ${W / 2 - w / 2},${3 * h} ${W / 2 + w / 2},${3 * h}`;
    }
    // [7]: pointing down
    if (idx === 7) {
      return `${W / 2 + w / 2},${2 * h} ${3 * w},${3 * h} ${2 * w},${3 * h}`;
    }
    // [8]: bottom-right tip (pointing up)
    if (idx === 8) {
      return `${W / 2 + w},${2 * h} ${2 * w},${3 * h} ${3 * w},${3 * h}`;
    }

    return '';
  };

  const getSubTriangleCentroid = (idx: number, W: number, H: number): { x: number; y: number } => {
    const w = W / 3;
    const h = H / 3;
    switch (idx) {
      case 0: return { x: W / 2, y: h * 0.65 };
      case 1: return { x: W / 2 - w / 2, y: h * 1.6 };
      case 2: return { x: W / 2, y: h * 1.65 };
      case 3: return { x: W / 2 + w / 2, y: h * 1.6 };
      case 4: return { x: w / 2, y: h * 2.65 };
      case 5: return { x: w * 1.25, y: h * 2.6 };
      case 6: return { x: W / 2, y: h * 2.65 };
      case 7: return { x: w * 2.25, y: h * 2.6 };
      case 8: return { x: W - w / 2, y: h * 2.65 };
      default: return { x: 0, y: 0 };
    }
  };

  const renderFace = (faceId: FaceNamePyraminx, label: string) => {
    const faceColors = state[faceId];
    const isFaceHighlighted =
      highlightFace === faceId || highlightFace?.toLowerCase() === faceId.toLowerCase();

    return (
      <View style={[styles.faceWrapper, isFaceHighlighted && styles.faceHighlighted]}>
        {isFaceHighlighted && (
          <View style={styles.turnIndicator}>
            {highlightDirection === 'CCW' ? (
              <RotateCcw color={theme.primary} size={14} strokeWidth={3} />
            ) : (
              <RotateCw color={theme.primary} size={14} strokeWidth={3} />
            )}
            <Text style={[styles.turnText, { color: theme.primary }]}>
              {highlightDirection === 'CCW' ? "CCW" : 'CW'}
            </Text>
          </View>
        )}

        <Svg width={TRIANGLE_WIDTH} height={TRIANGLE_HEIGHT}>
          {faceColors.map((color, idx) => {
            const isStickerActive =
              activeFaceIndex?.faceId === faceId && activeFaceIndex?.stickerIdx === idx;
            const points = getSubTrianglePoints(idx, TRIANGLE_WIDTH, TRIANGLE_HEIGHT);
            const centroid = getSubTriangleCentroid(idx, TRIANGLE_WIDTH, TRIANGLE_HEIGHT);
            const info = colorMap[color];

            return (
              <React.Fragment key={idx}>
                <Polygon
                  points={points}
                  fill={info.hex}
                  stroke={isStickerActive ? theme.primary : isDarkMode ? '#0F172A' : '#E2E8F0'}
                  strokeWidth={isStickerActive ? 3 : 1.5}
                  onPress={() => !readOnly && onStickerPress && onStickerPress(faceId, idx)}
                />
                {isColorBlind && (
                  <SvgText
                    x={centroid.x}
                    y={centroid.y}
                    fill={info.contrastText}
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {info.letter}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
        <Text style={[styles.faceTitle, { color: theme.textSecondary }]}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Face: Front (F) */}
      <View style={styles.topRow}>{renderFace('F', 'FRONT (Green)')}</View>

      {/* Bottom Row: Left (L), Bottom/Down (D), Right (R) */}
      <View style={styles.bottomRow}>
        {renderFace('L', 'LEFT (Blue)')}
        {renderFace('D', 'BOTTOM (Yellow)')}
        {renderFace('R', 'RIGHT (Red)')}
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
  topRow: {
    alignItems: 'center',
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  faceWrapper: {
    alignItems: 'center',
    padding: 2,
    position: 'relative',
  },
  faceHighlighted: {
    borderRadius: 8,
    backgroundColor: '#38BDF815',
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
  faceTitle: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});


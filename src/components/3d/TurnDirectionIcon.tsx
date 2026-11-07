import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { Vec3 } from '../../solvers/pyraminx/pyraminxGeometry';
import { getScreenTurnSense } from './puzzleTurnInfo';

interface TurnDirectionIconProps {
  axis: Vec3;
  angleRad: number;
  cameraPos: Vec3;
  size?: number;
  onBestViewTap?: () => void;
  showHint?: boolean;
}

export const TurnDirectionIcon: React.FC<TurnDirectionIconProps> = ({
  axis,
  angleRad,
  cameraPos,
  size = 56,
  onBestViewTap,
  showHint = true,
}) => {
  const { sense, dotProduct, isEdgeOn } = getScreenTurnSense(axis, angleRad, cameraPos);

  const strokeColor = isEdgeOn ? '#64748b' : '#22d3ee';
  const bgColor = isEdgeOn ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.88)';
  const badgeBorder = isEdgeOn ? 'rgba(100, 116, 139, 0.4)' : 'rgba(34, 211, 238, 0.5)';

  // Center and radius for SVG circle arc
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;

  // Circular arc with arrow:
  // CCW: Arc sweeps counter-clockwise (e.g. from 45 deg to 315 deg CCW), arrowhead at 45 deg pointing up-left.
  // CW: Arc sweeps clockwise (e.g. from 315 deg to 45 deg CW), arrowhead pointing down-left.
  // In SVG coordinates (Y down):
  // Angle 0 is (cx + r, cy).
  // Clockwise in SVG is increasing angle.
  // Counter-clockwise in SVG is decreasing angle.
  // On screen:
  // Mathematical CCW: from +X toward +Y in math (upwards in screen means decreasing SVG y).
  // So CCW on screen = decreasing SVG angle.
  // CW on screen = increasing SVG angle.

  // CCW path: from (cx + r, cy) curving up and over to left, ending with arrowhead pointing down/left
  // Arc path from ~ 30° to 300° counter-clockwise (which in SVG y-down is clockwise in SVG coords if y is down)
  // Let's draw explicit SVG path for CW and CCW:
  const isCCW = sense === 'CCW';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            borderColor: badgeBorder,
            opacity: isEdgeOn ? 0.45 : 1,
          },
        ]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Subtle guide ring */}
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={strokeColor}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            strokeOpacity={0.35}
            fill="none"
          />

          {/* Turn Direction Arc & Arrowhead */}
          {isCCW ? (
            // Counter-Clockwise Arrow
            <G>
              {/* Arc sweeping 220 degrees CCW (SVG angle decreasing) */}
              <Path
                d={`M ${cx + r * 0.7} ${cy + r * 0.7} A ${r} ${r} 0 1 0 ${cx + r * 0.7} ${cy - r * 0.7}`}
                stroke={strokeColor}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
              {/* Arrowhead at end */}
              <Path
                d={`M ${cx + r * 0.7 - 5} ${cy - r * 0.7 - 7} L ${cx + r * 0.7} ${cy - r * 0.7} L ${cx + r * 0.7 + 7} ${cy - r * 0.7 - 3}`}
                stroke={strokeColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </G>
          ) : (
            // Clockwise Arrow
            <G>
              {/* Arc sweeping 220 degrees CW (SVG angle increasing) */}
              <Path
                d={`M ${cx + r * 0.7} ${cy - r * 0.7} A ${r} ${r} 0 1 1 ${cx + r * 0.7} ${cy + r * 0.7}`}
                stroke={strokeColor}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
              {/* Arrowhead at end */}
              <Path
                d={`M ${cx + r * 0.7 - 5} ${cy + r * 0.7 + 7} L ${cx + r * 0.7} ${cy + r * 0.7} L ${cx + r * 0.7 + 7} ${cy + r * 0.7 + 3}`}
                stroke={strokeColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </G>
          )}

          {/* Center pivot dot */}
          <Circle cx={cx} cy={cy} r={2.5} fill={strokeColor} />
        </Svg>

        <Text style={[styles.senseLabel, { color: strokeColor }]}>
          {isCCW ? 'CCW' : 'CW'}
        </Text>
      </View>

      {/* Edge-on Hint and Best View Button */}
      {isEdgeOn && showHint && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Rotate the view to see this turn</Text>
          {onBestViewTap && (
            <TouchableOpacity
              style={styles.bestViewButton}
              onPress={onBestViewTap}
              activeOpacity={0.8}
            >
              <Text style={styles.bestViewText}>Best view</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  senseLabel: {
    position: 'absolute',
    bottom: 3,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hintContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
    maxWidth: 160,
  },
  hintText: {
    color: '#e2e8f0',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  bestViewButton: {
    backgroundColor: '#22d3ee',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestViewText: {
    color: '#0b1120',
    fontSize: 10,
    fontWeight: '700',
  },
});


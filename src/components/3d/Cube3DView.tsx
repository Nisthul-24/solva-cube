import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { RotateCcw, Eye, Compass } from 'lucide-react-native';
import { ThreeCanvas } from './ThreeCanvas';
import { PuzzleCube3D, FloatingLabelInfo } from './PuzzleCube3D';
import { Cube3x3State } from '../../solvers/cube3x3/cube3x3Facelets';
import { FaceName3x3, HighlightStrength } from './cubieModel';
import { AutoViewOption, HighlightStyleOption, useSettingsStore } from '../../store/settingsStore';
import { TurnDirectionIcon } from './TurnDirectionIcon';
import { getPuzzleTurnInfo, getBestViewCamera } from './puzzleTurnInfo';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { useBestView } from '../../hooks/useBestView';
import { Vec3 } from '../../solvers/pyraminx/pyraminxGeometry';

interface Cube3DViewProps {
  cubeState: any;
  dimension?: 2 | 3 | 4;
  activeFace?: FaceName3x3 | null;
  currentMoveNotation?: string | null;
  isAnimating: boolean;
  isGhostPreview?: boolean;
  turnDurationMs: number;
  autoViewMode: AutoViewOption;
  highlightStrength: HighlightStrength;
  highlightStyle?: HighlightStyleOption;
  showColorBlindLetters: boolean;
  isSolved: boolean;
  interactivePainting?: boolean;
  activeStickerCursor?: number | null;
  onAnimationComplete?: () => void;
  onCameraMoveComplete?: () => void;
  onAutoViewModeChange?: (mode: AutoViewOption) => void;
  onStickerClick?: (face: FaceName3x3, stickerIndex: number) => void;
  style?: any;
}

export const Cube3DView: React.FC<Cube3DViewProps> = ({
  cubeState,
  dimension = 3,
  activeFace,
  currentMoveNotation,
  isAnimating,
  isGhostPreview = false,
  turnDurationMs,
  autoViewMode,
  highlightStrength,
  highlightStyle: propHighlightStyle,
  showColorBlindLetters,
  isSolved,
  interactivePainting = false,
  activeStickerCursor,
  onAnimationComplete,
  onCameraMoveComplete,
  onAutoViewModeChange,
  onStickerClick,
  style,
}) => {
  const storeHighlightStyle = useSettingsStore((s) => s.highlightStyle);
  const highlightStyle = propHighlightStyle || storeHighlightStyle || 'glass_belt';

  const [azimuth, setAzimuth] = useState(0.6);
  const [elevation, setElevation] = useState(0.5);
  const [floatingLabels, setFloatingLabels] = useState<FloatingLabelInfo[]>([]);
  const [movingChip, setMovingChip] = useState<{ text: string; screenX: number; screenY: number; visible: boolean } | null>(null);
  const [devInfo, setDevInfo] = useState<{ targetDir: [number, number, number]; dot: number } | null>(null);

  const unified = useMemo(() => {
    if (!currentMoveNotation || isSolved) return null;
    try {
      const pType: '3x3' | '2x2' | '4x4' = dimension === 4 ? '4x4' : dimension === 2 ? '2x2' : '3x3';
      return getPuzzleTurnInfo(pType, currentMoveNotation);
    } catch (e) {
      return null;
    }
  }, [dimension, currentMoveNotation, isSolved]);

  const cameraPos = useMemo<Vec3>(() => {
    const radius = 4.8;
    const cx = radius * Math.cos(elevation) * Math.sin(azimuth);
    const cy = radius * Math.sin(elevation);
    const cz = radius * Math.cos(elevation) * Math.cos(azimuth);
    return [cx, cy, cz];
  }, [azimuth, elevation]);

  const { handleBestView } = useBestView(
    dimension === 4 ? '4x4' : dimension === 2 ? '2x2' : '3x3',
    currentMoveNotation,
    { azimuth, elevation },
    useCallback((pose: { azimuth: number; elevation: number }) => {
      setAzimuth(pose.azimuth);
      setElevation(pose.elevation);
    }, [])
  );

  const lastPanPos = useRef({ x: 0, y: 0 });
  const startPanPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: (_, gesture) => {
        lastPanPos.current = { x: gesture.x0, y: gesture.y0 };
        startPanPos.current = { x: gesture.x0, y: gesture.y0 };
        isDragging.current = false;
      },
      onPanResponderMove: (_, gesture) => {
        const dist = Math.hypot(gesture.moveX - startPanPos.current.x, gesture.moveY - startPanPos.current.y);
        if (dist > 5) isDragging.current = true;

        const dx = gesture.moveX - lastPanPos.current.x;
        const dy = gesture.moveY - lastPanPos.current.y;
        lastPanPos.current = { x: gesture.moveX, y: gesture.moveY };

        setAzimuth((prev) => prev - dx * 0.008);
        setElevation((prev) => Math.max(-1.35, Math.min(1.35, prev + dy * 0.008)));
      },
    })
  ).current;

  const handleResetView = () => {
    setAzimuth(0.6);
    setElevation(0.5);
  };

  const cycleAutoView = () => {
    const nextMode: AutoViewOption =
      autoViewMode === 'minimal' ? 'always' : autoViewMode === 'always' ? 'off' : 'minimal';
    onAutoViewModeChange?.(nextMode);
  };

  const handleUpdateLabels = useCallback((labels: FloatingLabelInfo[]) => {
    setFloatingLabels(labels);
  }, []);

  const handleStickerTap = useCallback(
    (face: FaceName3x3, index: number) => {
      // Finger or mouse movement under 6px between press and release (Requirement 5)
      if (isDragging.current) return;
      onStickerClick?.(face, index);
    },
    [onStickerClick]
  );

  const isDebug = typeof window !== 'undefined' && window.location?.search?.includes('debug=1');
  const isEdgeOn = devInfo ? Math.abs(devInfo.dot) < 0.2 : false;
  const showEdgeOnHint = isEdgeOn && autoViewMode === 'off' && unified && !isSolved;

  return (
    <View style={[styles.container, style]}>
      {/* 3D Canvas */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <CanvasErrorBoundary onResetCamera={handleResetView}>
          <ThreeCanvas style={styles.canvas}>
            <PuzzleCube3D
              cubeState={cubeState}
              dimension={dimension}
              activeFace={activeFace}
              currentMoveNotation={currentMoveNotation}
              isAnimating={isAnimating}
              isGhostPreview={isGhostPreview}
              turnDurationMs={turnDurationMs}
              autoViewMode={autoViewMode}
              highlightStrength={highlightStrength}
              highlightStyle={highlightStyle}
              showColorBlindLetters={showColorBlindLetters}
              isSolved={isSolved}
              interactivePainting={interactivePainting}
              activeStickerCursor={activeStickerCursor}
              cameraAzimuth={azimuth}
              cameraElevation={elevation}
              onAnimationComplete={onAnimationComplete}
              onCameraMoveComplete={onCameraMoveComplete}
              onUpdateLabels={handleUpdateLabels}
              onMovingChipChange={setMovingChip}
              onStickerTap={handleStickerTap}
              onDevInfoChange={setDevInfo}
            />
          </ThreeCanvas>
        </CanvasErrorBoundary>
      </View>

      {/* Dev Overlay in development mode when ?debug=1 */}
      {isDebug && devInfo && autoViewMode !== 'off' && (
        <View style={styles.devOverlay} pointerEvents="none">
          <Text style={styles.devText}>AutoView: {autoViewMode}</Text>
          <Text style={styles.devText}>
            Target: [{devInfo.targetDir[0].toFixed(2)}, {devInfo.targetDir[1].toFixed(2)}, {devInfo.targetDir[2].toFixed(2)}]
          </Text>
          <Text style={styles.devText}>Dot: {devInfo.dot.toFixed(2)}</Text>
        </View>
      )}

      {/* Edge-on Hint Card below stage top bar */}
      {showEdgeOnHint && (
        <View style={styles.edgeOnHintContainer} pointerEvents="none">
          <Text style={styles.edgeOnHintText}>Turn the cube to see this layer clearly</Text>
        </View>
      )}

      {/* Floating Face Labels Overlay */}
      <View style={styles.labelsOverlay} pointerEvents="none">
        {floatingLabels.map((lbl) => {
          if (!lbl.visible) return null;
          return (
            <View
              key={lbl.face}
              style={[
                styles.floatingBadge,
                {
                  left: lbl.screenX - 32,
                  top: lbl.screenY - 14,
                  borderColor: lbl.isHighlighted ? '#22d3ee' : 'rgba(255,255,255,0.18)',
                  backgroundColor: lbl.isHighlighted ? 'rgba(34,211,238,0.22)' : 'rgba(15,23,42,0.75)',
                  transform: [{ scale: lbl.isHighlighted ? 1.08 : 0.95 }],
                },
              ]}
            >
              <View style={[styles.colorDot, { backgroundColor: lbl.dotColor }]} />
              <Text
                style={[
                  styles.labelText,
                  {
                    color: lbl.isHighlighted ? '#22d3ee' : '#F8FAFC',
                    fontWeight: lbl.isHighlighted ? '800' : '600',
                  },
                ]}
              >
                {lbl.name}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Top Helper Badge: "White on top · Green facing you" */}
      <View style={styles.topBadgeContainer} pointerEvents="none">
        <View style={styles.orientationBadge}>
          <Compass size={14} color="#22d3ee" style={{ marginRight: 6 }} />
          <Text style={styles.orientationText}>
            White on top <Text style={{ color: '#22d3ee' }}>·</Text> Green facing you
          </Text>
        </View>
      </View>

      {/* Moving Layer Pulsing Chip Overlay */}
      {movingChip && movingChip.visible && (
        <View
          style={[
            styles.movingChipBadge,
            {
              left: Math.max(12, movingChip.screenX - 55),
              top: Math.max(12, movingChip.screenY - 16),
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.movingChipDot} />
          <Text style={styles.movingChipText}>{movingChip.text}</Text>
        </View>
      )}

      {/* Screen-facing 56px Circular Turn Direction Icon */}
      {unified && !isSolved && (
        <View style={styles.directionIconContainer}>
          <TurnDirectionIcon
            axis={unified.axis}
            angleRad={unified.angleRad}
            cameraPos={cameraPos}
            onBestViewTap={handleBestView}
            showHint={false}
          />
        </View>
      )}

      {/* Bottom Corner Controls: Reset View & Auto View */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.viewButton,
            autoViewMode !== 'off' && { borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.15)' },
          ]}
          onPress={cycleAutoView}
          activeOpacity={0.7}
        >
          <Eye size={16} color={autoViewMode !== 'off' ? '#22d3ee' : '#94A3B8'} />
          <Text
            style={[
              styles.viewButtonText,
              { color: autoViewMode !== 'off' ? '#22d3ee' : '#94A3B8' },
            ]}
          >
            Auto view: {autoViewMode === 'minimal' ? 'Minimal' : autoViewMode === 'always' ? 'Always' : 'Off'}
          </Text>
        </TouchableOpacity>

        {unified && (
          <TouchableOpacity
            style={styles.viewButton}
            onPress={handleBestView}
            accessibilityRole="button"
            accessibilityLabel="Best view"
            activeOpacity={0.7}
          >
            <Compass size={16} color="#22d3ee" />
            <Text style={styles.viewButtonText}>Best view</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.viewButton}
          onPress={handleResetView}
          activeOpacity={0.7}
        >
          <RotateCcw size={16} color="#94A3B8" />
          <Text style={styles.viewButtonText}>Reset view</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0b1120',
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
  labelsOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  labelText: {
    fontSize: 12,
  },
  topBadgeContainer: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  orientationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  orientationText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  controlsRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  viewButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  devOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF860',
  },
  devText: {
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  movingChipBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#22d3ee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    gap: 6,
  },
  movingChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22d3ee',
  },
  movingChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  directionIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 20,
  },
  edgeOnHintContainer: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    maxWidth: '70%',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 25,
  },
  edgeOnHintText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { RotateCcw, Eye, Compass } from 'lucide-react-native';
import { ThreeCanvas } from './ThreeCanvas';
import { Pyraminx3D, OffendingStickerProp } from './Pyraminx3D';
import { PyraminxState, FaceNamePyraminx } from '../../solvers/pyraminx/pyraminxFacelets';
import { AutoViewOption, useSettingsStore } from '../../store/settingsStore';
import { TurnDirectionIcon } from './TurnDirectionIcon';
import { getPuzzleTurnInfo, getBestViewCamera } from './puzzleTurnInfo';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { useBestView } from '../../hooks/useBestView';
import { Vec3 } from '../../solvers/pyraminx/pyraminxGeometry';

interface Pyraminx3DViewProps {
  state: PyraminxState;
  activeFace?: FaceNamePyraminx | null;
  currentMoveNotation?: string | null;
  isAnimating?: boolean;
  isGhostPreview?: boolean;
  turnDurationMs?: number;
  autoViewMode?: AutoViewOption;
  isSolved?: boolean;
  interactivePainting?: boolean;
  guidedMode?: boolean;
  offendingStickers?: OffendingStickerProp[];
  onAnimationComplete?: () => void;
  onCameraMoveComplete?: () => void;
  onAutoViewModeChange?: (mode: AutoViewOption) => void;
  onStickerClick?: (face: FaceNamePyraminx, stickerIndex: number) => void;
  style?: any;
}

// Preset camera viewing angles for guided mode
const GUIDED_FACE_ANGLES: Record<FaceNamePyraminx, { az: number; el: number }> = {
  F: { az: 0.0, el: 0.22 },                // Front face (Green)
  R: { az: (2 * Math.PI) / 3, el: 0.22 },   // Right face (Red) ~ 2.094 rad
  L: { az: (-2 * Math.PI) / 3, el: 0.22 },  // Left face (Blue) ~ -2.094 rad
  D: { az: 0.0, el: -1.25 },               // Bottom face (Yellow)
};

export const Pyraminx3DView: React.FC<Pyraminx3DViewProps> = ({
  state,
  activeFace,
  currentMoveNotation,
  isAnimating = false,
  isGhostPreview = false,
  turnDurationMs = 1400,
  autoViewMode = 'minimal',
  isSolved = false,
  interactivePainting = false,
  guidedMode = false,
  offendingStickers = [],
  onAnimationComplete,
  onCameraMoveComplete,
  onAutoViewModeChange,
  onStickerClick,
  style,
}) => {
  const highlightStyle = useSettingsStore((s) => s.highlightStyle);
  const [azimuth, setAzimuth] = useState(0.4);
  const [elevation, setElevation] = useState(0.3);
  const [movingChip, setMovingChip] = useState<{ text: string; screenX: number; screenY: number; visible: boolean } | null>(null);
  const [devInfo, setDevInfo] = useState<{ targetDir: [number, number, number]; dot: number } | null>(null);

  const unified = useMemo(() => {
    if (!currentMoveNotation || isSolved) return null;
    try {
      return getPuzzleTurnInfo('pyraminx', currentMoveNotation);
    } catch (e) {
      return null;
    }
  }, [currentMoveNotation, isSolved]);

  const cameraPos = useMemo<Vec3>(() => {
    const dist = 5.25;
    const cx = dist * Math.cos(elevation) * Math.sin(azimuth);
    const cy = dist * Math.sin(elevation);
    const cz = dist * Math.cos(elevation) * Math.cos(azimuth);
    return [cx, cy, cz];
  }, [azimuth, elevation]);

  const { handleBestView } = useBestView(
    'pyraminx',
    currentMoveNotation,
    { azimuth, elevation, distance: 5.25 },
    useCallback((pose: { azimuth: number; elevation: number }) => {
      setAzimuth(pose.azimuth);
      setElevation(pose.elevation);
    }, [])
  );

  const lastPanPos = useRef({ x: 0, y: 0 });
  const startPanPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  // In guided mode, automatically ease camera to focus on active face
  useEffect(() => {
    if (guidedMode && activeFace && GUIDED_FACE_ANGLES[activeFace]) {
      const target = GUIDED_FACE_ANGLES[activeFace];
      setAzimuth(target.az);
      setElevation(target.el);
    }
  }, [guidedMode, activeFace]);

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
        const dist = Math.hypot(
          gesture.moveX - startPanPos.current.x,
          gesture.moveY - startPanPos.current.y
        );
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
    setAzimuth(0.4);
    setElevation(0.3);
  };

  const cycleAutoView = () => {
    const nextMode: AutoViewOption =
      autoViewMode === 'minimal' ? 'always' : autoViewMode === 'always' ? 'off' : 'minimal';
    onAutoViewModeChange?.(nextMode);
  };

  const handleStickerTap = useCallback(
    (face: FaceNamePyraminx, idx: number) => {
      // Large tap targets: only trigger if pan was < 6px (no accidental paint during orbit drag)
      if (isDragging.current) return;
      onStickerClick?.(face, idx);
    },
    [onStickerClick]
  );

  const isDebug = typeof window !== 'undefined' && window.location?.search?.includes('debug=1');
  const isEdgeOn = devInfo ? Math.abs(devInfo.dot) < 0.2 : false;
  const showEdgeOnHint = isEdgeOn && autoViewMode === 'off' && unified && !isSolved;

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      <CanvasErrorBoundary onResetCamera={handleResetView}>
        <ThreeCanvas style={styles.canvas}>
          <Pyraminx3D
            state={state}
            activeFace={activeFace}
            currentMoveNotation={currentMoveNotation}
            isAnimating={isAnimating}
            isGhostPreview={isGhostPreview}
            turnDurationMs={turnDurationMs}
            autoViewMode={autoViewMode}
            highlightStyle={highlightStyle}
            guidedMode={guidedMode}
            isSolved={isSolved}
            offendingStickers={offendingStickers}
            cameraAzimuth={azimuth}
            cameraElevation={elevation}
            onCameraChange={(az, el) => {
              setAzimuth(az);
              setElevation(el);
            }}
            onCameraMoveComplete={onCameraMoveComplete}
            onAnimationComplete={onAnimationComplete}
            onMovingChipChange={setMovingChip}
            onStickerTap={handleStickerTap}
            onDevInfoChange={setDevInfo}
          />
        </ThreeCanvas>
      </CanvasErrorBoundary>

      {/* Edge-on Hint Card below stage top bar */}
      {showEdgeOnHint && (
        <View style={styles.edgeOnHintContainer} pointerEvents="none">
          <Text style={styles.edgeOnHintText}>Turn the cube to see this layer clearly</Text>
        </View>
      )}

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

      {/* Floating View Controls */}
      <View style={styles.controlsOverlay} pointerEvents="box-none">
        {onAutoViewModeChange && (
          <TouchableOpacity
            style={styles.controlPill}
            onPress={cycleAutoView}
            accessibilityRole="button"
            accessibilityLabel={`Auto view mode: ${autoViewMode}`}
          >
            <Eye color="#38BDF8" size={14} />
            <Text style={styles.pillText}>
              Auto view: {autoViewMode === 'always' ? 'Always' : autoViewMode === 'minimal' ? 'Minimal' : 'Off'}
            </Text>
          </TouchableOpacity>
        )}

        {unified && (
          <TouchableOpacity
            style={styles.controlPill}
            onPress={handleBestView}
            accessibilityRole="button"
            accessibilityLabel="Best view"
          >
            <Compass color="#22d3ee" size={14} />
            <Text style={[styles.pillText, { color: '#22d3ee' }]}>Best view</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleResetView}
          accessibilityRole="button"
          accessibilityLabel="Reset camera view"
        >
          <RotateCcw color="#94A3B8" size={16} />
        </TouchableOpacity>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#070A11',
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38BDF840',
  },
  pillText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
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

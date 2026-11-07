import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Cube3x3State } from '../../solvers/cube3x3/cube3x3Facelets';
import {
  Axis,
  FaceName3x3,
  turnInfo,
  getMoveInstructionInfo,
  getFaceletIndexForCubie,
  HighlightStrength,
} from './cubieModel';
import { CubieMesh, StickerMeshInfo } from './CubieMesh';
import { DirectionArrow3D } from './DirectionArrow3D';
import { AutoViewOption } from '../../store/settingsStore';

export interface FloatingLabelInfo {
  face: FaceName3x3;
  name: string;
  dotColor: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  isHighlighted: boolean;
}

interface CubeScene3DProps {
  cubeState: Cube3x3State;
  currentMoveNotation?: string | null;
  isAnimating: boolean;
  turnDurationMs: number;
  autoViewMode: AutoViewOption;
  highlightStrength: HighlightStrength;
  showColorBlindLetters: boolean;
  isSolved: boolean;
  cameraAzimuth: number;
  cameraElevation: number;
  onCameraChange?: (azimuth: number, elevation: number) => void;
  onAnimationComplete?: () => void;
  onCameraMoveComplete?: () => void;
  onUpdateLabels?: (labels: FloatingLabelInfo[]) => void;
  onStickerClick?: (face: FaceName3x3, stickerIndex: number) => void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const MAX_AZIMUTH_DELTA = (70 * Math.PI) / 180; // 70 degrees max per step (Requirement 3)

export const CubeScene3D: React.FC<CubeScene3DProps> = ({
  cubeState,
  currentMoveNotation,
  isAnimating,
  turnDurationMs,
  autoViewMode,
  highlightStrength,
  showColorBlindLetters,
  isSolved,
  cameraAzimuth,
  cameraElevation,
  onCameraChange,
  onAnimationComplete,
  onCameraMoveComplete,
  onUpdateLabels,
  onStickerClick,
}) => {
  const { camera, size } = useThree();
  const pivotRef = useRef<THREE.Group>(null);
  const animStartTime = useRef<number | null>(null);

  // Parse active move using single source of truth: turnInfo (Requirement 1)
  const activeTurnInfo = useMemo(() => {
    if (!currentMoveNotation || isSolved) return null;
    return turnInfo(currentMoveNotation);
  }, [currentMoveNotation, isSolved]);

  const activeAxis = activeTurnInfo?.axis || 'y';
  const activeLayer = activeTurnInfo?.layer ?? 1;
  const targetAngle = activeTurnInfo?.angle || 0;
  const activeFace = currentMoveNotation ? (currentMoveNotation[0].toUpperCase() as FaceName3x3) : null;

  // Push-out amount for active layer (Requirement 4)
  const pushAmount = useMemo(() => {
    switch (highlightStrength) {
      case 'strong':
        return 0.04;
      case 'medium':
        return 0.03;
      case 'subtle':
      default:
        return 0.02;
    }
  }, [highlightStrength]);

  const pushOffset = useMemo<[number, number, number]>(() => {
    if (!activeTurnInfo || isSolved) return [0, 0, 0];
    const offset = pushAmount * activeLayer;
    return [
      activeAxis === 'x' ? offset : 0,
      activeAxis === 'y' ? offset : 0,
      activeAxis === 'z' ? offset : 0,
    ];
  }, [activeTurnInfo, isSolved, pushAmount, activeAxis, activeLayer]);

  // Construct all 27 cubies from current cubeState
  const allCubies = useMemo(() => {
    const list: Array<{
      id: string;
      x: number;
      y: number;
      z: number;
      stickers: StickerMeshInfo[];
      isLayerActive: boolean;
    }> = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const stickers: StickerMeshInfo[] = [];

          if (y === 1) {
            const idx = getFaceletIndexForCubie('U', x, y, z);
            stickers.push({ face: 'U', color: cubeState.U[idx], normal: [0, 1, 0], indexOnFace: idx });
          }
          if (y === -1) {
            const idx = getFaceletIndexForCubie('D', x, y, z);
            stickers.push({ face: 'D', color: cubeState.D[idx], normal: [0, -1, 0], indexOnFace: idx });
          }
          if (z === 1) {
            const idx = getFaceletIndexForCubie('F', x, y, z);
            stickers.push({ face: 'F', color: cubeState.F[idx], normal: [0, 0, 1], indexOnFace: idx });
          }
          if (z === -1) {
            const idx = getFaceletIndexForCubie('B', x, y, z);
            stickers.push({ face: 'B', color: cubeState.B[idx], normal: [0, 0, -1], indexOnFace: idx });
          }
          if (x === 1) {
            const idx = getFaceletIndexForCubie('R', x, y, z);
            stickers.push({ face: 'R', color: cubeState.R[idx], normal: [1, 0, 0], indexOnFace: idx });
          }
          if (x === -1) {
            const idx = getFaceletIndexForCubie('L', x, y, z);
            stickers.push({ face: 'L', color: cubeState.L[idx], normal: [-1, 0, 0], indexOnFace: idx });
          }

          let isLayer = false;
          if (activeTurnInfo && !isSolved) {
            if (activeAxis === 'x' && x === activeLayer) isLayer = true;
            if (activeAxis === 'y' && y === activeLayer) isLayer = true;
            if (activeAxis === 'z' && z === activeLayer) isLayer = true;
          }

          list.push({
            id: `c_${x}_${y}_${z}`,
            x,
            y,
            z,
            stickers,
            isLayerActive: isLayer,
          });
        }
      }
    }

    return list;
  }, [cubeState, activeTurnInfo, isSolved, activeAxis, activeLayer]);

  // Separate stationary vs turning cubies
  const stationaryCubies = useMemo(
    () => allCubies.filter((c) => !isAnimating || !c.isLayerActive),
    [allCubies, isAnimating]
  );
  const turningCubies = useMemo(
    () => (isAnimating ? allCubies.filter((c) => c.isLayerActive) : []),
    [allCubies, isAnimating]
  );

  // Animation trigger
  useEffect(() => {
    if (isAnimating) {
      animStartTime.current = Date.now();
      if (turnDurationMs === 0) {
        onAnimationComplete?.();
      }
    } else {
      animStartTime.current = null;
      if (pivotRef.current) {
        pivotRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [isAnimating, turnDurationMs, onAnimationComplete]);

  // Camera state refs for smooth timed easing (Requirement 3)
  const currentCam = useRef({ az: cameraAzimuth, el: cameraElevation });
  const cameraTransition = useRef<{
    startTime: number;
    duration: number;
    startAz: number;
    startEl: number;
    targetAz: number;
    targetEl: number;
    active: boolean;
  }>({
    startTime: 0,
    duration: 1200,
    startAz: cameraAzimuth,
    startEl: cameraElevation,
    targetAz: cameraAzimuth,
    targetEl: cameraElevation,
    active: false,
  });

  // Check if target face needs camera adjustment
  useEffect(() => {
    if (autoViewMode === 'off' || !activeFace || isSolved) return;

    // Normal vector of target face
    const normalMap: Record<FaceName3x3, [number, number, number]> = {
      U: [0, 1, 0],
      D: [0, -1, 0],
      F: [0, 0, 1],
      B: [0, 0, -1],
      R: [1, 0, 0],
      L: [-1, 0, 0],
    };
    const norm = normalMap[activeFace];

    // Current camera position
    const radius = 6.4;
    const curAz = currentCam.current.az;
    const curEl = currentCam.current.el;
    const cx = radius * Math.cos(curEl) * Math.sin(curAz);
    const cy = radius * Math.sin(curEl);
    const cz = radius * Math.cos(curEl) * Math.cos(curAz);
    const camUnit = new THREE.Vector3(cx, cy, cz).normalize();

    // Check visibility dot product: face normal dot camera vector (Requirement 3)
    const dot = norm[0] * camUnit.x + norm[1] * camUnit.y + norm[2] * camUnit.z;

    if (autoViewMode === 'minimal' && dot >= 0.5) {
      // Already clearly visible! Do NOT move at all.
      onCameraMoveComplete?.();
      return;
    }

    // Determine target azimuth & elevation
    let targetAz = 0.6;
    let targetEl = 0.5;

    switch (activeFace) {
      case 'R':
        targetAz = 1.35;
        targetEl = 0.38;
        break;
      case 'L':
        targetAz = -1.35;
        targetEl = 0.38;
        break;
      case 'U':
        targetAz = 0.6;
        targetEl = 1.05;
        break;
      case 'D':
        targetAz = 0.6;
        targetEl = -1.05;
        break;
      case 'F':
        targetAz = 0.2;
        targetEl = 0.38;
        break;
      case 'B':
        targetAz = 3.14;
        targetEl = 0.38;
        break;
    }

    // Shortest angular path
    let dAz = ((targetAz - curAz + Math.PI) % (2 * Math.PI)) - Math.PI;

    // Requirement 3: Limit change to at most 70° (1.22 rad) of azimuth.
    // When next move turns opposite side, prefer elevating camera to look from above
    if (Math.abs(dAz) > MAX_AZIMUTH_DELTA) {
      targetEl = 1.15; // elevate view from above!
      dAz = Math.sign(dAz) * MAX_AZIMUTH_DELTA;
      targetAz = curAz + dAz;
    }

    const duration = turnDurationMs >= 2800 ? 2000 : 1200;

    cameraTransition.current = {
      startTime: Date.now(),
      duration,
      startAz: curAz,
      startEl: curEl,
      targetAz,
      targetEl,
      active: true,
    };
  }, [activeFace, autoViewMode, isSolved, turnDurationMs, onCameraMoveComplete]);

  // Frame loop
  useFrame(() => {
    // 1. Timed eased camera move (Requirement 3)
    if (cameraTransition.current.active) {
      const { startTime, duration, startAz, startEl, targetAz, targetEl } = cameraTransition.current;
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = easeInOutCubic(t);

      currentCam.current.az = startAz + (targetAz - startAz) * ease;
      currentCam.current.el = startEl + (targetEl - startEl) * ease;

      if (t >= 1) {
        cameraTransition.current.active = false;
        onCameraChange?.(currentCam.current.az, currentCam.current.el);
        onCameraMoveComplete?.();
      }
    }

    const radius = 6.4;
    const cx = radius * Math.cos(currentCam.current.el) * Math.sin(currentCam.current.az);
    const cy = radius * Math.sin(currentCam.current.el);
    const cz = radius * Math.cos(currentCam.current.el) * Math.cos(currentCam.current.az);
    camera.position.set(cx, cy, cz);
    camera.lookAt(0, 0, 0);

    // 2. Pivot Layer Turn Animation (Requirement 1 & 2)
    if (isAnimating && animStartTime.current && pivotRef.current && turnDurationMs > 0) {
      const elapsed = Date.now() - animStartTime.current;
      const progress = Math.min(1, elapsed / turnDurationMs);
      const ease = easeInOutCubic(progress);

      pivotRef.current.rotation.set(0, 0, 0);
      if (activeAxis === 'x') {
        pivotRef.current.rotation.x = ease * targetAngle;
      } else if (activeAxis === 'y') {
        pivotRef.current.rotation.y = ease * targetAngle;
      } else {
        pivotRef.current.rotation.z = ease * targetAngle;
      }

      if (progress >= 1) {
        animStartTime.current = null;
        onAnimationComplete?.();
      }
    }

    // 3. Floating face labels projected to 2D
    if (onUpdateLabels) {
      const faceConfigs: Array<{
        face: FaceName3x3;
        name: string;
        pos: [number, number, number];
        normal: [number, number, number];
        dotColor: string;
      }> = [
        { face: 'U', name: 'Top', pos: [0, 1.62, 0], normal: [0, 1, 0], dotColor: '#FFFFFF' },
        { face: 'F', name: 'Front', pos: [0, 0, 1.62], normal: [0, 0, 1], dotColor: '#009B48' },
        { face: 'R', name: 'Right', pos: [1.62, 0, 0], normal: [1, 0, 0], dotColor: '#B71234' },
        { face: 'L', name: 'Left', pos: [-1.62, 0, 0], normal: [-1, 0, 0], dotColor: '#FF5800' },
        { face: 'B', name: 'Back', pos: [0, 0, -1.62], normal: [0, 0, -1], dotColor: '#0046AD' },
        { face: 'D', name: 'Bottom', pos: [0, -1.62, 0], normal: [0, -1, 0], dotColor: '#FFD500' },
      ];

      const projectedLabels: FloatingLabelInfo[] = faceConfigs.map((fc) => {
        const centerV = new THREE.Vector3(...fc.pos);
        const normV = new THREE.Vector3(...fc.normal);
        const camDir = new THREE.Vector3().subVectors(camera.position, centerV).normalize();
        const dot = normV.dot(camDir);

        const isFacing = dot > 0.18;
        const proj = centerV.clone().project(camera);
        const screenX = (proj.x * 0.5 + 0.5) * size.width;
        const screenY = (-proj.y * 0.5 + 0.5) * size.height;

        return {
          face: fc.face,
          name: fc.name,
          dotColor: fc.dotColor,
          screenX,
          screenY,
          visible: isFacing,
          isHighlighted: activeFace === fc.face && !isSolved,
        };
      });

      onUpdateLabels(projectedLabels);
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.3} castShadow />
      <directionalLight position={[-5, -4, -5]} intensity={0.5} />

      <group>
        {/* Stationary Cubies */}
        {stationaryCubies.map((c) => (
          <CubieMesh
            key={c.id}
            x={c.x}
            y={c.y}
            z={c.z}
            stickers={c.stickers}
            isLayerActive={c.isLayerActive}
            isSolved={isSolved}
            highlightStrength={highlightStrength}
            showColorBlindLetters={showColorBlindLetters}
            pushOffset={pushOffset}
            onStickerClick={onStickerClick}
          />
        ))}

        {/* Temporary Pivot Group for Layer Turn Animation */}
        <group ref={pivotRef}>
          {turningCubies.map((c) => (
            <CubieMesh
              key={c.id}
              x={c.x}
              y={c.y}
              z={c.z}
              stickers={c.stickers}
              isLayerActive={c.isLayerActive}
              isSolved={isSolved}
              highlightStrength={highlightStrength}
              showColorBlindLetters={showColorBlindLetters}
              pushOffset={pushOffset}
              onStickerClick={onStickerClick}
            />
          ))}
        </group>

        {/* Unified Direction Arrow: visible when not turning */}
        {currentMoveNotation && !isSolved && (
          <DirectionArrow3D
            move={currentMoveNotation}
            visible={!isAnimating}
          />
        )}
      </group>
    </>
  );
};

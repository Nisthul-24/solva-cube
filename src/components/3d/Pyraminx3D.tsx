import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PyraminxState, FaceNamePyraminx, PyraminxColor } from '../../solvers/pyraminx/pyraminxFacelets';
import {
  PYRAMINX_VERTICES,
  Vec3,
  dot,
  norm,
  scale,
  normalize,
  computePyraminxArrowArc,
} from '../../solvers/pyraminx/pyraminxGeometry';
import {
  PYRAMINX_PIECES_14,
  PyraminxPieceDef,
} from '../../solvers/pyraminx/pyraminxPieces';
import { getPuzzleEngine } from '../../puzzleEngine/puzzleEngine';
import { PALETTE, scaleBrightness } from './stickerLayout';
import { AutoViewOption, HighlightStyleOption } from '../../store/settingsStore';
import { TurnArrowRibbon3D } from './TurnArrowRibbon3D';
import { CameraRig } from './CameraRig';
import { getPuzzleTurnInfo } from './puzzleTurnInfo';

export interface OffendingStickerProp {
  face: FaceNamePyraminx;
  index: number;
}

export interface Pyraminx3DProps {
  state: PyraminxState;
  activeFace?: FaceNamePyraminx | null;
  currentMoveNotation?: string | null;
  isAnimating?: boolean;
  isGhostPreview?: boolean;
  turnDurationMs?: number;
  autoViewMode?: AutoViewOption;
  highlightStyle?: HighlightStyleOption;
  guidedMode?: boolean;
  isSolved?: boolean;
  staticProgress?: number;
  offendingStickers?: OffendingStickerProp[];
  cameraAzimuth: number;
  cameraElevation: number;
  onCameraChange?: (azimuth: number, elevation: number) => void;
  onCameraMoveComplete?: () => void;
  onAnimationComplete?: () => void;
  onMovingChipChange?: (chip: { text: string; screenX: number; screenY: number; visible: boolean } | null) => void;
  onStickerTap?: (face: FaceNamePyraminx, index: number) => void;
  onDevInfoChange?: (info: { targetDir: [number, number, number]; dot: number } | null) => void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const PYRAMINX_PALETTE: Record<PyraminxColor, string> = {
  green: PALETTE.green,
  red: PALETTE.red,
  blue: PALETTE.blue,
  yellow: PALETTE.yellow,
};

const UNPAINTED_COLOR = '#8a93a3';
const MAX_AZIMUTH_DELTA = (70 * Math.PI) / 180;

export const Pyraminx3D: React.FC<Pyraminx3DProps> = ({
  state,
  activeFace,
  currentMoveNotation,
  isAnimating = false,
  isGhostPreview = false,
  turnDurationMs = 1400,
  autoViewMode = 'minimal',
  highlightStyle = 'glass_belt',
  guidedMode = false,
  isSolved = false,
  staticProgress,
  offendingStickers = [],
  cameraAzimuth,
  cameraElevation,
  onCameraChange,
  onCameraMoveComplete,
  onAnimationComplete,
  onMovingChipChange,
  onStickerTap,
  onDevInfoChange,
}) => {
  const { camera, gl, size } = useThree();
  const pivotRef = useRef<THREE.Group>(null);
  const animStartTime = useRef<number | null>(null);

  // Setup renderer colour space and tone mapping
  useEffect(() => {
    gl.toneMapping = THREE.NoToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);

  // Convert piece definitions to Three.js BufferGeometries
  const pieceGeometries = useMemo(() => {
    return PYRAMINX_PIECES_14.map((p) => {
      const bodyGeom = new THREE.BufferGeometry();
      bodyGeom.setAttribute('position', new THREE.BufferAttribute(p.bodyPositions, 3));
      bodyGeom.computeVertexNormals();

      const childStickers = p.stickers.map((st) => {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(st.positions, 3));
        geom.computeVertexNormals();

        return {
          id: st.id,
          face: st.face,
          index: st.index,
          type: st.type,
          centroid: st.centroid,
          normal: st.normal,
          geometry: geom,
        };
      });

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        centroid: p.centroid,
        bodyGeometry: bodyGeom,
        stickers: childStickers,
      };
    });
  }, []);

  // Set of piece IDs turning in current move (single source of truth from puzzleEngine)
  const { turningPieceIds, turnAxis, turnAngleRad } = useMemo(() => {
    if (!currentMoveNotation) {
      return { turningPieceIds: new Set<string>(), turnAxis: [0, 1, 0] as Vec3, turnAngleRad: 0 };
    }
    const eng = getPuzzleEngine('pyraminx');
    const m = eng.getMove(currentMoveNotation);
    if (!m) {
      return { turningPieceIds: new Set<string>(), turnAxis: [0, 1, 0] as Vec3, turnAngleRad: 0 };
    }
    return {
      turningPieceIds: m.turningPieceSet,
      turnAxis: m.axis,
      turnAngleRad: m.angle,
    };
  }, [currentMoveNotation]);

  const MODEL_SIZE_PYRAMINX = 2.8284;
  const CAP_LIFT_AMOUNT = 0.0; // Section 2: No lift/gap - turning pieces rotate in place, allow no lift at all

  // Inverted hull material for outline pass (Requirement 3b)
  const invertedHullMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        uniform float offset;
        void main() {
          vec3 transformed = position + normal * offset;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        void main() {
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        offset: { value: 0.02 * MODEL_SIZE_PYRAMINX },
        color: { value: new THREE.Color('#22d3ee') },
      },
      side: THREE.BackSide,
      depthTest: true,
      depthWrite: true,
    });
  }, []);

  // Separate pieces into stationary vs rotating for layer animation / waiting lift
  const { stationaryPieces, rotatingPieces } = useMemo(() => {
    const stat: typeof pieceGeometries = [];
    const rot: typeof pieceGeometries = [];

    const hasActiveMove = Boolean(currentMoveNotation && !isSolved);

    for (const piece of pieceGeometries) {
      if ((isAnimating || isGhostPreview || hasActiveMove) && turningPieceIds.has(piece.id)) {
        rot.push(piece);
      } else {
        stat.push(piece);
      }
    }
    return { stationaryPieces: stat, rotatingPieces: rot };
  }, [pieceGeometries, isAnimating, isGhostPreview, currentMoveNotation, isSolved, turningPieceIds]);

  // Check if a sticker is in offendingStickers
  const isOffendingSticker = useCallback(
    (face: FaceNamePyraminx, index: number): boolean => {
      if (!offendingStickers || offendingStickers.length === 0) return false;
      return offendingStickers.some((s) => s.face === face && s.index === index);
    },
    [offendingStickers]
  );

  const pulseFactor = useRef(0);

  // Render loop
  useFrame((_, delta) => {
    // 1. Pulse factor for offending stickers
    pulseFactor.current = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);

    const axisNorm = new THREE.Vector3(...turnAxis).normalize();

    // 2. Layer turn animation in useFrame (single animation at a time)
    if (isAnimating && currentMoveNotation && pivotRef.current && turnDurationMs > 0) {
      if (animStartTime.current === null) {
        animStartTime.current = performance.now();
      }
      const elapsed = performance.now() - animStartTime.current;
      const progress = Math.min(1, elapsed / turnDurationMs);
      const eased = easeInOutCubic(progress);

      // Part C item 3: No gap during turn (lift = 0, pieces rotate about vertex axis through tip)
      pivotRef.current.position.set(0, 0, 0);
      pivotRef.current.setRotationFromAxisAngle(axisNorm, turnAngleRad * eased);

      if (progress >= 1) {
        animStartTime.current = null;
        pivotRef.current.position.set(0, 0, 0);
        pivotRef.current.setRotationFromAxisAngle(axisNorm, 0);
        onAnimationComplete?.();
      }
    } else if (isGhostPreview && currentMoveNotation && pivotRef.current && turnAngleRad !== 0) {
      const period = 2000;
      const t = (Date.now() % period) / period;
      let angle = 0;
      if (t < 0.4) {
        angle = easeInOutCubic(t / 0.4) * turnAngleRad;
      } else if (t < 0.5) {
        angle = turnAngleRad;
      } else if (t < 0.9) {
        angle = (1 - easeInOutCubic((t - 0.5) / 0.4)) * turnAngleRad;
      } else {
        angle = 0;
      }
      pivotRef.current.position.set(0, 0, 0);
      pivotRef.current.setRotationFromAxisAngle(axisNorm, angle);
    } else if (staticProgress !== undefined && !isAnimating && !isGhostPreview && pivotRef.current && turnAngleRad !== 0) {
      pivotRef.current.position.set(0, 0, 0);
      pivotRef.current.setRotationFromAxisAngle(axisNorm, turnAngleRad * staticProgress);
    } else {
      animStartTime.current = null;
      if (pivotRef.current) {
        // Section 2: No lift/gap - turning pieces rotate about vertex axis in place with no lift at all
        pivotRef.current.position.set(0, 0, 0);
        pivotRef.current.rotation.set(0, 0, 0);
      }
    }

    // 4. Moving Layer Chip Projection (anchored at C)
    if (onMovingChipChange) {
      if (currentMoveNotation && !isSolved) {
        const eng = getPuzzleEngine('pyraminx');
        const m = eng.getMove(currentMoveNotation);
        const norm = m ? new THREE.Vector3(...m.axis).normalize() : new THREE.Vector3(0, 1, 0);
        const pos = m ? new THREE.Vector3(...m.layerCentroid) : new THREE.Vector3(0, 0, 0);
        const camDir = new THREE.Vector3().subVectors(camera.position, pos).normalize();
        const dotVal = norm.dot(camDir);
        const isFacing = dotVal > -0.2;
        const proj = pos.clone().project(camera);
        // @ts-ignore
        const width = size?.width || 360;
        // @ts-ignore
        const height = size?.height || 360;
        const screenX = (proj.x * 0.5 + 0.5) * width;
        const screenY = (-proj.y * 0.5 + 0.5) * height;
        onMovingChipChange({
          text: m ? m.layerName : '',
          screenX,
          screenY,
          visible: isFacing && !isAnimating,
        });
      } else {
        onMovingChipChange(null);
      }
    }
  });

  // Color resolver with brightness dimming and pulsing
  const getStickerColor = useCallback(
    (face: FaceNamePyraminx, index: number, isTurning: boolean): string => {
      const colorName = state[face]?.[index] as PyraminxColor;
      const baseHex = colorName ? PYRAMINX_PALETTE[colorName] : UNPAINTED_COLOR;

      // If cube is solved or no active move, full colour
      if (isSolved || !currentMoveNotation) {
        return baseHex;
      }

      // Brightness dimming: turning pieces get +12%, other pieces dim at most 12% (0.90)
      const brightnessFactor = isTurning ? 1.12 : 0.90;
      return scaleBrightness(baseHex, brightnessFactor);
    },
    [state, isSolved, currentMoveNotation]
  );

  // Debug overlay data under ?debug=1 (Part C item 2)
  const isDebug = typeof window !== 'undefined' && window.location?.search?.includes('debug=1');
  const debugOverlayData = useMemo(() => {
    if (!isDebug || !currentMoveNotation || isSolved) return null;
    const eng = getPuzzleEngine('pyraminx');
    const m = eng.getMove(currentMoveNotation);
    if (!m) return null;

    // 1. Axis line
    const axisVec = new THREE.Vector3(...m.axis).normalize();
    const axisPts = [
      axisVec.clone().multiplyScalar(-3.0),
      axisVec.clone().multiplyScalar(3.0),
    ];
    const axisLineGeom = new THREE.BufferGeometry().setFromPoints(axisPts);

    // 2. Wireframe bounding box of moving set
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of eng.pieces) {
      if (m.turningPieceSet.has(p.id)) {
        const [cx, cy, cz] = p.homeCentroid;
        if (cx - 0.5 < minX) minX = cx - 0.5;
        if (cx + 0.5 > maxX) maxX = cx + 0.5;
        if (cy - 0.5 < minY) minY = cy - 0.5;
        if (cy + 0.5 > maxY) maxY = cy + 0.5;
        if (cz - 0.5 < minZ) minZ = cz - 0.5;
        if (cz + 0.5 > maxZ) maxZ = cz + 0.5;
      }
    }
    const boxSize: [number, number, number] = [maxX - minX + 0.04, maxY - minY + 0.04, maxZ - minZ + 0.04];
    const boxCenter: [number, number, number] = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
    const boxGeom = new THREE.BoxGeometry(...boxSize);
    const boxWireframeGeom = new THREE.WireframeGeometry(boxGeom);

    // 3. Arrow center dot & line to layer centroid
    const arrowCenterVec = new THREE.Vector3(...m.arrowCenter);
    const layerCentroidVec = new THREE.Vector3(...m.layerCentroid);
    const centerLineGeom = new THREE.BufferGeometry().setFromPoints([arrowCenterVec, layerCentroidVec]);

    // 4. Arrow tangent
    const centroid = new THREE.Vector3(...m.layerCentroid);
    let nearestPt: THREE.Vector3 | null = null;
    let minDist = Infinity;
    for (const pt of m.arrow.arcPoints) {
      const v = new THREE.Vector3(...pt);
      const d = v.distanceTo(centroid);
      if (d < minDist) {
        minDist = d;
        nearestPt = v;
      }
    }
    const tangent = new THREE.Vector3(...m.arrow.endTangent).normalize();
    const tangentEnd = nearestPt ? nearestPt.clone().addScaledVector(tangent, 0.8) : new THREE.Vector3();
    const tangentLineGeom = nearestPt
      ? new THREE.BufferGeometry().setFromPoints([nearestPt, tangentEnd])
      : new THREE.BufferGeometry();

    return {
      axisLineGeom,
      boxWireframeGeom,
      boxCenter,
      arrowCenterVec,
      centerLineGeom,
      tangentLineGeom,
    };
  }, [isDebug, currentMoveNotation, isSolved]);

  return (
    <>
      {/* Unified CameraRig owning camera pose with smooth slerp gliding */}
      <CameraRig
        puzzleId="pyraminx"
        currentMoveNotation={currentMoveNotation}
        autoViewMode={autoViewMode}
        isSlowSpeed={turnDurationMs >= 2800}
        isAnimatingLayer={isAnimating}
        baseDistance={7.35}
        userAzimuth={cameraAzimuth}
        userElevation={cameraElevation}
        onCameraGlideComplete={onCameraMoveComplete}
      />

      {/* Neutral Clean Lighting */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <directionalLight position={[-5, -4, -5]} intensity={0.5} />

      {/* Main Pyramid Root */}
      <group>
        {/* Stationary Pieces */}
        {stationaryPieces.map((piece) => (
          <group key={piece.id}>
            {/* Dark Convex Body Geometry */}
            <mesh geometry={piece.bodyGeometry}>
              <meshStandardMaterial
                color="#0b0d12"
                roughness={0.35}
                metalness={0.1}
              />
            </mesh>

            {/* Child Stickers */}
            {piece.stickers.map((st) => {
              const offending = isOffendingSticker(st.face, st.index);
              return (
                <mesh
                  key={st.id}
                  geometry={st.geometry}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStickerTap?.(st.face, st.index);
                  }}
                >
                  <meshStandardMaterial
                    color={getStickerColor(st.face, st.index, false)}
                    roughness={0.25}
                    metalness={0.05}
                    side={THREE.DoubleSide}
                    emissive={offending ? '#ef4444' : '#000000'}
                    emissiveIntensity={offending ? 0.75 : 0}
                  />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* Rotating Pieces Pivot Group */}
        <group ref={pivotRef}>
          {rotatingPieces.map((piece) => (
            <group key={piece.id}>
              {/* Dark Convex Body Geometry */}
              <mesh geometry={piece.bodyGeometry}>
                <meshStandardMaterial
                  color="#0b0d12"
                  roughness={0.35}
                  metalness={0.1}
                />
              </mesh>

              {/* Requirement 3b: Inverted Hull Outline Pass using real piece geometry */}
              {!isAnimating && (
                <mesh
                  geometry={piece.bodyGeometry}
                  material={invertedHullMaterial}
                />
              )}

              {/* Child Stickers */}
              {piece.stickers.map((st) => {
                const offending = isOffendingSticker(st.face, st.index);
                return (
                  <mesh
                    key={st.id}
                    geometry={st.geometry}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStickerTap?.(st.face, st.index);
                    }}
                  >
                    <meshStandardMaterial
                      color={getStickerColor(st.face, st.index, true)}
                      roughness={0.35}
                      metalness={0.05}
                      side={THREE.DoubleSide}
                      emissive={offending ? '#ef4444' : '#000000'}
                      emissiveIntensity={offending ? 0.75 : 0}
                    />
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>

        {/* Unified Flat Ribbon Turn Arrow */}
        {currentMoveNotation && !isSolved && (
          <TurnArrowRibbon3D
            puzzleId="pyraminx"
            move={currentMoveNotation}
            visible={!isAnimating}
          />
        )}

        {/* ?debug=1 Overlays under puzzle root */}
        {isDebug && debugOverlayData && (
          <group renderOrder={999}>
            {/* 1. Axis Line (bright yellow) */}
            <primitive object={new THREE.Line(debugOverlayData.axisLineGeom, new THREE.LineBasicMaterial({ color: '#fbbf24', depthTest: false }))} />

            {/* 2. Wireframe Bounding Box of Moving Set (cyan/sky blue) */}
            <group position={debugOverlayData.boxCenter}>
              <primitive object={new THREE.LineSegments(debugOverlayData.boxWireframeGeom, new THREE.LineBasicMaterial({ color: '#38bdf8', depthTest: false }))} />
            </group>

            {/* 3. Dot at arrow's centre (orange/red dot) */}
            <mesh position={debugOverlayData.arrowCenterVec}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color="#f97316" depthTest={false} />
            </mesh>

            {/* 4. Line from arrow centre to layer centroid (green line) */}
            <primitive object={new THREE.Line(debugOverlayData.centerLineGeom, new THREE.LineBasicMaterial({ color: '#22c55e', depthTest: false }))} />

            {/* 5. Arrow Tangent Vector at nearest arc point (bright magenta) */}
            <primitive object={new THREE.Line(debugOverlayData.tangentLineGeom, new THREE.LineBasicMaterial({ color: '#ec4899', depthTest: false }))} />
          </group>
        )}
      </group>
    </>
  );
};

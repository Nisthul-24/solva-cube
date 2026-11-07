import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Cube3x3State } from '../../solvers/cube3x3/cube3x3Facelets';
import {
  Axis,
  FaceName3x3,
  turnInfo,
  PALETTE,
  scaleBrightness,
  getFaceletIndex,
  HighlightStrength,
} from './cubieModel';
import { DirectionArrow3D } from './DirectionArrow3D';
import { TurnArrowRibbon3D } from './TurnArrowRibbon3D';
import { LayerBelt3D } from './LayerBelt3D';
import { CameraRig } from './CameraRig';
import { getPuzzleTurnInfo } from './puzzleTurnInfo';
import { turnInfo4x4 } from '../../solvers/cube4x4/cube4x4Geometry';
import { AutoViewOption, HighlightStyleOption } from '../../store/settingsStore';
import { CubeColor } from '../../types/puzzle';

export interface FloatingLabelInfo {
  face: FaceName3x3;
  name: string;
  dotColor: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  isHighlighted: boolean;
}

interface PuzzleCube3DProps {
  cubeState: any;
  dimension?: 2 | 3 | 4;
  activeFace?: FaceName3x3 | null;
  currentMoveNotation?: string | null;
  isAnimating?: boolean;
  turnDurationMs?: number;
  autoViewMode?: AutoViewOption;
  highlightStrength?: HighlightStrength;
  highlightStyle?: HighlightStyleOption;
  showColorBlindLetters?: boolean;
  isSolved?: boolean;
  interactivePainting?: boolean;
  activeStickerCursor?: number | null;
  isGhostPreview?: boolean;
  cameraAzimuth: number;
  cameraElevation: number;
  onCameraChange?: (azimuth: number, elevation: number) => void;
  onAnimationComplete?: () => void;
  onCameraMoveComplete?: () => void;
  onUpdateLabels?: (labels: FloatingLabelInfo[]) => void;
  onMovingChipChange?: (chip: { text: string; screenX: number; screenY: number; visible: boolean } | null) => void;
  onStickerTap?: (face: FaceName3x3, index: number) => void;
  onDevInfoChange?: (info: { targetDir: [number, number, number]; dot: number } | null) => void;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createRoundedSquareShape(size: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const half = size / 2;
  const r = Math.min(radius, half);
  shape.moveTo(-half + r, -half);
  shape.lineTo(half - r, -half);
  shape.quadraticCurveTo(half, -half, half, -half + r);
  shape.lineTo(half, half - r);
  shape.quadraticCurveTo(half, half, half - r, half);
  shape.lineTo(-half + r, half);
  shape.quadraticCurveTo(-half, half, -half, half - r);
  shape.lineTo(-half, -half + r);
  shape.quadraticCurveTo(-half, -half, -half + r, -half);
  return shape;
}

function createContactShadowTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  } catch (e) {
    return null;
  }
}

// Letter texture cache for web
const letterTexCache: Record<string, THREE.CanvasTexture> = {};
function getLetterTexture(letter: string, textColor: string): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const key = `${letter}_${textColor}`;
  if (letterTexCache[key]) return letterTexCache[key];

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = textColor;
    ctx.font = '900 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 64, 66);

    const texture = new THREE.CanvasTexture(canvas);
    letterTexCache[key] = texture;
    return texture;
  } catch (e) {
    return null;
  }
}

const MAX_AZIMUTH_DELTA = (70 * Math.PI) / 180;

export const PuzzleCube3D: React.FC<PuzzleCube3DProps> = ({
  cubeState,
  dimension = 3,
  activeFace,
  currentMoveNotation,
  isAnimating = false,
  turnDurationMs = 1400,
  autoViewMode = 'minimal',
  highlightStrength = 'subtle',
  highlightStyle = 'glass_belt',
  showColorBlindLetters = false,
  isSolved = false,
  interactivePainting = false,
  activeStickerCursor,
  isGhostPreview = false,
  cameraAzimuth,
  cameraElevation,
  onCameraChange,
  onAnimationComplete,
  onCameraMoveComplete,
  onUpdateLabels,
  onMovingChipChange,
  onStickerTap,
  onDevInfoChange,
}) => {
  const { gl, scene, camera, size } = useThree();
  const pivotRef = useRef<THREE.Group>(null);
  const animStartTime = useRef<number | null>(null);

  // Setup renderer settings & subtle environment lighting (Requirement 2 & 3)
  useEffect(() => {
    gl.toneMapping = THREE.NoToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;

    try {
      const pmremGenerator = new THREE.PMREMGenerator(gl);
      pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      scene.environment = envMap;
      // @ts-ignore
      scene.environmentIntensity = 0.35;

      return () => {
        roomEnv.dispose();
        pmremGenerator.dispose();
      };
    } catch (e) {
      // Fallback silently if PMREM unavailable
    }
  }, [gl, scene]);

  // Shared Geometries (created once for high performance 60fps)
  const { cubieGeometry, cubieMaterial, stickerGeometry, contactShadowTexture } = useMemo(() => {
    const cubieGeom = new RoundedBoxGeometry(0.97, 0.97, 0.97, 4, 0.07);
    const cubieMat = new THREE.MeshStandardMaterial({
      color: '#0b0d12',
      roughness: 0.35,
      metalness: 0.05,
    });

    const shape = createRoundedSquareShape(0.86, 0.12);
    const stickerGeom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.005,
      bevelThickness: 0.005,
    });
    stickerGeom.center();

    const shadowTex = createContactShadowTexture();

    return {
      cubieGeometry: cubieGeom,
      cubieMaterial: cubieMat,
      stickerGeometry: stickerGeom,
      contactShadowTexture: shadowTex,
    };
  }, []);

  // Parse active move (Single source of truth via turnInfo)
  const activeTurnInfo = useMemo(() => {
    if (!currentMoveNotation || isSolved) return null;
    if (dimension === 4) {
      const t4 = turnInfo4x4(currentMoveNotation);
      return {
        axis: t4.axis,
        layers: t4.layers,
        angle: t4.angle,
        is4x4: true,
      };
    }
    return turnInfo(currentMoveNotation);
  }, [currentMoveNotation, isSolved, dimension]);

  const activeAxis = activeTurnInfo?.axis || 'y';
  const activeLayer = (activeTurnInfo as any)?.layer ?? 1;
  const activeLayers: number[] = (activeTurnInfo as any)?.layers ?? (activeLayer === 1 ? [1] : [-1]);
  const targetAngle = activeTurnInfo?.angle || 0;
  const currentFaceName = currentMoveNotation ? (currentMoveNotation[0].toUpperCase() as FaceName3x3) : activeFace;

  // Active layer detached lift (lift 0.03 outwards along axis in waiting state, 0 when turn starts)
  const pushAmount = (!isAnimating && !isGhostPreview) ? 0.03 : 0.0;

  const pushOffset = useMemo<[number, number, number]>(() => {
    if (!activeTurnInfo || isSolved || pushAmount === 0) return [0, 0, 0];
    const sign = dimension === 4
      ? (activeLayers.includes(3) || activeLayers.includes(2) ? 1 : -1)
      : activeLayer;
    const offset = pushAmount * sign;
    return [
      activeAxis === 'x' ? offset : 0,
      activeAxis === 'y' ? offset : 0,
      activeAxis === 'z' ? offset : 0,
    ];
  }, [activeTurnInfo, isSolved, pushAmount, activeAxis, activeLayer, activeLayers, dimension]);

  // Brightness factors (Section 3: turning pieces get +12%, other pieces dim at most 12% [90%])
  const activeBrightnessFactor = 1.12;
  const nonActiveBrightnessFactor = 0.90;

  // Construct all cubies with their stickers (generalized for 2x2 and 3x3)
  const allCubies = useMemo(() => {
    const list: Array<{
      id: string;
      x: number;
      y: number;
      z: number;
      isLayerActive: boolean;
      stickers: Array<{
        face: FaceName3x3;
        index: number;
        color: CubeColor;
        normal: [number, number, number];
        isCenter: boolean;
      }>;
    }> = [];

    if (dimension === 2) {
      const coords = [-0.5, 0.5];
      for (const x of coords) {
        for (const y of coords) {
          for (const z of coords) {
            const stickers: any[] = [];
            if (y === 0.5) {
              const row = z < 0 ? 0 : 1;
              const col = x < 0 ? 0 : 1;
              const idx = row * 2 + col;
              stickers.push({
                face: 'U',
                index: idx,
                color: cubeState?.U?.[idx] || 'white',
                normal: [0, 1, 0],
                isCenter: false,
              });
            }
            if (y === -0.5) {
              const row = z > 0 ? 0 : 1;
              const col = x < 0 ? 0 : 1;
              const idx = row * 2 + col;
              stickers.push({
                face: 'D',
                index: idx,
                color: cubeState?.D?.[idx] || 'yellow',
                normal: [0, -1, 0],
                isCenter: false,
              });
            }
            if (z === 0.5) {
              const row = y > 0 ? 0 : 1;
              const col = x < 0 ? 0 : 1;
              const idx = row * 2 + col;
              stickers.push({
                face: 'F',
                index: idx,
                color: cubeState?.F?.[idx] || 'green',
                normal: [0, 0, 1],
                isCenter: false,
              });
            }
            if (z === -0.5) {
              const row = y > 0 ? 0 : 1;
              const col = x > 0 ? 0 : 1;
              const idx = row * 2 + col;
              stickers.push({
                face: 'B',
                index: idx,
                color: cubeState?.B?.[idx] || 'blue',
                normal: [0, 0, -1],
                isCenter: false,
              });
            }
            if (x === 0.5) {
              const row = y > 0 ? 0 : 1;
              const col = z > 0 ? 0 : 1;
              const idx = row * 2 + col;
              stickers.push({
                face: 'R',
                index: idx,
                color: cubeState?.R?.[idx] || 'red',
                normal: [1, 0, 0],
                isCenter: false,
              });
            }
            if (x === -0.5) {
              const row = y > 0 ? 0 : 1;
              const col = z < 0 ? 0 : 1;
              const idx = row * 2 + col;
              stickers.push({
                face: 'L',
                index: idx,
                color: cubeState?.L?.[idx] || 'orange',
                normal: [-1, 0, 0],
                isCenter: false,
              });
            }

            let isLayer = false;
            if (activeTurnInfo && !isSolved) {
              if (activeAxis === 'x' && Math.sign(x) === activeLayer) isLayer = true;
              if (activeAxis === 'y' && Math.sign(y) === activeLayer) isLayer = true;
              if (activeAxis === 'z' && Math.sign(z) === activeLayer) isLayer = true;
            }

            list.push({
              id: `c_${x}_${y}_${z}`,
              x,
              y,
              z,
              isLayerActive: isLayer,
              stickers,
            });
          }
        }
      }
      return list;
    }

    if (dimension === 4) {
      const coords = [-1.5, -0.5, 0.5, 1.5];
      for (const x of coords) {
        for (const y of coords) {
          for (const z of coords) {
            // Hide the 8 inner cubies (build only 56 outer cubies)
            if (Math.abs(x) === 0.5 && Math.abs(y) === 0.5 && Math.abs(z) === 0.5) {
              continue;
            }

            const stickers: any[] = [];
            const lx = Math.round(x + 1.5);
            const ly = Math.round(y + 1.5);
            const lz = Math.round(z + 1.5);

            if (y === 1.5) {
              const idx = lz * 4 + lx;
              stickers.push({
                face: 'U',
                index: idx,
                color: cubeState?.U?.[idx] || 'white',
                normal: [0, 1, 0],
                isCenter: false,
              });
            }
            if (y === -1.5) {
              const idx = (3 - lz) * 4 + lx;
              stickers.push({
                face: 'D',
                index: idx,
                color: cubeState?.D?.[idx] || 'yellow',
                normal: [0, -1, 0],
                isCenter: false,
              });
            }
            if (z === 1.5) {
              const idx = (3 - ly) * 4 + lx;
              stickers.push({
                face: 'F',
                index: idx,
                color: cubeState?.F?.[idx] || 'green',
                normal: [0, 0, 1],
                isCenter: false,
              });
            }
            if (z === -1.5) {
              const idx = (3 - ly) * 4 + (3 - lx);
              stickers.push({
                face: 'B',
                index: idx,
                color: cubeState?.B?.[idx] || 'blue',
                normal: [0, 0, -1],
                isCenter: false,
              });
            }
            if (x === 1.5) {
              const idx = (3 - ly) * 4 + (3 - lz);
              stickers.push({
                face: 'R',
                index: idx,
                color: cubeState?.R?.[idx] || 'red',
                normal: [1, 0, 0],
                isCenter: false,
              });
            }
            if (x === -1.5) {
              const idx = (3 - ly) * 4 + lz;
              stickers.push({
                face: 'L',
                index: idx,
                color: cubeState?.L?.[idx] || 'orange',
                normal: [-1, 0, 0],
                isCenter: false,
              });
            }

            let isLayer = false;
            if (activeTurnInfo && !isSolved) {
              if (activeAxis === 'x' && activeLayers.includes(lx)) isLayer = true;
              if (activeAxis === 'y' && activeLayers.includes(ly)) isLayer = true;
              if (activeAxis === 'z' && activeLayers.includes(lz)) isLayer = true;
            }

            list.push({
              id: `c4_${x}_${y}_${z}`,
              x,
              y,
              z,
              isLayerActive: isLayer,
              stickers,
            });
          }
        }
      }
      return list;
    }

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const stickers: any[] = [];

          if (y === 1) {
            const idx = getFaceletIndex('U', x, y, z);
            stickers.push({ face: 'U', index: idx, color: cubeState.U[idx], normal: [0, 1, 0], isCenter: idx === 4 });
          }
          if (y === -1) {
            const idx = getFaceletIndex('D', x, y, z);
            stickers.push({ face: 'D', index: idx, color: cubeState.D[idx], normal: [0, -1, 0], isCenter: idx === 4 });
          }
          if (z === 1) {
            const idx = getFaceletIndex('F', x, y, z);
            stickers.push({ face: 'F', index: idx, color: cubeState.F[idx], normal: [0, 0, 1], isCenter: idx === 4 });
          }
          if (z === -1) {
            const idx = getFaceletIndex('B', x, y, z);
            stickers.push({ face: 'B', index: idx, color: cubeState.B[idx], normal: [0, 0, -1], isCenter: idx === 4 });
          }
          if (x === 1) {
            const idx = getFaceletIndex('R', x, y, z);
            stickers.push({ face: 'R', index: idx, color: cubeState.R[idx], normal: [1, 0, 0], isCenter: idx === 4 });
          }
          if (x === -1) {
            const idx = getFaceletIndex('L', x, y, z);
            stickers.push({ face: 'L', index: idx, color: cubeState.L[idx], normal: [-1, 0, 0], isCenter: idx === 4 });
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
            isLayerActive: isLayer,
            stickers,
          });
        }
      }
    }
    return list;
  }, [cubeState, dimension, activeTurnInfo, isSolved, activeAxis, activeLayer, activeLayers]);

  const stationaryCubies = useMemo(
    () => allCubies.filter((c) => (!isAnimating && !isGhostPreview) || !c.isLayerActive),
    [allCubies, isAnimating, isGhostPreview]
  );
  const turningCubies = useMemo(
    () => (isAnimating || isGhostPreview ? allCubies.filter((c) => c.isLayerActive) : []),
    [allCubies, isAnimating, isGhostPreview]
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

  // Frame loop
  useFrame(() => {
    // Layer Turn Animation
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

    // Ghost turn preview loop (loops slow forward and return turn with arrow visible)
    if (isGhostPreview && !isAnimating && pivotRef.current && targetAngle !== 0) {
      const period = 2000;
      const t = (Date.now() % period) / period;
      let angle = 0;
      if (t < 0.4) {
        angle = easeInOutCubic(t / 0.4) * targetAngle;
      } else if (t < 0.5) {
        angle = targetAngle;
      } else if (t < 0.9) {
        angle = (1 - easeInOutCubic((t - 0.5) / 0.4)) * targetAngle;
      } else {
        angle = 0;
      }
      pivotRef.current.rotation.set(0, 0, 0);
      if (activeAxis === 'x') {
        pivotRef.current.rotation.x = angle;
      } else if (activeAxis === 'y') {
        pivotRef.current.rotation.y = angle;
      } else {
        pivotRef.current.rotation.z = angle;
      }
    } else if (!isAnimating && pivotRef.current && !isGhostPreview) {
      pivotRef.current.rotation.set(0, 0, 0);
    }

    // Moving Layer Chip Projection
    if (onMovingChipChange) {
      if (activeTurnInfo && !isSolved && currentMoveNotation) {
        const pType: '3x3' | '2x2' | '4x4' = dimension === 4 ? '4x4' : dimension === 2 ? '2x2' : '3x3';
        const unified = getPuzzleTurnInfo(pType, currentMoveNotation);
        const dist = dimension === 4 ? 2.15 : dimension === 2 ? 1.05 : 1.62;
        const norm = new THREE.Vector3(...unified.axis);
        const pos = norm.clone().multiplyScalar(dist);
        const camDir = new THREE.Vector3().subVectors(camera.position, pos).normalize();
        const dot = norm.dot(camDir);
        const isFacing = dot > -0.2;
        const proj = pos.clone().project(camera);
        const screenX = (proj.x * 0.5 + 0.5) * size.width;
        const screenY = (-proj.y * 0.5 + 0.5) * size.height;
        onMovingChipChange({
          text: unified.layerName,
          screenX,
          screenY,
          visible: isFacing && !isAnimating,
        });
      } else {
        onMovingChipChange(null);
      }
    }

    // Floating Face Labels
    if (onUpdateLabels) {
      const faceDist = dimension === 4 ? 2.15 : dimension === 2 ? 1.05 : 1.62;
      const faceConfigs: Array<{
        face: FaceName3x3;
        name: string;
        pos: [number, number, number];
        normal: [number, number, number];
        dotColor: string;
      }> = [
        { face: 'U', name: 'Top', pos: [0, faceDist, 0], normal: [0, 1, 0], dotColor: '#F5F5F5' },
        { face: 'F', name: 'Front', pos: [0, 0, faceDist], normal: [0, 0, 1], dotColor: '#009B48' },
        { face: 'R', name: 'Right', pos: [faceDist, 0, 0], normal: [1, 0, 0], dotColor: '#C41E3A' },
        { face: 'L', name: 'Left', pos: [-faceDist, 0, 0], normal: [-1, 0, 0], dotColor: '#FF5800' },
        { face: 'B', name: 'Back', pos: [0, 0, -faceDist], normal: [0, 0, -1], dotColor: '#0051BA' },
        { face: 'D', name: 'Bottom', pos: [0, -faceDist, 0], normal: [0, -1, 0], dotColor: '#FFD500' },
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
          isHighlighted: currentFaceName === fc.face && !isSolved,
        };
      });

      onUpdateLabels(projectedLabels);
    }
  });

  const renderCubie = (c: any, inPivot = false) => {
    const isLayer = c.isLayerActive;
    const px = c.x + (isLayer && !inPivot ? pushOffset[0] : 0);
    const py = c.y + (isLayer && !inPivot ? pushOffset[1] : 0);
    const pz = c.z + (isLayer && !inPivot ? pushOffset[2] : 0);

    return (
      <group key={c.id} position={[px, py, pz]}>
        {/* Cubie near-black plastic body (#0b0d12, roughness 0.35) */}
        <mesh geometry={cubieGeometry} material={cubieMaterial} castShadow receiveShadow />

        {/* Stickers */}
        {c.stickers.map((st: any, sidx: number) => {
          const [nx, ny, nz] = st.normal;
          let pos: [number, number, number] = [0, 0, 0];
          let rot: [number, number, number] = [0, 0, 0];

          if (nx === 1) {
            pos = [0.495, 0, 0];
            rot = [0, Math.PI / 2, 0];
          } else if (nx === -1) {
            pos = [-0.495, 0, 0];
            rot = [0, -Math.PI / 2, 0];
          } else if (ny === 1) {
            pos = [0, 0.495, 0];
            rot = [-Math.PI / 2, 0, 0];
          } else if (ny === -1) {
            pos = [0, -0.495, 0];
            rot = [Math.PI / 2, 0, 0];
          } else if (nz === 1) {
            pos = [0, 0, 0.495];
            rot = [0, 0, 0];
          } else if (nz === -1) {
            pos = [0, 0, -0.495];
            rot = [0, Math.PI, 0];
          }

          // Exact PALETTE color mapped through PALETTE
          const rawHex = PALETTE[st.color as CubeColor] || '#334155';

          // Section 1c: +10% brightness for turning pieces, dim at most 12% (0.90) for non-active
          const displayColor = isSolved || !activeTurnInfo
            ? rawHex
            : isLayer
            ? scaleBrightness(rawHex, activeBrightnessFactor)
            : scaleBrightness(rawHex, nonActiveBrightnessFactor);

          const isCursor = interactivePainting && activeFace === st.face && activeStickerCursor === st.index;
          const isGlow = false;

          const letter = st.color ? st.color[0].toUpperCase() : '';
          const textColor = st.color === 'white' || st.color === 'yellow' ? '#0B1120' : '#FFFFFF';
          const letterTex = showColorBlindLetters ? getLetterTexture(letter, textColor) : null;

          return (
            <group key={sidx}>
              {/* Cyan cursor for interactive painting */}
              {isCursor && (
                <mesh position={[pos[0] * 0.99, pos[1] * 0.99, pos[2] * 0.99]} rotation={rot}>
                  <boxGeometry args={[0.88, 0.88, 0.01]} />
                  <meshBasicMaterial color="#22d3ee" />
                </mesh>
              )}

              {/* Extruded Rounded Square Sticker with MeshPhysicalMaterial (Section 1e saturation settings) */}
              <mesh
                geometry={stickerGeometry}
                position={pos}
                rotation={rot}
                onClick={(e) => {
                  if (interactivePainting && onStickerTap) {
                    e.stopPropagation();
                    onStickerTap(st.face, st.index);
                  }
                }}
              >
                <meshPhysicalMaterial
                  color={displayColor}
                  roughness={0.4}
                  clearcoat={0.2}
                  clearcoatRoughness={0.35}
                  metalness={0}
                  emissive={isCursor ? '#22d3ee' : isGlow ? '#22d3ee' : '#000000'}
                  emissiveIntensity={isCursor ? 0.3 : isGlow ? 0.35 : 0}
                />
              </mesh>

              {/* Colour-blind letter overlay */}
              {showColorBlindLetters && letterTex && (
                <mesh position={[pos[0] * 1.01, pos[1] * 1.01, pos[2] * 1.01]} rotation={rot}>
                  <planeGeometry args={[0.55, 0.55]} />
                  <meshBasicMaterial map={letterTex} transparent opacity={0.9} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    );
  };

  return (
    <>
      {/* Unified CameraRig owning camera pose with smooth slerp gliding */}
      <CameraRig
        puzzleId={dimension === 4 ? '4x4' : dimension === 2 ? '2x2' : '3x3'}
        currentMoveNotation={currentMoveNotation}
        autoViewMode={autoViewMode}
        isSlowSpeed={turnDurationMs >= 2800}
        isAnimatingLayer={isAnimating}
        baseDistance={dimension === 4 ? 6.2 : 4.8}
        userAzimuth={cameraAzimuth}
        userElevation={cameraElevation}
        onCameraGlideComplete={onCameraMoveComplete}
      />

      {/* Neutral white lighting only - capped key light to prevent white specular glare */}
      <ambientLight color="#FFFFFF" intensity={0.7} />
      <directionalLight color="#FFFFFF" position={[5, 8, 5]} intensity={0.85} castShadow />
      <directionalLight color="#FFFFFF" position={[-5, -4, -5]} intensity={0.45} />
      <directionalLight color="#FFFFFF" position={[-5, 3, -4]} intensity={0.5} />
      <directionalLight color="#FFFFFF" position={[5, -2, -5]} intensity={0.4} />

      {/* Soft contact shadow under the cube */}
      {contactShadowTexture && (
        <mesh position={[0, dimension === 2 ? -1.52 : -1.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.2, 4.2]} />
          <meshBasicMaterial map={contactShadowTexture} transparent opacity={0.65} depthWrite={false} />
        </mesh>
      )}

      {/* Main Cube Group - scaled for 2x2 to fill 60% stage and 4x4 to fill 70% */}
      <group
        scale={
          dimension === 4
            ? [0.75, 0.75, 0.75]
            : dimension === 2
            ? [1.38, 1.38, 1.38]
            : [1, 1, 1]
        }
      >
        {stationaryCubies.map((c) => renderCubie(c, false))}

        {/* Temporary Pivot Group for turning layer */}
        <group ref={pivotRef}>
          {turningCubies.map((c) => renderCubie(c, true))}
        </group>

        {/* Section 1b: Continuous thin bright layer belt loops */}
        {currentMoveNotation && !isSolved && (
          <LayerBelt3D
            puzzleType={dimension === 4 ? '4x4' : dimension === 2 ? '2x2' : '3x3'}
            move={currentMoveNotation}
            highlightStyle={highlightStyle}
            visible={!isAnimating}
          />
        )}

        {/* Unified Direction Arrow */}
        {currentMoveNotation && !isSolved && (
          <TurnArrowRibbon3D
            puzzleId={dimension === 4 ? '4x4' : dimension === 2 ? '2x2' : '3x3'}
            move={currentMoveNotation}
            visible={!isAnimating}
          />
        )}
      </group>
    </>
  );
};


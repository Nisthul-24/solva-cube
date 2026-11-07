import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Text, TouchableOpacity } from 'react-native';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ThreeCanvas } from './ThreeCanvas';
import {
  FaceName3x3,
  getFaceletIndexForCubie,
  CUBE_COLOR_HEX,
  dimColor,
  HighlightStrength,
} from './cubieModel';
import { Cube3x3State } from '../../solvers/cube3x3/cube3x3Facelets';
import { CubeColor } from '../../types/puzzle';

interface Cube3DInputProps {
  puzzleId: '3x3' | '2x2' | '4x4';
  state: any;
  activeFace: FaceName3x3;
  guidedMode: boolean;
  selectedColor: CubeColor;
  activeStickerIndex?: number | null;
  onPaintSticker: (face: FaceName3x3, index: number) => void;
  style?: any;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Scene3DInputProps {
  puzzleId: '3x3' | '2x2' | '4x4';
  state: any;
  activeFace: FaceName3x3;
  guidedMode: boolean;
  activeStickerIndex?: number | null;
  cameraAzimuth: number;
  cameraElevation: number;
  onStickerTap: (face: FaceName3x3, index: number) => void;
}

const Scene3DInput: React.FC<Scene3DInputProps> = ({
  puzzleId,
  state,
  activeFace,
  guidedMode,
  activeStickerIndex,
  cameraAzimuth,
  cameraElevation,
  onStickerTap,
}) => {
  const { camera } = useThree();
  const currentCam = useRef({ az: cameraAzimuth, el: cameraElevation });

  const cameraTransition = useRef<{
    startTime: number;
    startAz: number;
    startEl: number;
    targetAz: number;
    targetEl: number;
    active: boolean;
  }>({
    startTime: 0,
    startAz: cameraAzimuth,
    startEl: cameraElevation,
    targetAz: cameraAzimuth,
    targetEl: cameraElevation,
    active: false,
  });

  // Guided mode face targeting (1200 ms smooth camera turn)
  useEffect(() => {
    if (!guidedMode) return;
    let targetAz = 0.6;
    let targetEl = 0.5;

    switch (activeFace) {
      case 'U':
        targetAz = 0.2;
        targetEl = 1.15;
        break;
      case 'F':
        targetAz = 0.1;
        targetEl = 0.25;
        break;
      case 'R':
        targetAz = 1.45;
        targetEl = 0.25;
        break;
      case 'B':
        targetAz = 3.14;
        targetEl = 0.25;
        break;
      case 'L':
        targetAz = -1.45;
        targetEl = 0.25;
        break;
      case 'D':
        targetAz = 0.2;
        targetEl = -1.15;
        break;
    }

    const curAz = currentCam.current.az;
    let dAz = ((targetAz - curAz + Math.PI) % (2 * Math.PI)) - Math.PI;

    cameraTransition.current = {
      startTime: Date.now(),
      startAz: curAz,
      startEl: currentCam.current.el,
      targetAz: curAz + dAz,
      targetEl,
      active: true,
    };
  }, [activeFace, guidedMode]);

  // Sync manual orbit when not in transition
  useEffect(() => {
    if (!cameraTransition.current.active) {
      currentCam.current.az = cameraAzimuth;
      currentCam.current.el = cameraElevation;
    }
  }, [cameraAzimuth, cameraElevation]);

  useFrame(() => {
    if (cameraTransition.current.active) {
      const { startTime, startAz, startEl, targetAz, targetEl } = cameraTransition.current;
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / 1200);
      const ease = easeInOutCubic(t);

      currentCam.current.az = startAz + (targetAz - startAz) * ease;
      currentCam.current.el = startEl + (targetEl - startEl) * ease;

      if (t >= 1) {
        cameraTransition.current.active = false;
      }
    }

    const radius = 6.2;
    const cx = radius * Math.cos(currentCam.current.el) * Math.sin(currentCam.current.az);
    const cy = radius * Math.sin(currentCam.current.el);
    const cz = radius * Math.cos(currentCam.current.el) * Math.cos(currentCam.current.az);
    camera.position.set(cx, cy, cz);
    camera.lookAt(0, 0, 0);
  });

  // Construct 3x3 or 2x2 cubies
  const cubies = useMemo(() => {
    if (puzzleId === '2x2') {
      const list: any[] = [];
      const coords = [-0.55, 0.55];

      for (const x of coords) {
        for (const y of coords) {
          for (const z of coords) {
            const stickers: any[] = [];

            if (y > 0) {
              const r = z > 0 ? 1 : 0;
              const c = x > 0 ? 1 : 0;
              const idx = r * 2 + c;
              stickers.push({ face: 'U', idx, color: state.U?.[idx], normal: [0, 1, 0] });
            } else {
              const r = z > 0 ? 0 : 1;
              const c = x > 0 ? 1 : 0;
              const idx = r * 2 + c;
              stickers.push({ face: 'D', idx, color: state.D?.[idx], normal: [0, -1, 0] });
            }

            if (z > 0) {
              const r = y > 0 ? 0 : 1;
              const c = x > 0 ? 1 : 0;
              const idx = r * 2 + c;
              stickers.push({ face: 'F', idx, color: state.F?.[idx], normal: [0, 0, 1] });
            } else {
              const r = y > 0 ? 0 : 1;
              const c = x > 0 ? 0 : 1;
              const idx = r * 2 + c;
              stickers.push({ face: 'B', idx, color: state.B?.[idx], normal: [0, 0, -1] });
            }

            if (x > 0) {
              const r = y > 0 ? 0 : 1;
              const c = z > 0 ? 0 : 1;
              const idx = r * 2 + c;
              stickers.push({ face: 'R', idx, color: state.R?.[idx], normal: [1, 0, 0] });
            } else {
              const r = y > 0 ? 0 : 1;
              const c = z > 0 ? 1 : 0;
              const idx = r * 2 + c;
              stickers.push({ face: 'L', idx, color: state.L?.[idx], normal: [-1, 0, 0] });
            }

            list.push({ id: `c2_${x}_${y}_${z}`, x: x * 1.8, y: y * 1.8, z: z * 1.8, stickers, size: 0.96 });
          }
        }
      }
      return list;
    }

    if (puzzleId === '4x4') {
      const list: any[] = [];
      const coords = [-1.5, -0.5, 0.5, 1.5];

      for (const x of coords) {
        for (const y of coords) {
          for (const z of coords) {
            if (Math.abs(x) === 0.5 && Math.abs(y) === 0.5 && Math.abs(z) === 0.5) {
              continue;
            }

            const stickers: any[] = [];
            const lx = Math.round(x + 1.5);
            const ly = Math.round(y + 1.5);
            const lz = Math.round(z + 1.5);

            if (y === 1.5) {
              const idx = lz * 4 + lx;
              stickers.push({ face: 'U', idx, color: state.U?.[idx], normal: [0, 1, 0] });
            }
            if (y === -1.5) {
              const idx = (3 - lz) * 4 + lx;
              stickers.push({ face: 'D', idx, color: state.D?.[idx], normal: [0, -1, 0] });
            }
            if (z === 1.5) {
              const idx = (3 - ly) * 4 + lx;
              stickers.push({ face: 'F', idx, color: state.F?.[idx], normal: [0, 0, 1] });
            }
            if (z === -1.5) {
              const idx = (3 - ly) * 4 + (3 - lx);
              stickers.push({ face: 'B', idx, color: state.B?.[idx], normal: [0, 0, -1] });
            }
            if (x === 1.5) {
              const idx = (3 - ly) * 4 + (3 - lz);
              stickers.push({ face: 'R', idx, color: state.R?.[idx], normal: [1, 0, 0] });
            }
            if (x === -1.5) {
              const idx = (3 - ly) * 4 + lz;
              stickers.push({ face: 'L', idx, color: state.L?.[idx], normal: [-1, 0, 0] });
            }

            list.push({ id: `c4_${x}_${y}_${z}`, x, y, z, stickers, size: 0.97 });
          }
        }
      }
      return list;
    }

    // 3x3
    const list: any[] = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const stickers: any[] = [];

          if (y === 1) {
            const idx = getFaceletIndexForCubie('U', x, y, z);
            stickers.push({ face: 'U', idx, color: state.U?.[idx], normal: [0, 1, 0], isCenter: idx === 4 });
          }
          if (y === -1) {
            const idx = getFaceletIndexForCubie('D', x, y, z);
            stickers.push({ face: 'D', idx, color: state.D?.[idx], normal: [0, -1, 0], isCenter: idx === 4 });
          }
          if (z === 1) {
            const idx = getFaceletIndexForCubie('F', x, y, z);
            stickers.push({ face: 'F', idx, color: state.F?.[idx], normal: [0, 0, 1], isCenter: idx === 4 });
          }
          if (z === -1) {
            const idx = getFaceletIndexForCubie('B', x, y, z);
            stickers.push({ face: 'B', idx, color: state.B?.[idx], normal: [0, 0, -1], isCenter: idx === 4 });
          }
          if (x === 1) {
            const idx = getFaceletIndexForCubie('R', x, y, z);
            stickers.push({ face: 'R', idx, color: state.R?.[idx], normal: [1, 0, 0], isCenter: idx === 4 });
          }
          if (x === -1) {
            const idx = getFaceletIndexForCubie('L', x, y, z);
            stickers.push({ face: 'L', idx, color: state.L?.[idx], normal: [-1, 0, 0], isCenter: idx === 4 });
          }

          list.push({ id: `c3_${x}_${y}_${z}`, x, y, z, stickers, size: 0.97 });
        }
      }
    }
    return list;
  }, [puzzleId, state]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, -4, -5]} intensity={0.5} />

      <group scale={puzzleId === '4x4' ? [0.75, 0.75, 0.75] : [1, 1, 1]}>
        {cubies.map((c) => (
          <group key={c.id} position={[c.x, c.y, c.z]}>
            {/* Dark cubie body */}
            <mesh>
              <boxGeometry args={[c.size, c.size, c.size]} />
              <meshStandardMaterial color="#12161f" roughness={0.45} />
            </mesh>

            {/* Stickers */}
            {c.stickers.map((st: any, sidx: number) => {
              const [nx, ny, nz] = st.normal;
              let pos: [number, number, number] = [0, 0, 0];
              let rot: [number, number, number] = [0, 0, 0];

              if (nx === 1) {
                pos = [0.488, 0, 0];
                rot = [0, Math.PI / 2, 0];
              } else if (nx === -1) {
                pos = [-0.488, 0, 0];
                rot = [0, -Math.PI / 2, 0];
              } else if (ny === 1) {
                pos = [0, 0.488, 0];
                rot = [-Math.PI / 2, 0, 0];
              } else if (ny === -1) {
                pos = [0, -0.488, 0];
                rot = [Math.PI / 2, 0, 0];
              } else if (nz === 1) {
                pos = [0, 0, 0.488];
                rot = [0, 0, 0];
              } else if (nz === -1) {
                pos = [0, 0, -0.488];
                rot = [0, Math.PI, 0];
              }

              const baseHex = CUBE_COLOR_HEX[st.color as CubeColor] || '#334155';
              const isTargetFace = st.face === activeFace;
              const isCursor = isTargetFace && activeStickerIndex === st.idx;
              const displayColor = dimColor(baseHex, guidedMode && !isTargetFace, 'subtle');

              return (
                <group key={sidx}>
                  {/* Active cursor highlight border */}
                  {isCursor && (
                    <mesh position={pos} rotation={rot}>
                      <boxGeometry args={[0.88, 0.88, 0.012]} />
                      <meshBasicMaterial color="#22d3ee" />
                    </mesh>
                  )}

                  <mesh
                    position={pos}
                    rotation={rot}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStickerTap(st.face, st.idx);
                    }}
                  >
                    <boxGeometry args={[0.84, 0.84, 0.015]} />
                    <meshStandardMaterial
                      color={displayColor}
                      roughness={0.25}
                      metalness={0.05}
                      emissive={isCursor ? '#22d3ee' : '#000000'}
                      emissiveIntensity={isCursor ? 0.35 : 0}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        ))}
      </group>
    </>
  );
};

export const Cube3DInput: React.FC<Cube3DInputProps> = ({
  puzzleId,
  state,
  activeFace,
  guidedMode,
  selectedColor,
  activeStickerIndex,
  onPaintSticker,
  style,
}) => {
  const [azimuth, setAzimuth] = useState(0.6);
  const [elevation, setElevation] = useState(0.5);

  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: (_, gesture) => {
        dragStart.current = { x: gesture.x0, y: gesture.y0 };
        isDragging.current = false;
      },
      onPanResponderMove: (_, gesture) => {
        const dist = Math.hypot(gesture.moveX - dragStart.current.x, gesture.moveY - dragStart.current.y);
        if (dist > 5) {
          isDragging.current = true;
        }
        setAzimuth((prev) => prev - gesture.vx * 0.04);
        setElevation((prev) => Math.max(-1.35, Math.min(1.35, prev + gesture.vy * 0.04)));
      },
    })
  ).current;

  const handleStickerTap = useCallback(
    (face: FaceName3x3, idx: number) => {
      // Finger/mouse movement under 6px between press and release (Requirement 5)
      if (isDragging.current) return;
      onPaintSticker(face, idx);
    },
    [onPaintSticker]
  );

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      <ThreeCanvas style={styles.canvas}>
        <Scene3DInput
          puzzleId={puzzleId}
          state={state}
          activeFace={activeFace}
          guidedMode={guidedMode}
          activeStickerIndex={activeStickerIndex}
          cameraAzimuth={azimuth}
          cameraElevation={elevation}
          onStickerTap={handleStickerTap}
        />
      </ThreeCanvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0B1120',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
});


import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ThreeCanvas } from './ThreeCanvas';
import { Cube3x3State } from '../../solvers/cube3x3/cube3x3Facelets';
import {
  FaceName3x3,
  getFaceletIndexForCubie,
  CUBE_COLOR_HEX,
  dimColor,
} from './cubieModel';

interface MiniCubeSceneProps {
  cubeState: Cube3x3State;
  activeFace: FaceName3x3;
}

const MiniCubeScene: React.FC<MiniCubeSceneProps> = ({ cubeState, activeFace }) => {
  const { camera } = useThree();

  const camPos = useMemo<[number, number, number]>(() => {
    const dist = 5.6;
    switch (activeFace) {
      case 'U':
        return [0.6, dist * 0.9, 1.2];
      case 'F':
        return [0.6, 1.2, dist * 0.9];
      case 'R':
        return [dist * 0.9, 1.2, 0.6];
      case 'B':
        return [-0.6, 1.2, -dist * 0.9];
      case 'L':
        return [-dist * 0.9, 1.2, -0.6];
      case 'D':
        return [0.6, -dist * 0.9, 1.2];
    }
  }, [activeFace]);

  useFrame(() => {
    camera.position.lerp(new THREE.Vector3(...camPos), 0.12);
    camera.lookAt(0, 0, 0);
  });

  const cubies = useMemo(() => {
    const list: Array<{
      id: string;
      x: number;
      y: number;
      z: number;
      stickers: Array<{
        face: FaceName3x3;
        color: string;
        isTargetFace: boolean;
        normal: [number, number, number];
      }>;
    }> = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const stickers: Array<{
            face: FaceName3x3;
            color: string;
            isTargetFace: boolean;
            normal: [number, number, number];
          }> = [];

          if (y === 1) {
            const idx = getFaceletIndexForCubie('U', x, y, z);
            stickers.push({
              face: 'U',
              color: CUBE_COLOR_HEX[cubeState.U[idx]],
              isTargetFace: activeFace === 'U',
              normal: [0, 1, 0],
            });
          }
          if (y === -1) {
            const idx = getFaceletIndexForCubie('D', x, y, z);
            stickers.push({
              face: 'D',
              color: CUBE_COLOR_HEX[cubeState.D[idx]],
              isTargetFace: activeFace === 'D',
              normal: [0, -1, 0],
            });
          }
          if (z === 1) {
            const idx = getFaceletIndexForCubie('F', x, y, z);
            stickers.push({
              face: 'F',
              color: CUBE_COLOR_HEX[cubeState.F[idx]],
              isTargetFace: activeFace === 'F',
              normal: [0, 0, 1],
            });
          }
          if (z === -1) {
            const idx = getFaceletIndexForCubie('B', x, y, z);
            stickers.push({
              face: 'B',
              color: CUBE_COLOR_HEX[cubeState.B[idx]],
              isTargetFace: activeFace === 'B',
              normal: [0, 0, -1],
            });
          }
          if (x === 1) {
            const idx = getFaceletIndexForCubie('R', x, y, z);
            stickers.push({
              face: 'R',
              color: CUBE_COLOR_HEX[cubeState.R[idx]],
              isTargetFace: activeFace === 'R',
              normal: [1, 0, 0],
            });
          }
          if (x === -1) {
            const idx = getFaceletIndexForCubie('L', x, y, z);
            stickers.push({
              face: 'L',
              color: CUBE_COLOR_HEX[cubeState.L[idx]],
              isTargetFace: activeFace === 'L',
              normal: [-1, 0, 0],
            });
          }

          list.push({ id: `mini_${x}_${y}_${z}`, x, y, z, stickers });
        }
      }
    }
    return list;
  }, [cubeState, activeFace]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 4]} intensity={1.1} />

      <group>
        {cubies.map((c) => (
          <group key={c.id} position={[c.x, c.y, c.z]}>
            <mesh>
              <boxGeometry args={[0.96, 0.96, 0.96]} />
              <meshStandardMaterial color="#12161f" roughness={0.5} />
            </mesh>

            {c.stickers.map((st, sidx) => {
              const [nx, ny, nz] = st.normal;
              let pos: [number, number, number] = [0, 0, 0];
              let rot: [number, number, number] = [0, 0, 0];

              if (nx === 1) {
                pos = [0.485, 0, 0];
                rot = [0, Math.PI / 2, 0];
              } else if (nx === -1) {
                pos = [-0.485, 0, 0];
                rot = [0, -Math.PI / 2, 0];
              } else if (ny === 1) {
                pos = [0, 0.485, 0];
                rot = [-Math.PI / 2, 0, 0];
              } else if (ny === -1) {
                pos = [0, -0.485, 0];
                rot = [Math.PI / 2, 0, 0];
              } else if (nz === 1) {
                pos = [0, 0, 0.485];
                rot = [0, 0, 0];
              } else if (nz === -1) {
                pos = [0, 0, -0.485];
                rot = [0, Math.PI, 0];
              }

              const finalColor = dimColor(st.color, !st.isTargetFace);

              return (
                <mesh key={sidx} position={pos} rotation={rot}>
                  <boxGeometry args={[0.82, 0.82, 0.015]} />
                  <meshStandardMaterial
                    color={finalColor}
                    emissive={st.isTargetFace ? finalColor : '#000000'}
                    emissiveIntensity={st.isTargetFace ? 0.12 : 0}
                    roughness={0.3}
                  />
                </mesh>
              );
            })}
          </group>
        ))}
      </group>
    </>
  );
};

interface MiniCubePreviewProps {
  cubeState: Cube3x3State;
  activeFace: FaceName3x3;
  size?: number;
}

export const MiniCubePreview: React.FC<MiniCubePreviewProps> = ({
  cubeState,
  activeFace,
  size = 140,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <ThreeCanvas style={styles.canvas}>
        <MiniCubeScene cubeState={cubeState} activeFace={activeFace} />
      </ThreeCanvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#070D18',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
});


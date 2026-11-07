import React, { useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ThreeCanvas } from './ThreeCanvas';
import { PyraminxState, FaceNamePyraminx } from '../../solvers/pyraminx/pyraminxFacelets';
import { CUBE_COLOR_HEX } from './cubieModel';
import { CubeColor } from '../../types/puzzle';

interface Tetrahedron3DInputProps {
  state: PyraminxState;
  activeFace: FaceNamePyraminx;
  guidedMode: boolean;
  selectedColor: CubeColor;
  onPaintSticker: (face: FaceNamePyraminx, index: number) => void;
  style?: any;
}

// 4 vertices of a regular tetrahedron
const V0 = new THREE.Vector3(0, 1.5, 0); // Top
const V1 = new THREE.Vector3(1.41, -0.5, 0.82);
const V2 = new THREE.Vector3(-1.41, -0.5, 0.82);
const V3 = new THREE.Vector3(0, -0.5, -1.63);

// Subdivide triangle (A, B, C) into 9 smaller triangles
function subdivideTriangle(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3
): Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3]> {
  // Grid of points P(i, j) where i in [0..3], j in [0..3-i]
  const P: THREE.Vector3[][] = [];
  for (let i = 0; i <= 3; i++) {
    P[i] = [];
    for (let j = 0; j <= 3 - i; j++) {
      const u = (3 - i - j) / 3;
      const v = i / 3;
      const w = j / 3;
      P[i][j] = new THREE.Vector3()
        .addScaledVector(a, u)
        .addScaledVector(b, v)
        .addScaledVector(c, w);
    }
  }

  // Generate the 9 small triangles in order:
  // Row 0 (top): 1 triangle
  // Row 1: 3 triangles
  // Row 2: 5 triangles
  const triangles: Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3]> = [];

  // Index 0: Top tip
  triangles.push([P[0][0], P[1][0], P[0][1]]);

  // Row 1
  triangles.push([P[1][0], P[2][0], P[1][1]]);
  triangles.push([P[1][1], P[1][0], P[0][1]]); // inverted
  triangles.push([P[0][1], P[1][1], P[0][2]]);

  // Row 2
  triangles.push([P[2][0], P[3][0], P[2][1]]);
  triangles.push([P[2][1], P[2][0], P[1][1]]); // inverted
  triangles.push([P[1][1], P[2][1], P[1][2]]);
  triangles.push([P[1][2], P[1][1], P[0][2]]); // inverted
  triangles.push([P[0][2], P[1][2], P[0][3]]);

  return triangles;
}

const FACES_CONFIG: Array<{
  face: FaceNamePyraminx;
  vA: THREE.Vector3;
  vB: THREE.Vector3;
  vC: THREE.Vector3;
}> = [
  { face: 'F', vA: V0, vB: V1, vC: V2 }, // Front face
  { face: 'L', vA: V0, vB: V2, vC: V3 }, // Left face
  { face: 'R', vA: V0, vB: V3, vC: V1 }, // Right face
  { face: 'D', vA: V3, vB: V2, vC: V1 }, // Bottom face
];

const SceneTetrahedron: React.FC<{
  state: PyraminxState;
  activeFace: FaceNamePyraminx;
  cameraAzimuth: number;
  cameraElevation: number;
  onStickerTap: (face: FaceNamePyraminx, index: number) => void;
}> = ({ state, activeFace, cameraAzimuth, cameraElevation, onStickerTap }) => {
  const { camera } = useThree();

  useFrame(() => {
    const radius = 6.2;
    const cx = radius * Math.cos(cameraElevation) * Math.sin(cameraAzimuth);
    const cy = radius * Math.sin(cameraElevation);
    const cz = radius * Math.cos(cameraElevation) * Math.cos(cameraAzimuth);
    camera.position.set(cx, cy, cz);
    camera.lookAt(0, 0, 0);
  });

  const faceStickers = useMemo(() => {
    const list: any[] = [];

    for (const fc of FACES_CONFIG) {
      const triList = subdivideTriangle(fc.vA, fc.vB, fc.vC);

      triList.forEach((tri, idx) => {
        // Normal vector
        const edge1 = new THREE.Vector3().subVectors(tri[1], tri[0]);
        const edge2 = new THREE.Vector3().subVectors(tri[2], tri[0]);
        const norm = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        // Shrink slightly to create dark borders between stickers
        const center = new THREE.Vector3()
          .add(tri[0])
          .add(tri[1])
          .add(tri[2])
          .divideScalar(3);

        const s0 = new THREE.Vector3().lerpVectors(tri[0], center, 0.08).addScaledVector(norm, 0.02);
        const s1 = new THREE.Vector3().lerpVectors(tri[1], center, 0.08).addScaledVector(norm, 0.02);
        const s2 = new THREE.Vector3().lerpVectors(tri[2], center, 0.08).addScaledVector(norm, 0.02);

        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array([
          s0.x, s0.y, s0.z,
          s1.x, s1.y, s1.z,
          s2.x, s2.y, s2.z,
        ]);
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.computeVertexNormals();

        const colorName = state[fc.face]?.[idx] as CubeColor;
        const hex = CUBE_COLOR_HEX[colorName] || '#334155';

        list.push({
          id: `pyra_${fc.face}_${idx}`,
          face: fc.face,
          index: idx,
          geometry: geom,
          color: hex,
        });
      });
    }

    return list;
  }, [state]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, -4, -5]} intensity={0.5} />

      {/* Dark core body */}
      <mesh>
        <tetrahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color="#12161f" roughness={0.5} />
      </mesh>

      {/* 36 Triangular Stickers (9 per face x 4 faces) */}
      <group>
        {faceStickers.map((st) => (
          <mesh
            key={st.id}
            geometry={st.geometry}
            onClick={(e) => {
              e.stopPropagation();
              onStickerTap(st.face, st.index);
            }}
          >
            <meshStandardMaterial color={st.color} roughness={0.25} />
          </mesh>
        ))}
      </group>
    </>
  );
};

export const Tetrahedron3DInput: React.FC<Tetrahedron3DInputProps> = ({
  state,
  activeFace,
  guidedMode,
  selectedColor,
  onPaintSticker,
  style,
}) => {
  const [azimuth, setAzimuth] = useState(0.5);
  const [elevation, setElevation] = useState(0.4);

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
        if (dist > 5) isDragging.current = true;
        setAzimuth((prev) => prev - gesture.vx * 0.04);
        setElevation((prev) => Math.max(-1.35, Math.min(1.35, prev + gesture.vy * 0.04)));
      },
    })
  ).current;

  const handleStickerTap = useCallback(
    (face: FaceNamePyraminx, idx: number) => {
      if (isDragging.current) return;
      onPaintSticker(face, idx);
    },
    [onPaintSticker]
  );

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      <ThreeCanvas style={styles.canvas}>
        <SceneTetrahedron
          state={state}
          activeFace={activeFace}
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


import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ThreeCanvas } from '../src/components/3d/ThreeCanvas';
import { PALETTE, scaleBrightness } from '../src/components/3d/stickerLayout';
import { CubeColor } from '../src/types/puzzle';

const SPHERES: Array<{ color: CubeColor; hex: string; pos: [number, number, number] }> = [
  { color: 'white', hex: PALETTE.white, pos: [-2.5, 1.2, 0] },
  { color: 'yellow', hex: PALETTE.yellow, pos: [0, 1.2, 0] },
  { color: 'green', hex: PALETTE.green, pos: [2.5, 1.2, 0] },
  { color: 'blue', hex: PALETTE.blue, pos: [-2.5, -1.2, 0] },
  { color: 'red', hex: PALETTE.red, pos: [0, -1.2, 0] },
  { color: 'orange', hex: PALETTE.orange, pos: [2.5, -1.2, 0] },
];

function SpheresScene() {
  const { gl, scene } = useThree();

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
      scene.environmentIntensity = 0.55;

      return () => {
        roomEnv.dispose();
        pmremGenerator.dispose();
      };
    } catch (e) {}
  }, [gl, scene]);

  return (
    <>
      <ambientLight color="#FFFFFF" intensity={0.65} />
      <directionalLight color="#FFFFFF" position={[5, 8, 5]} intensity={1.1} />
      <directionalLight color="#FFFFFF" position={[-5, -4, -5]} intensity={0.4} />

      {SPHERES.map((sp) => (
        <group key={sp.color} position={sp.pos}>
          <mesh>
            <sphereGeometry args={[0.9, 32, 32]} />
            <meshPhysicalMaterial
              color={sp.hex}
              roughness={0.28}
              clearcoat={0.6}
              clearcoatRoughness={0.2}
              metalness={0}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function ColourCheckScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hidden Debug: /colour-check</Text>
        <Text style={styles.subtitle}>6 Spheres under exact lighting & renderer settings</Text>
      </View>

      <View style={styles.canvasContainer}>
        <ThreeCanvas style={styles.canvas}>
          <SpheresScene />
        </ThreeCanvas>
      </View>

      <ScrollView contentContainerStyle={styles.infoScroll}>
        <Text style={styles.infoHeading}>CANONICAL PALETTE SPECIFICATION:</Text>
        {SPHERES.map((sp) => {
          const scaledHex = scaleBrightness(sp.hex, 0.8);
          return (
            <View key={sp.color} style={styles.infoRow}>
              <View style={[styles.swatch, { backgroundColor: sp.hex }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.colorName}>
                  {sp.color.toUpperCase()} · Active: {sp.hex}
                </Text>
                <Text style={styles.colorDim}>Non-Active (0.8x scaled): {scaledHex}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#22d3ee',
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  canvasContainer: {
    width: '100%',
    height: 340,
    backgroundColor: '#070D18',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
  infoScroll: {
    padding: 16,
  },
  infoHeading: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#151C2B',
    padding: 10,
    borderRadius: 10,
    gap: 12,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  colorName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  colorDim: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
});


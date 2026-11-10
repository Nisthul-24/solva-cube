import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { UnifiedTurnInfo, getPuzzleTurnInfo, getOrthonormalBasis, buildOrbitArrow } from './puzzleTurnInfo';

interface TurnArrowRibbon3DProps {
  puzzleId: '3x3' | '2x2' | '4x4' | 'pyraminx';
  move: string;
  visible?: boolean;
}

// Canvas texture for "x2" badge on double turns
function createX2BadgeTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 128, 128);
    // Dark rounded background
    ctx.fillStyle = 'rgba(11, 17, 32, 0.92)';
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fill();

    // Cyan outline
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#22d3ee';
    ctx.stroke();

    // Text "x2"
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('x2', 64, 66);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  } catch (e) {
    return null;
  }
}

export const TurnArrowRibbon3D: React.FC<TurnArrowRibbon3DProps> = ({
  puzzleId,
  move,
  visible = true,
}) => {
  const { camera } = useThree();

  const turnInfo = useMemo<UnifiedTurnInfo | null>(() => {
    if (!move) return null;
    try {
      return getPuzzleTurnInfo(puzzleId, move);
    } catch (e) {
      return null;
    }
  }, [puzzleId, move]);

  const basis = useMemo(() => {
    if (!turnInfo) return null;
    const axis = new THREE.Vector3(...turnInfo.axis).normalize();
    const c = new THREE.Vector3(...turnInfo.arcCenter);
    const camDir = new THREE.Vector3(1, 0.8, 1);
    const camRel = camDir.clone().sub(c);
    const camDotA = camRel.dot(axis);
    let camPerp = camRel.clone().sub(axis.clone().multiplyScalar(camDotA));
    if (camPerp.lengthSq() < 1e-4) {
      camPerp = Math.abs(axis.y) < 0.88 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const perpDot = camPerp.dot(axis);
      camPerp.sub(axis.clone().multiplyScalar(perpDot));
    }
    camPerp.normalize();
    const U: [number, number, number] = [camPerp.x, camPerp.y, camPerp.z];
    const vVec = axis.clone().cross(camPerp).normalize();
    const V: [number, number, number] = [vVec.x, vVec.y, vVec.z];
    return { A: [axis.x, axis.y, axis.z] as [number, number, number], U, V };
  }, [turnInfo]);

  // Three.js BufferGeometries
  const ribbonGeomRef = useRef(new THREE.BufferGeometry());
  const ribbonOutlineGeomRef = useRef(new THREE.BufferGeometry());
  const headGeomRef = useRef(new THREE.BufferGeometry());
  const headOutlineGeomRef = useRef(new THREE.BufferGeometry());
  const groupRef = useRef<THREE.Group>(null);

  const lastMidAngleRef = useRef<number | null>(null);
  const headTipPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const spriteRef = useRef<THREE.Sprite>(null);

  // Dimensions based on puzzle
  const dims = useMemo(() => {
    if (!turnInfo) {
      return {
        ribbonWidth: 0.22,
        headLength: 0.70,
        headWidth: 0.44,
        sweepRad: (110 * Math.PI) / 180,
      };
    }
    const isDouble = turnInfo.isDouble;
    const sweepRad = isDouble ? (220 * Math.PI) / 180 : (110 * Math.PI) / 180;

    if (puzzleId === 'pyraminx') {
      const isTip = turnInfo.isTipOnly;
      return {
        ribbonWidth: 0.05 * 2.8284, // 5% of model size (model edge length = sqrt(8) ~ 2.8284)
        headLength: 0.36,
        headWidth: 0.28,
        sweepRad: (120 * Math.PI) / 180, // sweep 120 deg
      };
    }
    if (puzzleId === '4x4') {
      return {
        ribbonWidth: 0.22,
        headLength: 0.65,
        headWidth: 0.42,
        sweepRad: (90 * Math.PI) / 180, // 90-degree arc for cube
      };
    }
    return {
      ribbonWidth: 0.22,
      headLength: 0.65,
      headWidth: 0.42,
      sweepRad,
    };
  }, [puzzleId, turnInfo]);

  // Update geometry from mid-angle
  const updateGeometryForAngle = (midAngle: number) => {
    if (!turnInfo || !basis) return;

    const arrow = buildOrbitArrow(
      turnInfo.arcCenter,
      turnInfo.axis,
      basis.U,
      basis.V,
      turnInfo.arcRadius,
      turnInfo.angleRad,
      dims.ribbonWidth,
      dims.headLength,
      dims.headWidth,
      dims.sweepRad,
      midAngle
    );

    const updateGeom = (geom: THREE.BufferGeometry, data: Float32Array) => {
      geom.setAttribute('position', new THREE.BufferAttribute(data, 3));
      if (geom.attributes.position) {
        geom.attributes.position.needsUpdate = true;
      }
      geom.computeBoundingSphere();
    };

    updateGeom(ribbonGeomRef.current, arrow.ribbonPositions);
    updateGeom(ribbonOutlineGeomRef.current, arrow.ribbonOutlinePositions);
    updateGeom(headGeomRef.current, arrow.headPositions);
    updateGeom(headOutlineGeomRef.current, arrow.headOutlinePositions);

    headTipPosRef.current.set(arrow.arrowhead.tip[0], arrow.arrowhead.tip[1], arrow.arrowhead.tip[2]);
    if (spriteRef.current && turnInfo.isDouble) {
      const tip = headTipPosRef.current;
      const c = new THREE.Vector3(...turnInfo.arcCenter);
      const dir = tip.clone().sub(c);
      if (dir.lengthSq() > 1e-4) {
        dir.normalize();
        spriteRef.current.position.copy(tip).addScaledVector(dir, 0.35);
      } else {
        spriteRef.current.position.copy(tip).add(new THREE.Vector3(0, 0.35, 0));
      }
    }
    lastMidAngleRef.current = midAngle;
  };

  // Re-initialize geometry on turnInfo change
  useEffect(() => {
    if (turnInfo && basis) {
      lastMidAngleRef.current = null;
      updateGeometryForAngle(0);
    }
  }, [turnInfo, basis, dims]);

  // Track camera in frame loop to dynamically center arc on visible side facing camera
  useFrame(() => {
    if (!visible || !turnInfo || !basis) return;

    const c = new THREE.Vector3(...turnInfo.arcCenter);
    const u = new THREE.Vector3(...basis.U);
    const v = new THREE.Vector3(...basis.V);

    const localCam = groupRef.current ? groupRef.current.worldToLocal(camera.position.clone()) : camera.position;
    const camRel = localCam.clone().sub(c);
    const vU = camRel.dot(u);
    const vV = camRel.dot(v);
    const curMidAngle = Math.atan2(vV, vU);

    if (
      lastMidAngleRef.current === null ||
      Math.abs(curMidAngle - lastMidAngleRef.current) > 0.005
    ) {
      updateGeometryForAngle(curMidAngle);
    }
  });

  // Materials
  const cyanMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#22d3ee',
        emissive: '#00b4d8',
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  const outlineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#071626',
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  const headMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#22d3ee',
        emissive: '#00e5ff',
        emissiveIntensity: 1.0,
        roughness: 0.15,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false, // Always drawn on top so never obscured
        depthWrite: false,
      }),
    []
  );

  const headOutlineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#071626',
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  const x2Texture = useMemo(() => (turnInfo?.isDouble ? createX2BadgeTexture() : null), [turnInfo?.isDouble]);

  if (!visible || !turnInfo) {
    return null;
  }

  return (
    <group ref={groupRef} renderOrder={900}>
      {/* 1. Dark outline under ribbon (thicker ribbon) */}
      <mesh geometry={ribbonOutlineGeomRef.current} material={outlineMaterial} renderOrder={900} />

      {/* 2. Bright cyan emissive ribbon fill */}
      <mesh geometry={ribbonGeomRef.current} material={cyanMaterial} renderOrder={910} />

      {/* 3. Dark outline under arrowhead */}
      <mesh geometry={headOutlineGeomRef.current} material={headOutlineMaterial} renderOrder={940} />

      {/* 4. Planar triangular arrowhead on top */}
      <mesh geometry={headGeomRef.current} material={headMaterial} renderOrder={950} />

      {/* 5. "x2" badge near head on half turns */}
      {turnInfo.isDouble && x2Texture && (
        <sprite
          ref={spriteRef}
          position={[headTipPosRef.current.x, headTipPosRef.current.y + 0.35, headTipPosRef.current.z]}
          scale={[0.55, 0.55, 1]}
          renderOrder={960}
        >
          <spriteMaterial map={x2Texture} depthTest={false} transparent={true} />
        </sprite>
      )}
    </group>
  );
};

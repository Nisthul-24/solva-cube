import React, { useMemo } from 'react';
import * as THREE from 'three';
import { computeArrowArc } from './cubieModel';

interface DirectionArrow3DProps {
  move: string;
  visible: boolean;
  dimension?: 2 | 3;
}

export const DirectionArrow3D: React.FC<DirectionArrow3DProps> = ({
  move,
  visible,
  dimension = 3,
}) => {
  const { coreTubeGeom, outlineTubeGeom, conePos, coneQuat, outlineConeGeom, coreConeGeom } =
    useMemo(() => {
      const radius = dimension === 2 ? 0.85 : 1.15;
      const dOverride = dimension === 2 ? 1.15 : 1.68;
      const { points, endPos, endTangent } = computeArrowArc(move, radius, dOverride);

      const v3Points = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(v3Points);

      const coreTube = new THREE.TubeGeometry(curve, 32, 0.045, 8, false);
      const outlineTube = new THREE.TubeGeometry(curve, 32, 0.08, 8, false);

      const tipPos = new THREE.Vector3(endPos[0], endPos[1], endPos[2]);
      const tangent = new THREE.Vector3(endTangent[0], endTangent[1], endTangent[2]).normalize();

      // Cone geometry in Three.js points along +Y by default
      const defaultConeDir = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(defaultConeDir, tangent);

      const coneCore = new THREE.ConeGeometry(0.12, 0.28, 16);
      const coneOutline = new THREE.ConeGeometry(0.16, 0.32, 16);

      return {
        coreTubeGeom: coreTube,
        outlineTubeGeom: outlineTube,
        conePos: tipPos,
        coneQuat: quat,
        coreConeGeom: coneCore,
        outlineConeGeom: coneOutline,
      };
    }, [move]);

  if (!visible) return null;

  return (
    <group renderOrder={998}>
      {/* Dark Outline */}
      <mesh geometry={outlineTubeGeom} renderOrder={998}>
        <meshBasicMaterial
          color="#0b1120"
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh
        geometry={outlineConeGeom}
        position={conePos}
        quaternion={coneQuat}
        renderOrder={998}
      >
        <meshBasicMaterial
          color="#0b1120"
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Bright Cyan Arrow (#22d3ee) */}
      <mesh geometry={coreTubeGeom} renderOrder={999}>
        <meshBasicMaterial
          color="#22d3ee"
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={1.0}
        />
      </mesh>
      <mesh
        geometry={coreConeGeom}
        position={conePos}
        quaternion={coneQuat}
        renderOrder={999}
      >
        <meshBasicMaterial
          color="#22d3ee"
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={1.0}
        />
      </mesh>
    </group>
  );
};

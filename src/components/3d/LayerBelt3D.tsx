import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';
import { Axis } from './cubieModel';
import { HighlightStyleOption } from '../../store/settingsStore';
import { getPuzzleEngine } from '../../puzzleEngine/puzzleEngine';

export interface LayerBelt3DProps {
  puzzleType: '3x3' | '2x2' | '4x4' | 'pyraminx';
  move: string | null;
  highlightStyle?: HighlightStyleOption;
  visible?: boolean;
}

const FRESNEL_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRESNEL_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float dotNV = max(0.0, dot(normal, viewDir));
    float rim = pow(1.0 - dotNV, 2.5);
    float alpha = 0.9 * rim;
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(uColor * (0.8 + 0.4 * rim), alpha);
  }
`;

function createRoundedSquarePoints(halfWidth: number, radius: number, segmentsPerCorner = 8): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const W = halfWidth;
  const r = Math.min(radius, W * 0.5);
  const innerW = W - r;

  points.push(new THREE.Vector2(-innerW, W));
  points.push(new THREE.Vector2(innerW, W));

  for (let i = 1; i <= segmentsPerCorner; i++) {
    const angle = Math.PI / 2 - (i / segmentsPerCorner) * (Math.PI / 2);
    points.push(new THREE.Vector2(innerW + r * Math.cos(angle), innerW + r * Math.sin(angle)));
  }

  points.push(new THREE.Vector2(W, -innerW));

  for (let i = 1; i <= segmentsPerCorner; i++) {
    const angle = 0 - (i / segmentsPerCorner) * (Math.PI / 2);
    points.push(new THREE.Vector2(innerW + r * Math.cos(angle), -innerW + r * Math.sin(angle)));
  }

  points.push(new THREE.Vector2(-innerW, -W));

  for (let i = 1; i <= segmentsPerCorner; i++) {
    const angle = -Math.PI / 2 - (i / segmentsPerCorner) * (Math.PI / 2);
    points.push(new THREE.Vector2(-innerW + r * Math.cos(angle), -innerW + r * Math.sin(angle)));
  }

  points.push(new THREE.Vector2(-W, innerW));

  for (let i = 1; i <= segmentsPerCorner; i++) {
    const angle = Math.PI - (i / segmentsPerCorner) * (Math.PI / 2);
    points.push(new THREE.Vector2(-innerW + r * Math.cos(angle), innerW + r * Math.sin(angle)));
  }

  return points;
}

function createBoundaryLoopGeometry(
  axis: Axis,
  planeCoord: number,
  halfWidth: number,
  cornerRadius: number,
  tubeRadius: number
): THREE.BufferGeometry {
  const pts2d = createRoundedSquarePoints(halfWidth, cornerRadius, 6);
  const pts3d: THREE.Vector3[] = pts2d.map((p) => {
    if (axis === 'x') {
      return new THREE.Vector3(planeCoord, p.x, p.y);
    } else if (axis === 'y') {
      return new THREE.Vector3(p.x, planeCoord, p.y);
    } else {
      return new THREE.Vector3(p.x, p.y, planeCoord);
    }
  });

  const curve = new THREE.CatmullRomCurve3(pts3d, true, 'centripetal');
  return new THREE.TubeGeometry(curve, 48, tubeRadius, 6, true);
}

/**
 * Creates clipped tetrahedron cap geometry for Pyraminx
 */
function createPyraminxCapGeometry(
  tipVertex: THREE.Vector3,
  adjacentVertices: THREE.Vector3[],
  cutFraction: number, // 2/3 for uppercase, 1/3 for lowercase tip
  scaleFactor = 1.04
): THREE.BufferGeometry {
  // Cap has apex at tipVertex, base corners along edges toward adjacentVertices at cutFraction
  const apex = tipVertex.clone().multiplyScalar(scaleFactor);
  const baseCorners = adjacentVertices.map((v) => {
    const pt = tipVertex.clone().lerp(v, cutFraction);
    return pt.multiplyScalar(scaleFactor);
  });

  // Construct triangles: 3 lateral faces + 1 base face (clipped cap)
  const positions: number[] = [];
  const normals: number[] = [];

  const addTri = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
    const n = new THREE.Vector3().crossVectors(p2.clone().sub(p1), p3.clone().sub(p1)).normalize();
    positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
  };

  // Lateral faces
  addTri(apex, baseCorners[0], baseCorners[1]);
  addTri(apex, baseCorners[1], baseCorners[2]);
  addTri(apex, baseCorners[2], baseCorners[0]);

  // Base face (cut plane)
  addTri(baseCorners[0], baseCorners[2], baseCorners[1]);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geom;
}

/**
 * Creates 3D triangular loop at cut plane for Pyraminx
 */
function createPyraminxCutLineGeometry(
  tipVertex: THREE.Vector3,
  adjacentVertices: THREE.Vector3[],
  cutFraction: number,
  tubeRadius = 0.016
): THREE.BufferGeometry {
  const pts = adjacentVertices.map((v) => {
    const pt = tipVertex.clone().lerp(v, cutFraction);
    // Lift slightly outward along surface normal
    return pt.clone().add(pt.clone().normalize().multiplyScalar(0.015));
  });

  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.TubeGeometry(curve, 36, tubeRadius, 6, true);
}

export const LayerBelt3D: React.FC<LayerBelt3DProps> = ({
  puzzleType,
  move,
  highlightStyle = 'glass_belt',
  visible = true,
}) => {
  const effectiveStyle: HighlightStyleOption =
    (highlightStyle as any) === 'belt' ? 'glass_belt' : highlightStyle;

  // Fresnel glass rim shader material
  const glassMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FRESNEL_VERTEX_SHADER,
        fragmentShader: FRESNEL_FRAGMENT_SHADER,
        uniforms: {
          uColor: { value: new THREE.Color('#22d3ee') },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    []
  );

  // Outline material for fallback / option
  const outlineMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e0f7fa',
        emissive: '#22d3ee',
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.1,
        depthTest: true,
        depthWrite: false,
      }),
    []
  );

  // Pyraminx cut-plane line material (3px bright loop line)
  const cutLineMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#22d3ee',
        emissiveIntensity: 1.0,
        roughness: 0.15,
        depthTest: true,
        depthWrite: false,
      }),
    []
  );

  // Geometries for glass belt and outline
  const { glassGeom, outlineGeoms, cutLineGeom, glassPosition } = useMemo(() => {
    if (!move || !visible || effectiveStyle === 'off') {
      return { glassGeom: null, outlineGeoms: [], cutLineGeom: null, glassPosition: [0, 0, 0] as [number, number, number] };
    }

    const cleanMove = move.trim();

    if (puzzleType === 'pyraminx') {
      const vMap: Record<string, [number, number, number]> = {
        U: [1, 1, 1],
        L: [1, -1, -1],
        R: [-1, 1, -1],
        B: [-1, -1, 1],
      };
      const letter = cleanMove[0].toUpperCase();
      const isTip = cleanMove[0] === cleanMove[0].toLowerCase();
      const vCoord = vMap[letter];
      if (!vCoord) return { glassGeom: null, outlineGeoms: [], cutLineGeom: null, glassPosition: [0, 0, 0] };

      const tipVec = new THREE.Vector3(...vCoord);
      const adjKeys = Object.keys(vMap).filter((k) => k !== letter);
      const adjVecs = adjKeys.map((k) => new THREE.Vector3(...vMap[k]));

      // Uppercase moves top 2/3 cap, lowercase moves tip 1/3
      const cutFrac = isTip ? 1 / 3 : 2 / 3;

      const capGeom = effectiveStyle === 'glass_belt'
        ? createPyraminxCapGeometry(tipVec, adjVecs, cutFrac, 1.04)
        : null;

      const cutLine = createPyraminxCutLineGeometry(tipVec, adjVecs, cutFrac, 0.018);

      return {
        glassGeom: capGeom,
        outlineGeoms: [],
        cutLineGeom: cutLine,
        glassPosition: [0, 0, 0] as [number, number, number],
      };
    }

    // Cubes: 3x3, 2x2, 4x4
    let axis: Axis = 'y';
    let slabMin = 0.5;
    let slabMax = 1.5;
    let cubeHalfWidth = 1.5; // for 3x3

    if (puzzleType === '2x2') {
      cubeHalfWidth = 1.0;
      const letter = cleanMove[0].toUpperCase();
      if (letter === 'R') { axis = 'x'; slabMin = 0; slabMax = 1.0; }
      else if (letter === 'L') { axis = 'x'; slabMin = -1.0; slabMax = 0; }
      else if (letter === 'U') { axis = 'y'; slabMin = 0; slabMax = 1.0; }
      else if (letter === 'D') { axis = 'y'; slabMin = -1.0; slabMax = 0; }
      else if (letter === 'F') { axis = 'z'; slabMin = 0; slabMax = 1.0; }
      else if (letter === 'B') { axis = 'z'; slabMin = -1.0; slabMax = 0; }
    } else if (puzzleType === '4x4') {
      cubeHalfWidth = 2.0; // In unscaled 4x4 group
      const eng = getPuzzleEngine('4x4');
      const m = eng.getMove(cleanMove);
      if (m && m.axisName) {
        axis = m.axisName;
        const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
        let minC = Infinity;
        let maxC = -Infinity;
        for (const p of eng.pieces) {
          if (m.turningPieceSet.has(p.id)) {
            const c = p.homeCentroid[axisIdx];
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        }
        slabMin = minC - 0.5;
        slabMax = maxC + 0.5;
      }
    } else {
      // 3x3
      cubeHalfWidth = 1.5;
      const letter = cleanMove[0].toUpperCase();
      if (letter === 'R') { axis = 'x'; slabMin = 0.5; slabMax = 1.5; }
      else if (letter === 'L') { axis = 'x'; slabMin = -1.5; slabMax = -0.5; }
      else if (letter === 'U') { axis = 'y'; slabMin = 0.5; slabMax = 1.5; }
      else if (letter === 'D') { axis = 'y'; slabMin = -1.5; slabMax = -0.5; }
      else if (letter === 'F') { axis = 'z'; slabMin = 0.5; slabMax = 1.5; }
      else if (letter === 'B') { axis = 'z'; slabMin = -1.5; slabMax = -0.5; }
    }

    const slabThickness = Math.abs(slabMax - slabMin);
    const midCoord = (slabMin + slabMax) / 2;

    // Glass Belt: bounding box around the turning pieces along the axis with a +0.02 margin for 4x4
    const fullSize = cubeHalfWidth * 2;
    let sizeX = fullSize;
    let sizeY = fullSize;
    let sizeZ = fullSize;

    let posX = 0;
    let posY = 0;
    let posZ = 0;

    if (puzzleType === '4x4') {
      const margin = 0.02;
      const fullW = fullSize + 2 * margin; // 4.04
      const thick = slabThickness + 2 * margin; // 1.04 for slice/outer, 2.04 for wide
      if (axis === 'x') {
        sizeX = thick;
        sizeY = fullW;
        sizeZ = fullW;
        posX = midCoord;
      } else if (axis === 'y') {
        sizeX = fullW;
        sizeY = thick;
        sizeZ = fullW;
        posY = midCoord;
      } else {
        sizeX = fullW;
        sizeY = fullW;
        sizeZ = thick;
        posZ = midCoord;
      }
    } else {
      const scale = 1.03;
      sizeX = fullSize * scale;
      sizeY = fullSize * scale;
      sizeZ = fullSize * scale;

      if (axis === 'x') {
        sizeX = slabThickness * scale;
        posX = midCoord;
      } else if (axis === 'y') {
        sizeY = slabThickness * scale;
        posY = midCoord;
      } else {
        sizeZ = slabThickness * scale;
        posZ = midCoord;
      }
    }

    const glass = effectiveStyle === 'glass_belt'
      ? new RoundedBoxGeometry(sizeX, sizeY, sizeZ, 4, 0.08)
      : null;

    // Outline loops (for outline mode)
    const outlines: THREE.BufferGeometry[] = [];
    if (effectiveStyle === 'outline') {
      const tubeR = 0.015 * (cubeHalfWidth * 2);
      outlines.push(createBoundaryLoopGeometry(axis, slabMin, cubeHalfWidth, 0.1, tubeR));
      outlines.push(createBoundaryLoopGeometry(axis, slabMax, cubeHalfWidth, 0.1, tubeR));
    }

    return {
      glassGeom: glass,
      outlineGeoms: outlines,
      cutLineGeom: null,
      glassPosition: [posX, posY, posZ] as [number, number, number],
    };
  }, [puzzleType, move, effectiveStyle, visible]);

  if (!visible || effectiveStyle === 'off') {
    return null;
  }

  return (
    <group renderOrder={500}>
      {/* 1. Fresnel Glass Belt Shell */}
      {glassGeom && (
        <mesh
          geometry={glassGeom}
          material={glassMaterial}
          position={glassPosition}
          renderOrder={500}
        />
      )}

      {/* 2. Boundary loops (when in outline mode) */}
      {outlineGeoms.map((g, idx) => (
        <mesh key={idx} geometry={g} material={outlineMaterial} renderOrder={510} />
      ))}

      {/* 3. Pyraminx Cut-Plane bright 3px triangular line */}
      {cutLineGeom && (
        <mesh geometry={cutLineGeom} material={cutLineMaterial} renderOrder={520} />
      )}
    </group>
  );
};

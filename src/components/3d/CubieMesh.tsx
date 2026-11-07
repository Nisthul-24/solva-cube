import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CubeColor } from '../../types/puzzle';
import { CUBE_COLOR_HEX, dimColor, FaceName3x3, HighlightStrength } from './cubieModel';

export interface StickerMeshInfo {
  face: FaceName3x3;
  color: CubeColor;
  normal: [number, number, number];
  indexOnFace?: number;
}

interface CubieMeshProps {
  x: number;
  y: number;
  z: number;
  stickers: StickerMeshInfo[];
  isLayerActive: boolean;
  isSolved: boolean;
  highlightStrength?: HighlightStrength;
  showColorBlindLetters?: boolean;
  pushOffset?: [number, number, number];
  onStickerClick?: (face: FaceName3x3, stickerIndex: number) => void;
}

// Letter texture cache for web
const textureCache: Record<string, THREE.CanvasTexture> = {};

function getLetterTexture(letter: string, textColor: string): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const key = `${letter}_${textColor}`;
  if (textureCache[key]) return textureCache[key];

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
    textureCache[key] = texture;
    return texture;
  } catch (e) {
    return null;
  }
}

export const CubieMesh: React.FC<CubieMeshProps> = ({
  x,
  y,
  z,
  stickers,
  isLayerActive,
  isSolved,
  highlightStrength = 'subtle',
  showColorBlindLetters = false,
  pushOffset = [0, 0, 0],
  onStickerClick,
}) => {
  const isDimmed = !isSolved && !isLayerActive;

  const cubiePos: [number, number, number] = [
    x + (isLayerActive ? pushOffset[0] : 0),
    y + (isLayerActive ? pushOffset[1] : 0),
    z + (isLayerActive ? pushOffset[2] : 0),
  ];

  return (
    <group position={cubiePos}>
      {/* Near-black body (0.97 size) with thin dark gaps */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.97, 0.97, 0.97]} />
        <meshStandardMaterial color="#12161f" roughness={0.45} metalness={0.2} />
      </mesh>

      {/* Outer stickers */}
      {stickers.map((st, idx) => {
        const [nx, ny, nz] = st.normal;
        let pos: [number, number, number] = [0, 0, 0];
        let outlinePos: [number, number, number] = [0, 0, 0];
        let rot: [number, number, number] = [0, 0, 0];

        if (nx === 1) {
          pos = [0.489, 0, 0];
          outlinePos = [0.487, 0, 0];
          rot = [0, Math.PI / 2, 0];
        } else if (nx === -1) {
          pos = [-0.489, 0, 0];
          outlinePos = [-0.487, 0, 0];
          rot = [0, -Math.PI / 2, 0];
        } else if (ny === 1) {
          pos = [0, 0.489, 0];
          outlinePos = [0, 0.487, 0];
          rot = [-Math.PI / 2, 0, 0];
        } else if (ny === -1) {
          pos = [0, -0.489, 0];
          outlinePos = [0, -0.487, 0];
          rot = [Math.PI / 2, 0, 0];
        } else if (nz === 1) {
          pos = [0, 0, 0.489];
          outlinePos = [0, 0, 0.487];
          rot = [0, 0, 0];
        } else if (nz === -1) {
          pos = [0, 0, -0.489];
          outlinePos = [0, 0, -0.487];
          rot = [0, Math.PI, 0];
        }

        const baseHex = CUBE_COLOR_HEX[st.color] || '#FFFFFF';
        // Requirement 4: at most 22% blend toward neutral, never fade to grey
        const finalColor = dimColor(baseHex, isDimmed, highlightStrength);

        const letter = st.color ? st.color[0].toUpperCase() : '';
        const textColor = st.color === 'white' || st.color === 'yellow' ? '#0B1120' : '#FFFFFF';
        const letterTex = showColorBlindLetters ? getLetterTexture(letter, textColor) : null;

        return (
          <group key={idx}>
            {/* White outline for active layer stickers (Requirement 4) */}
            {isLayerActive && !isSolved && (
              <mesh position={outlinePos} rotation={rot}>
                <boxGeometry args={[0.87, 0.87, 0.012]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            )}

            {/* Sticker mesh */}
            <mesh
              position={pos}
              rotation={rot}
              onClick={(e) => {
                if (onStickerClick && st.indexOnFace !== undefined) {
                  e.stopPropagation();
                  onStickerClick(st.face, st.indexOnFace);
                }
              }}
            >
              <boxGeometry args={[0.84, 0.84, 0.015]} />
              <meshStandardMaterial
                color={finalColor}
                roughness={isLayerActive && !isSolved ? 0.15 : 0.28}
                metalness={0.05}
                emissive={isLayerActive && !isSolved ? finalColor : '#000000'}
                emissiveIntensity={isLayerActive && !isSolved ? 0.18 : 0}
              />
            </mesh>

            {/* Optional colour-blind letter overlay (Requirement 4) */}
            {showColorBlindLetters && letterTex && (
              <mesh position={[pos[0] * 1.002, pos[1] * 1.002, pos[2] * 1.002]} rotation={rot}>
                <planeGeometry args={[0.6, 0.6]} />
                <meshBasicMaterial map={letterTex} transparent opacity={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

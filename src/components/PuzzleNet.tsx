import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Rect, Polygon, Circle, Text as SvgText, G } from 'react-native-svg';
import { PuzzleId } from '../types/puzzle';
import { PALETTE } from './3d/cubieModel';
import { STICKER_LAYOUT_4X4, deriveColorSchemeFromCorners } from '../solvers/cube4x4/cube4x4Geometry';
import { FaceName3x3 } from './3d/cubieModel';
import { getPuzzleEngine } from '../puzzleEngine/puzzleEngine';
import { PYRAMINX_STICKERS_3D } from '../solvers/pyraminx/pyraminxGeometry';
import { FaceNamePyraminx } from '../solvers/pyraminx/pyraminxFacelets';

export interface PuzzleNetProps {
  puzzleId: PuzzleId;
  state: any;
  onStickerPress?: (face: string, stickerIdx: number) => void;
  activeFaceIndex?: { faceId: string; stickerIdx: number } | null;
  highlightMove?: string | null;
  stepPlan?: any;
  readOnly?: boolean;
  size?: 'normal' | 'mini';
}

const FACE_CONFIG_CUBE: Record<
  FaceName3x3,
  { col: number; row: number; name: string; defaultColor: string }
> = {
  U: { col: 1, row: 0, name: 'U', defaultColor: 'white' },
  L: { col: 0, row: 1, name: 'L', defaultColor: 'orange' },
  F: { col: 1, row: 1, name: 'F', defaultColor: 'green' },
  R: { col: 2, row: 1, name: 'R', defaultColor: 'red' },
  B: { col: 3, row: 1, name: 'B', defaultColor: 'blue' },
  D: { col: 1, row: 2, name: 'D', defaultColor: 'yellow' },
};

export function PuzzleNet({
  puzzleId,
  state,
  onStickerPress,
  activeFaceIndex,
  highlightMove,
  stepPlan,
  readOnly = true,
  size = 'normal',
}: PuzzleNetProps) {
  if (puzzleId === 'pyraminx') {
    return (
      <PyraminxSvgNet
        state={state}
        onStickerPress={onStickerPress}
        activeFaceIndex={activeFaceIndex}
        highlightMove={stepPlan?.emittedMove || highlightMove}
        readOnly={readOnly}
        size={size}
      />
    );
  }

  const dimension = puzzleId === '4x4' ? 4 : puzzleId === '2x2' ? 2 : 3;
  return (
    <CubeSvgNet
      dimension={dimension}
      puzzleId={puzzleId}
      state={state}
      onStickerPress={onStickerPress}
      activeFaceIndex={activeFaceIndex}
      highlightMove={highlightMove}
      stepPlan={stepPlan}
      readOnly={readOnly}
      size={size}
    />
  );
}

// -----------------------------------------------------------------------
// CUBE 2D NET VIEW (4x4, 3x3, 2x2) - STANDARD CROSS LAYOUT VIA PURE SVG
// -----------------------------------------------------------------------

interface CubeSvgNetProps {
  dimension: 2 | 3 | 4;
  puzzleId: PuzzleId;
  state: any;
  onStickerPress?: (face: string, stickerIdx: number) => void;
  activeFaceIndex?: { faceId: string; stickerIdx: number } | null;
  highlightMove?: string | null;
  stepPlan?: any;
  readOnly?: boolean;
  size?: 'normal' | 'mini';
}

function CubeSvgNet({
  dimension,
  puzzleId,
  state,
  onStickerPress,
  activeFaceIndex,
  highlightMove,
  stepPlan,
  readOnly = true,
}: CubeSvgNetProps) {
  const n = dimension;
  const cellSize = 22;
  const cellGap = 2;
  const faceGap = 6;
  const chipHeight = 14;
  const chipGap = 4;

  const faceGridWidth = n * cellSize + (n - 1) * cellGap;
  const faceGridHeight = faceGridWidth;
  const faceTotalHeight = chipHeight + chipGap + faceGridHeight;

  const totalWidth = 4 * faceGridWidth + 3 * faceGap;
  const totalHeight = 3 * faceTotalHeight + 2 * faceGap;
  const pad = 10;
  const viewBox = `-${pad} -${pad} ${totalWidth + 2 * pad} ${totalHeight + 2 * pad}`;

  // Color scheme derivation for 4x4
  const scheme = useMemo(() => {
    if (puzzleId === '4x4') {
      try {
        return deriveColorSchemeFromCorners(state).faceColors;
      } catch (e) {
        // fallback
      }
    }
    return {
      U: 'white',
      L: 'orange',
      F: 'green',
      R: 'red',
      B: 'blue',
      D: 'yellow',
    } as Record<FaceName3x3, string>;
  }, [puzzleId, state]);

  // Turning stickers lookup from puzzleEngine single source of truth (Part A item 6)
  const turningStickerSet = useMemo<Set<string>>(() => {
    const move = stepPlan?.emittedMove || highlightMove;
    if (!move) return new Set();
    const set = new Set<string>();
    try {
      const eng = getPuzzleEngine(puzzleId as any);
      const pieceSet = stepPlan?.turningPieceSet || eng.getMove(move)?.turningPieceSet;
      if (pieceSet) {
        for (const p of eng.pieces) {
          if (pieceSet.has(p.id)) {
            for (const st of p.stickers) {
              set.add(`${st.face}_${st.index}`);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return set;
  }, [stepPlan, highlightMove, puzzleId]);

  const faces: FaceName3x3[] = ['U', 'L', 'F', 'R', 'B', 'D'];

  return (
    <View style={styles.svgWrapper}>
      <Svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
      >
        {faces.map((face) => {
          const cfg = FACE_CONFIG_CUBE[face];
          const xOrigin = cfg.col * (faceGridWidth + faceGap);
          const yOrigin = cfg.row * (faceTotalHeight + faceGap);

          // Face center color
          const faceColorName = scheme[face] || cfg.defaultColor;
          const faceColorHex = (PALETTE as any)[faceColorName] || '#FFFFFF';

          // Chip position (outside grid, strictly above cells)
          const chipCenterX = xOrigin + faceGridWidth / 2;
          const chipCenterY = yOrigin + chipHeight / 2;

          // Grid origin
          const xGrid = xOrigin;
          const yGrid = yOrigin + chipHeight + chipGap;

          return (
            <G key={face}>
              {/* Outside Chip: Colored Dot + Face Name (Part A item 3) */}
              <Circle
                cx={chipCenterX - 10}
                cy={chipCenterY}
                r={4}
                fill={faceColorHex}
                stroke="#0F172A"
                strokeWidth={1}
              />
              <SvgText
                x={chipCenterX + 4}
                y={chipCenterY + 3.5}
                fontSize={10}
                fontWeight="bold"
                fill="#94A3B8"
                textAnchor="middle"
              >
                {cfg.name}
              </SvgText>

              {/* n x n Square Cells Grid (Part A item 2) */}
              {Array.from({ length: n }).map((_, r) =>
                Array.from({ length: n }).map((__, c) => {
                  const idx = r * n + c;
                  const stickerKey = `${face}_${idx}`;
                  const colorName = state?.[face]?.[idx] || faceColorName;
                  const fillColor = (PALETTE as any)[colorName] || '#334155';

                  const isTurning = turningStickerSet.has(stickerKey);
                  const isSelected =
                    activeFaceIndex?.faceId === face && activeFaceIndex?.stickerIdx === idx;

                  const cellX = xGrid + c * (cellSize + cellGap);
                  const cellY = yGrid + r * (cellSize + cellGap);

                  return (
                    <Rect
                      key={idx}
                      x={cellX}
                      y={cellY}
                      width={cellSize}
                      height={cellSize}
                      rx={2.5}
                      ry={2.5}
                      fill={fillColor}
                      stroke={isSelected ? '#F8FAFC' : isTurning ? '#22d3ee' : 'rgba(0,0,0,0.45)'}
                      strokeWidth={isSelected ? 3 : isTurning ? 2.5 : 0.8}
                      onPress={() => {
                        if (!readOnly && onStickerPress) {
                          onStickerPress(face, idx);
                        }
                      }}
                    />
                  );
                })
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// -----------------------------------------------------------------------
// PYRAMINX 2D NET VIEW (36 STICKERS) - UNFOLDED TETRAHEDRON BIG TRIANGLE SVG
// -----------------------------------------------------------------------

interface PyraminxSvgNetProps {
  state: any;
  onStickerPress?: (face: string, stickerIdx: number) => void;
  activeFaceIndex?: { faceId: string; stickerIdx: number } | null;
  highlightMove?: string | null;
  readOnly?: boolean;
  size?: 'normal' | 'mini';
}

function PyraminxSvgNet({
  state,
  onStickerPress,
  activeFaceIndex,
  highlightMove,
  readOnly = true,
}: PyraminxSvgNetProps) {
  // Four separate triangular faces with 8px gap between faces (Section 3)
  // Layout: Front face on top; Left, Bottom and Right faces below it in a row
  const W_face = 100;
  const H_face = W_face * (Math.sqrt(3) / 2); // 86.60
  const gap = 8;

  // Bottom row: L, D, R
  const xL = 16;
  const xD = xL + W_face + gap; // 124
  const xR = xD + W_face + gap; // 232
  const totalW = xR + W_face + 16; // 348

  // Top row: F centered above bottom row
  const xF = xD; // 124

  const yF = 26;
  const yBot = yF + H_face + gap; // 120.6

  const viewBox = `0 0 ${totalW} 242`;

  const faceDefs: Array<{
    id: FaceNamePyraminx;
    name: string;
    labelPos: [number, number];
    A: [number, number];
    B: [number, number];
    C: [number, number];
  }> = [
    {
      id: 'F',
      name: 'Front',
      labelPos: [xF + W_face / 2, 16],
      A: [xF + W_face / 2, yF],
      B: [xF, yF + H_face],
      C: [xF + W_face, yF + H_face],
    },
    {
      id: 'L',
      name: 'Left',
      labelPos: [xL + W_face / 2, yBot + H_face + 16],
      A: [xL + W_face / 2, yBot],
      B: [xL, yBot + H_face],
      C: [xL + W_face, yBot + H_face],
    },
    {
      id: 'D',
      name: 'Bottom',
      labelPos: [xD + W_face / 2, yBot + H_face + 16],
      A: [xD + W_face / 2, yBot],
      B: [xD, yBot + H_face],
      C: [xD + W_face, yBot + H_face],
    },
    {
      id: 'R',
      name: 'Right',
      labelPos: [xR + W_face / 2, yBot + H_face + 16],
      A: [xR + W_face / 2, yBot],
      B: [xR, yBot + H_face],
      C: [xR + W_face, yBot + H_face],
    },
  ];

  // Turning stickers set from puzzleEngine
  const turningStickerSet = useMemo<Set<string>>(() => {
    if (!highlightMove) return new Set();
    const set = new Set<string>();
    try {
      const eng = getPuzzleEngine('pyraminx');
      const m = eng.getMove(highlightMove);
      if (m) {
        for (const p of eng.pieces) {
          if (m.turningPieceSet.has(p.id)) {
            for (const st of p.stickers) {
              set.add(`${st.face}_${st.index}`);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return set;
  }, [highlightMove]);

  return (
    <View style={styles.svgWrapper}>
      <Svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
      >
        {faceDefs.map((fDef) => {
          const { id, name, labelPos, A, B, C } = fDef;
          const defaultFaceColor =
            id === 'F' ? 'green' : id === 'L' ? 'blue' : id === 'R' ? 'red' : 'yellow';
          const defaultFaceHex = (PALETTE as any)[defaultFaceColor] || '#FFFFFF';

          // 3x3 Grid of subdivision points P(i, j) = A + (i/3)*(B - A) + (j/3)*(C - A)
          const P: Array<Array<[number, number]>> = [];
          for (let i = 0; i <= 3; i++) {
            P[i] = [];
            for (let j = 0; j <= 3 - i; j++) {
              P[i][j] = [
                A[0] + (i / 3) * (B[0] - A[0]) + (j / 3) * (C[0] - A[0]),
                A[1] + (i / 3) * (B[1] - A[1]) + (j / 3) * (C[1] - A[1]),
              ];
            }
          }

          // 9 Triangles ordered row by row matching PYRAMINX_STICKERS_3D
          const triIndices: Array<[[number, number], [number, number], [number, number]]> = [
            [P[0][0], P[1][0], P[0][1]], // 0: tip A
            [P[1][0], P[2][0], P[1][1]], // 1: edge A-B
            [P[1][0], P[1][1], P[0][1]], // 2: axial A (inverted)
            [P[0][1], P[1][1], P[0][2]], // 3: edge A-C
            [P[2][0], P[3][0], P[2][1]], // 4: tip B
            [P[2][0], P[2][1], P[1][1]], // 5: axial B (inverted)
            [P[1][1], P[2][1], P[1][2]], // 6: edge B-C
            [P[1][1], P[1][2], P[0][2]], // 7: axial C (inverted)
            [P[0][2], P[1][2], P[0][3]], // 8: tip C
          ];

          return (
            <G key={id}>
              {/* Face Label Chip outside triangular face */}
              <Circle
                cx={labelPos[0] - 18}
                cy={labelPos[1]}
                r={4}
                fill={defaultFaceHex}
                stroke="#0F172A"
                strokeWidth={1}
              />
              <SvgText
                x={labelPos[0] - 8}
                y={labelPos[1] + 3.5}
                fontSize={11}
                fontWeight="bold"
                fill="#94A3B8"
                textAnchor="start"
              >
                {name}
              </SvgText>

              {/* 9 Triangular Stickers */}
              {triIndices.map((pts, idx) => {
                const stickerKey = `${id}_${idx}`;
                const rawColor = state?.[id]?.[idx] || defaultFaceColor;
                const stickerHex = (PALETTE as any)[rawColor] || '#334155';
                const isTurning = turningStickerSet.has(stickerKey);
                const isSelected =
                  activeFaceIndex?.faceId === id && activeFaceIndex?.stickerIdx === idx;

                // Centroid of the triangle
                const cenX = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
                const cenY = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;

                // Shrink slightly toward centroid (2px gap)
                const shrink = 0.92;
                const q1 = [cenX + (pts[0][0] - cenX) * shrink, cenY + (pts[0][1] - cenY) * shrink];
                const q2 = [cenX + (pts[1][0] - cenX) * shrink, cenY + (pts[1][1] - cenY) * shrink];
                const q3 = [cenX + (pts[2][0] - cenX) * shrink, cenY + (pts[2][1] - cenY) * shrink];
                const pointsStr = `${q1[0]},${q1[1]} ${q2[0]},${q2[1]} ${q3[0]},${q3[1]}`;

                return (
                  <Polygon
                    key={idx}
                    points={pointsStr}
                    fill={stickerHex}
                    stroke={isSelected ? '#F8FAFC' : isTurning ? '#22d3ee' : 'rgba(0,0,0,0.45)'}
                    strokeWidth={isSelected ? 3 : isTurning ? 2.5 : 0.8}
                    strokeLinejoin="round"
                    onPress={() => {
                      if (!readOnly && onStickerPress) {
                        onStickerPress(id, idx);
                      }
                    }}
                  />
                );
              })}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  svgWrapper: {
    width: '100%',
    aspectRatio: 1.15,
    maxHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
});

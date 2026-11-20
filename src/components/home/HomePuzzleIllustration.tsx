import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, G } from 'react-native-svg';
import { PALETTE } from '../../constants/colors';
import { HOME_THEME } from '../../constants/homeTheme';
import { PuzzleId } from '../../types/puzzle';

interface HomePuzzleIllustrationProps {
  puzzleId: PuzzleId;
}

export function HomePuzzleIllustration({ puzzleId }: HomePuzzleIllustrationProps) {
  const size = 72;
  const cx = 36;
  const cy = 36;
  const cos30 = 0.8660254;
  const sin30 = 0.5;

  // Render Cube with N x N stickers
  const renderCube = (
    n: number,
    topColors: string[][],
    leftColors: string[][],
    rightColors: string[][]
  ) => {
    const s = 34 / n; // full 72dp footprint (N * s = 34)
    const e1 = [0, s]; // straight down
    const e2 = [-s * cos30, -s * sin30]; // up-left
    const e3 = [s * cos30, -s * sin30]; // up-right

    // Gap: 1.5px total gap -> 0.75px margin on each cell side
    const delta = 0.8 / s;

    const pTop = (u: number, v: number) => [
      cx + u * e2[0] + v * e3[0],
      cy + u * e2[1] + v * e3[1],
    ];

    const pLeft = (u: number, v: number) => [
      cx + u * e1[0] + v * e2[0],
      cy + u * e1[1] + v * e2[1],
    ];

    const pRight = (u: number, v: number) => [
      cx + u * e1[0] + v * e3[0],
      cy + u * e1[1] + v * e3[1],
    ];

    // Dark-grey body perimeter
    const bodyPoints = [
      pTop(n, n), // top apex (36, 12)
      pTop(0, n), // right-top
      pRight(n, n), // right-bottom
      pRight(n, 0), // bottom apex (36, 60)
      pLeft(n, n), // left-bottom
      pLeft(0, n), // left-top
    ]
      .map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`)
      .join(' ');

    const topStickers: { pts: string; color: string }[] = [];
    const leftStickers: { pts: string; color: string }[] = [];
    const rightStickers: { pts: string; color: string }[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Top
        const t1 = pTop(i + delta, j + delta);
        const t2 = pTop(i + 1 - delta, j + delta);
        const t3 = pTop(i + 1 - delta, j + 1 - delta);
        const t4 = pTop(i + delta, j + 1 - delta);
        topStickers.push({
          pts: `${t1[0].toFixed(2)},${t1[1].toFixed(2)} ${t2[0].toFixed(2)},${t2[1].toFixed(2)} ${t3[0].toFixed(2)},${t3[1].toFixed(2)} ${t4[0].toFixed(2)},${t4[1].toFixed(2)}`,
          color: topColors[i][j],
        });

        // Left
        const l1 = pLeft(i + delta, j + delta);
        const l2 = pLeft(i + 1 - delta, j + delta);
        const l3 = pLeft(i + 1 - delta, j + 1 - delta);
        const l4 = pLeft(i + delta, j + 1 - delta);
        leftStickers.push({
          pts: `${l1[0].toFixed(2)},${l1[1].toFixed(2)} ${l2[0].toFixed(2)},${l2[1].toFixed(2)} ${l3[0].toFixed(2)},${l3[1].toFixed(2)} ${l4[0].toFixed(2)},${l4[1].toFixed(2)}`,
          color: leftColors[i][j],
        });

        // Right
        const r1 = pRight(i + delta, j + delta);
        const r2 = pRight(i + 1 - delta, j + delta);
        const r3 = pRight(i + 1 - delta, j + 1 - delta);
        const r4 = pRight(i + delta, j + 1 - delta);
        rightStickers.push({
          pts: `${r1[0].toFixed(2)},${r1[1].toFixed(2)} ${r2[0].toFixed(2)},${r2[1].toFixed(2)} ${r3[0].toFixed(2)},${r3[1].toFixed(2)} ${r4[0].toFixed(2)},${r4[1].toFixed(2)}`,
          color: rightColors[i][j],
        });
      }
    }

    return (
      <>
        {/* Dark-grey base body */}
        <Polygon
          points={bodyPoints}
          fill={HOME_THEME.darkGreyGaps}
          stroke={HOME_THEME.darkGreyGaps}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Stickers */}
        <G>
          {topStickers.map((s, idx) => (
            <Polygon key={`top-${idx}`} points={s.pts} fill={s.color} />
          ))}
          {leftStickers.map((s, idx) => (
            <Polygon key={`left-${idx}`} points={s.pts} fill={s.color} />
          ))}
          {rightStickers.map((s, idx) => (
            <Polygon key={`right-${idx}`} points={s.pts} fill={s.color} />
          ))}
        </G>
      </>
    );
  };

  // Render Pyraminx with 9 triangles per face
  const renderPyraminx = () => {
    const apex = [cx, 4];
    const centerBottom = [cx, 68];
    const leftBottom = [cx - 34 * cos30, 52];
    const rightBottom = [cx + 34 * cos30, 52];

    const bodyPoints = [apex, rightBottom, centerBottom, leftBottom]
      .map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`)
      .join(' ');

    const buildTriangles = (
      pA: number[],
      pB: number[],
      pC: number[],
      colors: string[]
    ) => {
      const getPt = (r: number, k: number) => {
        const u = r / 3;
        const v = r === 0 ? 0 : k / r;
        const start = [pA[0] + u * (pB[0] - pA[0]), pA[1] + u * (pB[1] - pA[1])];
        const end = [pA[0] + u * (pC[0] - pA[0]), pA[1] + u * (pC[1] - pA[1])];
        return [start[0] + v * (end[0] - start[0]), start[1] + v * (end[1] - start[1])];
      };

      const stickers: { pts: string; color: string }[] = [];
      let cIdx = 0;

      for (let r = 0; r < 3; r++) {
        for (let j = 0; j < 2 * r + 1; j++) {
          let v1: number[], v2: number[], v3: number[];
          if (j % 2 === 0) {
            // Pointing up
            const col = j / 2;
            v1 = getPt(r, col);
            v2 = getPt(r + 1, col);
            v3 = getPt(r + 1, col + 1);
          } else {
            // Pointing down
            const col = (j - 1) / 2;
            v1 = getPt(r, col);
            v2 = getPt(r, col + 1);
            v3 = getPt(r + 1, col + 1);
          }

          // Inset toward centroid by ~0.75px for 1.5px gap
          const cent = [
            (v1[0] + v2[0] + v3[0]) / 3,
            (v1[1] + v2[1] + v3[1]) / 3,
          ];
          const scale = 0.88; // 12% shrink produces ~1.5px gap
          const iv1 = [cent[0] + scale * (v1[0] - cent[0]), cent[1] + scale * (v1[1] - cent[1])];
          const iv2 = [cent[0] + scale * (v2[0] - cent[0]), cent[1] + scale * (v2[1] - cent[1])];
          const iv3 = [cent[0] + scale * (v3[0] - cent[0]), cent[1] + scale * (v3[1] - cent[1])];

          stickers.push({
            pts: `${iv1[0].toFixed(2)},${iv1[1].toFixed(2)} ${iv2[0].toFixed(2)},${iv2[1].toFixed(2)} ${iv3[0].toFixed(2)},${iv3[1].toFixed(2)}`,
            color: colors[cIdx % colors.length],
          });
          cIdx++;
        }
      }
      return stickers;
    };

    // Tidy scramble: mostly green on left, mostly red on right
    const leftColors = [
      PALETTE.green,
      PALETTE.green, PALETTE.yellow, PALETTE.green,
      PALETTE.green, PALETTE.green, PALETTE.blue, PALETTE.green, PALETTE.green,
    ];
    const rightColors = [
      PALETTE.red,
      PALETTE.red, PALETTE.green, PALETTE.red,
      PALETTE.yellow, PALETTE.red, PALETTE.red, PALETTE.orange, PALETTE.red,
    ];

    const leftStickers = buildTriangles(apex, leftBottom, centerBottom, leftColors);
    const rightStickers = buildTriangles(apex, centerBottom, rightBottom, rightColors);

    return (
      <>
        <Polygon
          points={bodyPoints}
          fill={HOME_THEME.darkGreyGaps}
          stroke={HOME_THEME.darkGreyGaps}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <G>
          {leftStickers.map((s, idx) => (
            <Polygon key={`pyr-left-${idx}`} points={s.pts} fill={s.color} />
          ))}
          {rightStickers.map((s, idx) => (
            <Polygon key={`pyr-right-${idx}`} points={s.pts} fill={s.color} />
          ))}
        </G>
      </>
    );
  };

  // Fixed, hand-chosen tidy patterns for cubes:
  // 3x3: mostly white top, mostly green left, mostly red right
  const top3x3 = [
    [PALETTE.white, PALETTE.white, PALETTE.white],
    [PALETTE.white, PALETTE.orange, PALETTE.white],
    [PALETTE.white, PALETTE.white, PALETTE.yellow],
  ];
  const left3x3 = [
    [PALETTE.green, PALETTE.green, PALETTE.yellow],
    [PALETTE.green, PALETTE.green, PALETTE.green],
    [PALETTE.white, PALETTE.green, PALETTE.green],
  ];
  const right3x3 = [
    [PALETTE.red, PALETTE.red, PALETTE.red],
    [PALETTE.blue, PALETTE.red, PALETTE.red],
    [PALETTE.red, PALETTE.orange, PALETTE.red],
  ];

  // 2x2
  const top2x2 = [
    [PALETTE.white, PALETTE.white],
    [PALETTE.white, PALETTE.yellow],
  ];
  const left2x2 = [
    [PALETTE.green, PALETTE.yellow],
    [PALETTE.green, PALETTE.green],
  ];
  const right2x2 = [
    [PALETTE.red, PALETTE.red],
    [PALETTE.blue, PALETTE.red],
  ];

  // 4x4
  const top4x4 = [
    [PALETTE.white, PALETTE.white, PALETTE.white, PALETTE.white],
    [PALETTE.white, PALETTE.orange, PALETTE.white, PALETTE.white],
    [PALETTE.white, PALETTE.white, PALETTE.white, PALETTE.yellow],
    [PALETTE.white, PALETTE.white, PALETTE.blue, PALETTE.white],
  ];
  const left4x4 = [
    [PALETTE.green, PALETTE.green, PALETTE.yellow, PALETTE.green],
    [PALETTE.green, PALETTE.green, PALETTE.green, PALETTE.green],
    [PALETTE.white, PALETTE.green, PALETTE.green, PALETTE.green],
    [PALETTE.green, PALETTE.orange, PALETTE.green, PALETTE.green],
  ];
  const right4x4 = [
    [PALETTE.red, PALETTE.red, PALETTE.red, PALETTE.red],
    [PALETTE.blue, PALETTE.red, PALETTE.red, PALETTE.red],
    [PALETTE.red, PALETTE.red, PALETTE.yellow, PALETTE.red],
    [PALETTE.red, PALETTE.orange, PALETTE.red, PALETTE.red],
  ];

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: HOME_THEME.tints[puzzleId] },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 72 72">
        {puzzleId === '3x3' && renderCube(3, top3x3, left3x3, right3x3)}
        {puzzleId === '2x2' && renderCube(2, top2x2, left2x2, right2x2)}
        {puzzleId === '4x4' && renderCube(4, top4x4, left4x4, right4x4)}
        {puzzleId === 'pyraminx' && renderPyraminx()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 72,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
});


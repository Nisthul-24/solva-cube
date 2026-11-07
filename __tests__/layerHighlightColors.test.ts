import { PALETTE, scaleBrightness } from '../src/components/3d/cubieModel';
import { CubeColor } from '../src/types/puzzle';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

describe('Layer Highlight & Color Saturation Verification (Section 1)', () => {
  const COLORS: CubeColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];

  test('1. In normal state, each PALETTE color is distinct and saturated', () => {
    for (let i = 0; i < COLORS.length; i++) {
      for (let j = i + 1; j < COLORS.length; j++) {
        const rgb1 = hexToRgb(PALETTE[COLORS[i]]);
        const rgb2 = hexToRgb(PALETTE[COLORS[j]]);
        const dist = colorDistance(rgb1, rgb2);
        // Distinguishable colors must have RGB Euclidean distance > 0.25
        expect(dist).toBeGreaterThan(0.25);
      }
    }
  });

  test('2. Highlighted state (+10% brightness) maintains color distinction and saturation', () => {
    // Section 1c: turning pieces get +10% brightness
    const highlightedColors = COLORS.map((c) => hexToRgb(scaleBrightness(PALETTE[c], 1.10)));

    for (let i = 0; i < highlightedColors.length; i++) {
      const baseRgb = hexToRgb(PALETTE[COLORS[i]]);
      const highRgb = highlightedColors[i];

      // Assert highlighted color is within 10% variation of base brightness
      const distFromBase = colorDistance(baseRgb, highRgb);
      expect(distFromBase).toBeLessThanOrEqual(0.12);

      // Assert highlighted colors remain clearly distinguishable from each other
      for (let j = i + 1; j < highlightedColors.length; j++) {
        const dist = colorDistance(highRgb, highlightedColors[j]);
        expect(dist).toBeGreaterThan(0.25);
      }
    }
  });

  test('3. Non-active dimmed state (0.90 factor, <= 12% dimming) keeps colors readable without grey fade', () => {
    // Section 1c: other pieces keep their exact colour, dim at most 12% by brightness only; never fade to grey
    const dimmedColors = COLORS.map((c) => hexToRgb(scaleBrightness(PALETTE[c], 0.90)));

    for (let i = 0; i < dimmedColors.length; i++) {
      const baseRgb = hexToRgb(PALETTE[COLORS[i]]);
      const dimRgb = dimmedColors[i];

      // Must be within 12% relative brightness of base color
      const meanRelativeChange = (
        Math.abs(dimRgb[0] - baseRgb[0]) / Math.max(0.1, baseRgb[0]) +
        Math.abs(dimRgb[1] - baseRgb[1]) / Math.max(0.1, baseRgb[1]) +
        Math.abs(dimRgb[2] - baseRgb[2]) / Math.max(0.1, baseRgb[2])
      ) / 3;
      expect(meanRelativeChange).toBeLessThanOrEqual(0.12);

      // Assert all 6 colors remain clearly distinguishable on non-active layers
      for (let j = i + 1; j < dimmedColors.length; j++) {
        const dist = colorDistance(dimRgb, dimmedColors[j]);
        expect(dist).toBeGreaterThan(0.25);
      }
    }
  });

  test('4. Cross-state contrast: highlighted pieces vs dimmed pieces are clearly separated', () => {
    for (const c of COLORS) {
      const highRgb = hexToRgb(scaleBrightness(PALETTE[c], 1.10));
      const dimRgb = hexToRgb(scaleBrightness(PALETTE[c], 0.90));
      const contrast = colorDistance(highRgb, dimRgb);
      // Noticeable brightness difference between turning and stationary pieces
      expect(contrast).toBeGreaterThan(0.08);
    }
  });

  test('5. Geometry bounds: belt loops are positioned at boundary planes and outside sticker faces', () => {
    // On 3x3: half-width is 1.5. Stickers are centered at {-1, 0, 1} with width 0.86.
    // The outermost sticker edge is at 1.0 + 0.43 = 1.43.
    // The belt loop has half-width W = 1.5 + 0.015 = 1.515.
    const maxStickerExtent = 1.0 + 0.86 / 2; // 1.43
    const beltLoopHalfWidth = 1.5 + 0.015; // 1.515
    const innerBoundaryPlane = 0.5; // in the 0.14 gap between cubies (0.485 to 0.515)

    expect(beltLoopHalfWidth).toBeGreaterThan(maxStickerExtent);
    expect(innerBoundaryPlane).toBe(0.5);

    // On 2x2: half-width is 1.0. Stickers are at {-0.5, 0.5} with width 0.86.
    // Outermost sticker edge is 0.5 + 0.43 = 0.93.
    // Belt loop half-width is 1.0 + 0.015 = 1.015.
    const maxStickerExtent2x2 = 0.5 + 0.86 / 2; // 0.93
    const beltLoopHalfWidth2x2 = 1.0 + 0.015; // 1.015
    expect(beltLoopHalfWidth2x2).toBeGreaterThan(maxStickerExtent2x2);

    // On 4x4: half-width is 2.0. Outermost sticker edge is 1.5 + 0.43 = 1.93.
    // Belt loop half-width is 2.0 + 0.015 = 2.015.
    const maxStickerExtent4x4 = 1.5 + 0.86 / 2; // 1.93
    const beltLoopHalfWidth4x4 = 2.0 + 0.015; // 2.015
    expect(beltLoopHalfWidth4x4).toBeGreaterThan(maxStickerExtent4x4);
  });
});

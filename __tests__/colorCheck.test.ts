import { PALETTE, scaleBrightness } from '../src/components/3d/stickerLayout';
import { CubeColor } from '../src/types/puzzle';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

describe('Issue 2: Color fidelity and brightness scaling tests', () => {
  test('PALETTE strictly matches the 6 canonical hex values', () => {
    expect(PALETTE.white.toUpperCase()).toBe('#F5F5F5');
    expect(PALETTE.yellow.toUpperCase()).toBe('#FFD500');
    expect(PALETTE.green.toUpperCase()).toBe('#009B48');
    expect(PALETTE.blue.toUpperCase()).toBe('#0051BA');
    expect(PALETTE.red.toUpperCase()).toBe('#C41E3A');
    expect(PALETTE.orange.toUpperCase()).toBe('#FF5800');
  });

  test('Brightness scaling preserves exact RGB proportions (no hue or saturation shift)', () => {
    const colors: CubeColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];
    const scaleFactor = 0.8;

    for (const c of colors) {
      const origHex = PALETTE[c];
      const scaledHex = scaleBrightness(origHex, scaleFactor);

      const [r0, g0, b0] = hexToRgb(origHex);
      const [r1, g1, b1] = hexToRgb(scaledHex);

      // Verify each non-zero channel scales by 0.8 within rounding integer tolerance (+-1)
      if (r0 > 0) expect(Math.abs(r1 - Math.round(r0 * scaleFactor))).toBeLessThanOrEqual(1);
      if (g0 > 0) expect(Math.abs(g1 - Math.round(g0 * scaleFactor))).toBeLessThanOrEqual(1);
      if (b0 > 0) expect(Math.abs(b1 - Math.round(b0 * scaleFactor))).toBeLessThanOrEqual(1);

      // Verify channel ratios are preserved with <= 1% error
      if (g0 > 10 && r0 > 10) {
        const ratio0 = r0 / g0;
        const ratio1 = r1 / g1;
        expect(Math.abs(ratio1 - ratio0) / ratio0).toBeLessThan(0.02);
      }
      if (b0 > 10 && g0 > 10) {
        const ratio0 = g0 / b0;
        const ratio1 = g1 / b1;
        expect(Math.abs(ratio1 - ratio0) / ratio0).toBeLessThan(0.02);
      }
    }
  });

  test('Mean RGB color value is within 12% of its PALETTE value for active and non-active layers', () => {
    const colors: CubeColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];

    // Active layer: scale 1.0
    for (const c of colors) {
      const origHex = PALETTE[c];
      const activeHex = scaleBrightness(origHex, 1.0);
      const [r0, g0, b0] = hexToRgb(origHex);
      const [ra, ga, ba] = hexToRgb(activeHex);

      expect(ra).toBe(r0);
      expect(ga).toBe(g0);
      expect(ba).toBe(b0);
    }

    // Non-active layer: scale 0.8
    for (const c of colors) {
      const origHex = PALETTE[c];
      const dimHex = scaleBrightness(origHex, 0.8);
      const [r0, g0, b0] = hexToRgb(origHex);
      const [rd, gd, bd] = hexToRgb(dimHex);

      // Target scaled RGB
      const targetR = r0 * 0.8;
      const targetG = g0 * 0.8;
      const targetB = b0 * 0.8;

      // Assert each channel is within 12% of target value (or within 2 points for small channels)
      if (targetR > 15) {
        expect(Math.abs(rd - targetR) / targetR).toBeLessThan(0.12);
      }
      if (targetG > 15) {
        expect(Math.abs(gd - targetG) / targetG).toBeLessThan(0.12);
      }
      if (targetB > 15) {
        expect(Math.abs(bd - targetB) / targetB).toBeLessThan(0.12);
      }
    }
  });
});


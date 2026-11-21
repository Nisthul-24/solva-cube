import fs from 'fs';
import path from 'path';

function getPngDimensions(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) {
    throw new Error(`File ${filePath} is too small to be a valid PNG`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe('PART 4: Assets exist and meet minimum dimension requirements', () => {
  const assetsDir = path.resolve(__dirname, '..', 'assets');

  test('icon.png exists and is >= 512x512', () => {
    const iconPath = path.join(assetsDir, 'icon.png');
    expect(fs.existsSync(iconPath)).toBe(true);

    const { width, height } = getPngDimensions(iconPath);
    expect(width).toBeGreaterThanOrEqual(512);
    expect(height).toBeGreaterThanOrEqual(512);
  });

  test('adaptive-icon.png exists and is >= 512x512', () => {
    const adaptivePath = path.join(assetsDir, 'adaptive-icon.png');
    expect(fs.existsSync(adaptivePath)).toBe(true);

    const { width, height } = getPngDimensions(adaptivePath);
    expect(width).toBeGreaterThanOrEqual(512);
    expect(height).toBeGreaterThanOrEqual(512);
  });

  test('splash.png (or splash-icon.png) exists and is >= 1024x1024', () => {
    const splashPath = path.join(assetsDir, 'splash.png');
    const splashIconPath = path.join(assetsDir, 'splash-icon.png');
    const targetPath = fs.existsSync(splashPath) ? splashPath : splashIconPath;
    expect(fs.existsSync(targetPath)).toBe(true);

    const { width, height } = getPngDimensions(targetPath);
    expect(width).toBeGreaterThanOrEqual(1024);
    expect(height).toBeGreaterThanOrEqual(1024);
  });

  test('favicon.png exists', () => {
    const faviconPath = path.join(assetsDir, 'favicon.png');
    expect(fs.existsSync(faviconPath)).toBe(true);
  });
});

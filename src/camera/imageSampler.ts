import jpeg from 'jpeg-js';
import {
  RGBColor,
  filterPatchPixels,
  classifyStickerPatch,
  StickerDetectionResult,
} from './colorClassifier';

export interface DecodedImage {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray; // RGBA
}

export interface CropBox {
  cropX: number;
  cropY: number;
  cropSize: number;
}

/**
 * Pure-JS JPEG decoder (BSD-3-Clause)
 */
export function decodeJpeg(jpegData: Uint8Array): DecodedImage {
  const raw = jpeg.decode(jpegData, { useTArray: true });
  return {
    width: raw.width,
    height: raw.height,
    data: raw.data,
  };
}

/**
 * Rule 2b & 2c:
 * Compute the square region in native video pixel coordinates that exactly matches
 * the centered 85% on-screen grid overlay under objectFit: 'cover'.
 */
export function computeVideoCropBox(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  gridCoverageFraction = 0.85
): CropBox {
  if (videoWidth <= 0 || videoHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    const defaultSize = Math.min(videoWidth || 100, videoHeight || 100);
    return {
      cropX: Math.max(0, Math.round(((videoWidth || 100) - defaultSize) / 2)),
      cropY: Math.max(0, Math.round(((videoHeight || 100) - defaultSize) / 2)),
      cropSize: defaultSize,
    };
  }

  // Uniform scale factor for objectFit: 'cover'
  const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;

  // Cropped margins overflowing the container
  const overflowX = (renderedWidth - containerWidth) / 2;
  const overflowY = (renderedHeight - containerHeight) / 2;

  // On-screen grid overlay
  const onScreenGridSize = Math.round(Math.min(containerWidth * gridCoverageFraction, containerHeight * gridCoverageFraction));
  const onScreenGridLeft = (containerWidth - onScreenGridSize) / 2;
  const onScreenGridTop = (containerHeight - onScreenGridSize) / 2;

  // Map on-screen coordinates to rendered video, then divide by scale to get native video coordinates
  const renderedGridX = onScreenGridLeft + overflowX;
  const renderedGridY = onScreenGridTop + overflowY;

  let cropX = Math.round(renderedGridX / scale);
  let cropY = Math.round(renderedGridY / scale);
  let cropSize = Math.round(onScreenGridSize / scale);

  // Bounds enforcement
  cropSize = Math.min(cropSize, Math.min(videoWidth, videoHeight));
  cropX = Math.max(0, Math.min(videoWidth - cropSize, cropX));
  cropY = Math.max(0, Math.min(videoHeight - cropSize, cropY));

  return {
    cropX,
    cropY,
    cropSize,
  };
}

/**
 * Samples an n x n sticker grid from image pixel data.
 * Rule 2d: central 40% patch per cell, median RGB, specular highlight rejection.
 * Orientation: Row 0 is Top (Left to Right), Row n-1 is Bottom (Left to Right).
 * Unmirrored orientation matches standard physical cube facelet order.
 */
export function sampleGridFromImageData(
  image: DecodedImage,
  cropBox: CropBox,
  dimension: 2 | 3 | 4,
  whitePointRef?: RGBColor
): StickerDetectionResult[] {
  const { width: imgW, height: imgH, data } = image;
  const { cropX, cropY, cropSize } = cropBox;

  const cellSize = cropSize / dimension;
  const patchRgbs: RGBColor[] = [];

  // Pass 1: Extract filtered median RGB for each cell
  for (let r = 0; r < dimension; r++) {
    for (let c = 0; c < dimension; c++) {
      // Cell center in video pixel coordinates
      const centerX = cropX + (c + 0.5) * cellSize;
      const centerY = cropY + (r + 0.5) * cellSize;

      // Central 40% patch (radius = cellSize * 0.20, total width/height = cellSize * 0.40)
      const patchRadiusX = Math.max(2, Math.round(cellSize * 0.20));
      const patchRadiusY = Math.max(2, Math.round(cellSize * 0.20));

      const patchPixels: RGBColor[] = [];
      const step = Math.max(1, Math.round(cellSize / 20));

      for (let dy = -patchRadiusY; dy <= patchRadiusY; dy += step) {
        for (let dx = -patchRadiusX; dx <= patchRadiusX; dx += step) {
          const px = Math.min(imgW - 1, Math.max(0, Math.round(centerX + dx)));
          const py = Math.min(imgH - 1, Math.max(0, Math.round(centerY + dy)));
          const offset = (py * imgW + px) * 4;

          patchPixels.push({
            r: data[offset],
            g: data[offset + 1],
            b: data[offset + 2],
          });
        }
      }

      const filtered = filterPatchPixels(patchPixels);
      patchRgbs.push(filtered);
    }
  }

  // Determine effective white point (Rule 2d: white centre when known or white sticker on face)
  let effectiveWhitePoint = whitePointRef;
  if (!effectiveWhitePoint) {
    const whiteCandidates = patchRgbs
      .map((p, idx) => {
        const isWhite = p.r > 120 && p.g > 110 && p.b > 80 && Math.abs(p.r - p.b) < 90;
        const score = p.r + p.g + p.b - Math.abs(p.r - p.b) * 2;
        return { p, idx, score, isWhite };
      })
      .filter((c) => c.isWhite)
      .sort((a, b) => b.score - a.score);

    if (whiteCandidates.length > 0) {
      effectiveWhitePoint = whiteCandidates[0].p;
    }
  }

  // Pass 2: Classify using normalized lighting
  return patchRgbs.map((rgb) => classifyStickerPatch(rgb, effectiveWhitePoint));
}

/**
 * Backward compatibility alias for sampleStickerGridFromImage
 */
export function sampleStickerGridFromImage(
  image: DecodedImage,
  dimension: 2 | 3 | 4,
  cropBox = { x: 0.15, y: 0.15, width: 0.70, height: 0.70 }
): StickerDetectionResult[] {
  const nativeCrop: CropBox = {
    cropX: Math.round(cropBox.x * image.width),
    cropY: Math.round(cropBox.y * image.height),
    cropSize: Math.round(Math.min(cropBox.width * image.width, cropBox.height * image.height)),
  };
  return sampleGridFromImageData(image, nativeCrop, dimension);
}

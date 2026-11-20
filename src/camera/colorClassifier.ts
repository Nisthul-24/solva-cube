import { CubeColor } from '../types/puzzle';

export { CubeColor };

export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface LabColor {
  L: number; // 0-100
  a: number; // -128 to 127
  b: number; // -128 to 127
}

export interface StickerDetectionResult {
  color: CubeColor | 'unknown';
  confidence: number; // 0.0 to 1.0
  isAmbiguous: boolean;
  rawRgb: RGBColor;
  lab: LabColor;
  distances: Record<CubeColor, number>;
}

export interface FaceDetectionResult {
  dimension: 2 | 3 | 4;
  stickers: StickerDetectionResult[];
  overallConfidence: number;
  hasAmbiguousStickers: boolean;
}

// Convert sRGB to CIELAB with optional chromatic adaptation for ambient white point
export function rgbToLab(rgb: RGBColor, whitePoint?: RGBColor): LabColor {
  // 1. Linearize sRGB
  const rLin = rgb.r / 255;
  const gLin = rgb.g / 255;
  const bLin = rgb.b / 255;

  const r = rLin > 0.04045 ? Math.pow((rLin + 0.055) / 1.055, 2.4) : rLin / 12.92;
  const g = gLin > 0.04045 ? Math.pow((gLin + 0.055) / 1.055, 2.4) : gLin / 12.92;
  const b = bLin > 0.04045 ? Math.pow((bLin + 0.055) / 1.055, 2.4) : bLin / 12.92;

  // 2. Observer = 2°, convert to XYZ
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
  const Y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

  // D65 reference white default
  let Xn = 95.047;
  let Yn = 100.0;
  let Zn = 108.883;

  // If a measured white point is provided (e.g. from White center under warm room light):
  // Perform Von Kries / CIELAB reference white chromatic adaptation
  if (whitePoint && (whitePoint.r > 60 || whitePoint.g > 60 || whitePoint.b > 60)) {
    const clR = Math.max(0, Math.min(255, whitePoint.r));
    const clG = Math.max(0, Math.min(255, whitePoint.g));
    const clB = Math.max(0, Math.min(255, whitePoint.b));
    const wpRLin = clR / 255;
    const wpGLin = clG / 255;
    const wpBLin = clB / 255;
    const wpR = wpRLin > 0.04045 ? Math.pow((wpRLin + 0.055) / 1.055, 2.4) : wpRLin / 12.92;
    const wpG = wpGLin > 0.04045 ? Math.pow((wpGLin + 0.055) / 1.055, 2.4) : wpGLin / 12.92;
    const wpB = wpBLin > 0.04045 ? Math.pow((wpBLin + 0.055) / 1.055, 2.4) : wpBLin / 12.92;

    const rawXn = (wpR * 0.4124 + wpG * 0.3576 + wpB * 0.1805) * 100;
    const rawYn = (wpR * 0.2126 + wpG * 0.7152 + wpB * 0.0722) * 100;
    const rawZn = (wpR * 0.0193 + wpG * 0.1192 + wpB * 0.9505) * 100;

    if (rawYn > 1) {
      Xn = (rawXn / rawYn) * 100;
      Yn = 100.0;
      Zn = (rawZn / rawYn) * 100;
    }
  }

  const fx = X / Xn > 0.008856 ? Math.cbrt(X / Xn) : (7.787 * (X / Xn)) + 16 / 116;
  const fy = Y / Yn > 0.008856 ? Math.cbrt(Y / Yn) : (7.787 * (Y / Yn)) + 16 / 116;
  const fz = Z / Zn > 0.008856 ? Math.cbrt(Z / Zn) : (7.787 * (Z / Zn)) + 16 / 116;

  const L = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return { L, a, b: bVal };
}

// CIEDE2000 color difference formula for perceptual accuracy
export function deltaE2000(lab1: LabColor, lab2: LabColor): number {
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const C1 = Math.hypot(lab1.a, lab1.b);
  const C2 = Math.hypot(lab2.a, lab2.b);
  const Cbar = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));

  const a1Prime = lab1.a * (1 + G);
  const a2Prime = lab2.a * (1 + G);

  const C1Prime = Math.hypot(a1Prime, lab1.b);
  const C2Prime = Math.hypot(a2Prime, lab2.b);

  const h1Prime = (Math.atan2(lab1.b, a1Prime) * 180) / Math.PI;
  const h2Prime = (Math.atan2(lab2.b, a2Prime) * 180) / Math.PI;

  const h1 = h1Prime >= 0 ? h1Prime : h1Prime + 360;
  const h2 = h2Prime >= 0 ? h2Prime : h2Prime + 360;

  const deltaLPrime = lab2.L - lab1.L;
  const deltaCPrime = C2Prime - C1Prime;

  let deltahPrime: number;
  if (C1Prime * C2Prime === 0) {
    deltahPrime = 0;
  } else if (Math.abs(h2 - h1) <= 180) {
    deltahPrime = h2 - h1;
  } else if (h2 - h1 > 180) {
    deltahPrime = h2 - h1 - 360;
  } else {
    deltahPrime = h2 - h1 + 360;
  }

  const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(((deltahPrime / 2) * Math.PI) / 180);

  const LbarPrime = (lab1.L + lab2.L) / 2;
  const CbarPrime = (C1Prime + C2Prime) / 2;

  let HbarPrime: number;
  if (C1Prime * C2Prime === 0) {
    HbarPrime = h1 + h2;
  } else if (Math.abs(h1 - h2) <= 180) {
    HbarPrime = (h1 + h2) / 2;
  } else if (h1 + h2 < 360) {
    HbarPrime = (h1 + h2 + 360) / 2;
  } else {
    HbarPrime = (h1 + h2 - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(((HbarPrime - 30) * Math.PI) / 180) +
    0.24 * Math.cos(((2 * HbarPrime) * Math.PI) / 180) +
    0.32 * Math.cos(((3 * HbarPrime + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * HbarPrime - 63) * Math.PI) / 180);

  const deltaTheta = 30 * Math.exp(-Math.pow((HbarPrime - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(CbarPrime, 7) / (Math.pow(CbarPrime, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(LbarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LbarPrime - 50, 2));
  const SC = 1 + 0.045 * CbarPrime;
  const SH = 1 + 0.015 * CbarPrime * T;
  const RT = -Math.sin(((2 * deltaTheta) * Math.PI) / 180) * RC;

  return Math.sqrt(
    Math.pow(deltaLPrime / (kL * SL), 2) +
      Math.pow(deltaCPrime / (kC * SC), 2) +
      Math.pow(deltaHPrime / (kH * SH), 2) +
      RT * (deltaCPrime / (kC * SC)) * (deltaHPrime / (kH * SH))
  );
}

// Calibrated reference plastic centroids in standard illuminant
export const REFERENCE_PALETTE: Record<CubeColor, LabColor> = {
  white: { L: 94.0, a: -0.5, b: 2.0 },
  yellow: { L: 86.0, a: -8.0, b: 78.0 },
  green: { L: 58.0, a: -52.0, b: 35.0 },
  blue: { L: 38.0, a: 5.0, b: -45.0 },
  red: { L: 46.0, a: 62.0, b: 38.0 },
  orange: { L: 62.0, a: 45.0, b: 58.0 },
};

export const CUBE_COLORS: CubeColor[] = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];

/**
 * Filter out specular glare and noise from a sample of pixels on a sticker.
 * Discards extreme specular highlights where intensity is very high and saturation is washed out.
 */
export function filterPatchPixels(pixels: RGBColor[]): RGBColor {
  if (pixels.length === 0) return { r: 128, g: 128, b: 128 };
  if (pixels.length === 1) return pixels[0];

  // Discard pixels where R, G, and B are all > 235 with chroma < 12 (pure specular reflection)
  const valid = pixels.filter((p) => {
    const isPureSpecular =
      p.r > 235 && p.g > 235 && p.b > 235 && Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b) < 12;
    return !isPureSpecular;
  });

  const targetPool = valid.length > 0 ? valid : pixels;

  // Trimmed median per channel
  const rs = targetPool.map((p) => p.r).sort((a, b) => a - b);
  const gs = targetPool.map((p) => p.g).sort((a, b) => a - b);
  const bs = targetPool.map((p) => p.b).sort((a, b) => a - b);

  const mid = Math.floor(rs.length / 2);
  return {
    r: rs[mid],
    g: gs[mid],
    b: bs[mid],
  };
}

/**
 * Classify a single sticker patch from its RGB value into one of the 6 cube colors.
 * Returns confidence score and ambiguity flag.
 */
export function classifyStickerPatch(
  rgb: RGBColor,
  whitePointRef?: RGBColor
): StickerDetectionResult {
  // Check for totally invalid / black pixels
  if (rgb.r < 8 && rgb.g < 8 && rgb.b < 8) {
    return {
      color: 'unknown',
      confidence: 0,
      isAmbiguous: true,
      rawRgb: rgb,
      lab: { L: 0, a: 0, b: 0 },
      distances: {
        white: 100,
        yellow: 100,
        green: 100,
        blue: 100,
        red: 100,
        orange: 100,
      },
    };
  }

  const lab = rgbToLab(rgb, whitePointRef);

  const distMap: Record<CubeColor, number> = {} as any;

  // Calculate deltaE distance to all 6 reference colors
  const distances: Array<{ color: CubeColor; dist: number }> = CUBE_COLORS.map((color) => {
    const ref = REFERENCE_PALETTE[color];
    let dist = deltaE2000(lab, ref);

    // Heuristic boundary refinement for orange vs red & white vs yellow
    const chroma = Math.hypot(lab.a, lab.b);

    // White: low chroma (grey/neutral) and high L
    if (color === 'white') {
      if (chroma > 22) dist += (chroma - 22) * 2.5;
      if (lab.L < 50) dist += (50 - lab.L) * 1.5;
    }
    // Yellow: high positive b, relatively low/negative a
    if (color === 'yellow') {
      if (lab.b < 20) dist += (20 - lab.b) * 2.0;
      if (lab.a > 15) dist += (lab.a - 15) * 1.5;
    }
    // Blue: negative b
    if (color === 'blue') {
      if (lab.b > 0) dist += lab.b * 2.0;
    }
    // Green: negative a
    if (color === 'green') {
      if (lab.a > -10) dist += (lab.a + 10) * 2.0;
    }
    // Red vs Orange: Red has high a with moderate b; Orange has high a AND high b (substantial green reflectance)
    if (color === 'red') {
      if (lab.b > 48) dist += (lab.b - 48) * 1.5;
      if (rgb.g > 48 && rgb.g / (rgb.r || 1) > 0.24) dist += 18;
      if (lab.a < 20) dist += (20 - lab.a) * 2.0;
    }
    if (color === 'orange') {
      if (lab.b < 28) dist += (28 - lab.b) * 2.0;
      if (rgb.g < 32 && rgb.g / (rgb.r || 1) < 0.15) dist += 20;
    }

    distMap[color] = Math.round(dist * 10) / 10;
    return { color, dist };
  });

  distances.sort((a, b) => a.dist - b.dist);

  const best = distances[0];
  const second = distances[1];

  // Confidence formula based on relative separation to second closest color
  const separation = second.dist - best.dist;
  const rawConfidence = Math.min(1.0, Math.max(0.0, separation / (best.dist + 12)));
  const confidence = Math.round(rawConfidence * 100) / 100;

  // Glare detection: if patch has extremely high intensity and low chroma, mark ambiguous
  const chroma = Math.hypot(lab.a, lab.b);
  const isSevereGlare = lab.L > 93 && chroma < 12 && rgb.r > 240 && rgb.g > 240 && rgb.b > 240;

  const isAmbiguous = isSevereGlare || confidence < 0.40 || best.dist > 32;

  return {
    color: best.color,
    confidence: isSevereGlare ? 0.35 : confidence,
    isAmbiguous,
    rawRgb: rgb,
    lab,
    distances: distMap,
  };
}

/**
 * Balanced Global Assignment across all 6 faces (or n^2 stickers per color).
 * Solves the assignment problem to enforce exact color quotas (9 of each for 3x3, 16 for 4x4, 4 for 2x2).
 */
export function balancedCubeAssignment(
  stickers: StickerDetectionResult[],
  dimension: 2 | 3 | 4
): CubeColor[] {
  const expectedPerColor = dimension * dimension;
  const totalStickers = expectedPerColor * 6;
  if (stickers.length !== totalStickers) {
    // Fallback to unconstrained classification if not full cube
    return stickers.map((s) => (s.color === 'unknown' ? 'white' : s.color));
  }

  // Cost matrix: stickers (rows) x 6 colors (columns)
  const costMatrix: number[][] = stickers.map((s) => {
    return CUBE_COLORS.map((c) => {
      const ref = REFERENCE_PALETTE[c];
      return deltaE2000(s.lab, ref);
    });
  });

  // Solve bipartite matching with greedy + 2-opt descent for guaranteed fast convergence
  const assignment: number[] = new Array(totalStickers).fill(-1);
  const colorCounts: Record<CubeColor, number> = {
    white: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    red: 0,
    orange: 0,
  };

  // 1. Initial greedy assignment sorted by best-to-second margin
  const stickerOrder = stickers
    .map((s, idx) => {
      const costs = CUBE_COLORS.map((c) => deltaE2000(s.lab, REFERENCE_PALETTE[c])).sort((a, b) => a - b);
      return { idx, margin: costs[1] - costs[0] };
    })
    .sort((a, b) => b.margin - a.margin);

  for (const item of stickerOrder) {
    const idx = item.idx;
    const sortedColors = CUBE_COLORS.map((c, colIdx) => ({
      color: c,
      colIdx,
      cost: costMatrix[idx][colIdx],
    })).sort((a, b) => a.cost - b.cost);

    let assigned = false;
    for (const cand of sortedColors) {
      if (colorCounts[cand.color] < expectedPerColor) {
        assignment[idx] = cand.colIdx;
        colorCounts[cand.color]++;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      assignment[idx] = sortedColors[0].colIdx;
      colorCounts[sortedColors[0].color]++;
    }
  }

  // 2. 2-opt swap passes to minimize total deltaE
  for (let pass = 0; pass < 5; pass++) {
    let improved = false;
    for (let i = 0; i < totalStickers; i++) {
      for (let j = i + 1; j < totalStickers; j++) {
        const cI = assignment[i];
        const cJ = assignment[j];
        if (cI === cJ) continue;

        const currentCost = costMatrix[i][cI] + costMatrix[j][cJ];
        const swappedCost = costMatrix[i][cJ] + costMatrix[j][cI];

        if (swappedCost + 0.05 < currentCost) {
          assignment[i] = cJ;
          assignment[j] = cI;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return assignment.map((cIdx) => CUBE_COLORS[cIdx]);
}

export interface JointAssignmentResult {
  faces: Record<string, CubeColor[]>;
  changedStickers: Array<{ face: string; index: number; provisional: CubeColor; assigned: CubeColor }>;
  counts: Record<CubeColor, number>;
  isValid: boolean;
  issueDescription?: string;
}

/**
 * Requirement 2e: Joint assignment over all 54 cells of a 3x3:
 * The 6 centre cells define 6 distinct clusters (U=white, F=green, R=red, B=blue, L=orange, D=yellow).
 * Assigns the other 48 cells with the constraint of exactly 8 per colour (minimum-cost assignment).
 * Compares with the provisional result and marks any cell that changed as low-confidence.
 */
export function jointCubeAssignment(
  scannedFaces: Record<string, StickerDetectionResult[]>,
  dimension: 2 | 3 | 4 = 3
): JointAssignmentResult {
  const FACE_KEYS = ['U', 'F', 'R', 'B', 'L', 'D'];
  const expectedPerColor = dimension * dimension;

  // Fallback for non-3x3 or incomplete scan
  if (dimension !== 3 || FACE_KEYS.some((f) => !scannedFaces[f] || scannedFaces[f].length !== 9)) {
    const allStickers: StickerDetectionResult[] = [];
    for (const f of FACE_KEYS) {
      if (scannedFaces[f]) allStickers.push(...scannedFaces[f]);
    }
    const assigned = balancedCubeAssignment(allStickers, dimension);
    const faces: Record<string, CubeColor[]> = {};
    let cursor = 0;
    const counts: Record<CubeColor, number> = { white: 0, yellow: 0, green: 0, blue: 0, red: 0, orange: 0 };
    for (const f of FACE_KEYS) {
      if (scannedFaces[f]) {
        faces[f] = assigned.slice(cursor, cursor + scannedFaces[f].length);
        faces[f].forEach((c) => counts[c]++);
        cursor += scannedFaces[f].length;
      }
    }
    return {
      faces,
      changedStickers: [],
      counts,
      isValid: CUBE_COLORS.every((c) => counts[c] === expectedPerColor),
    };
  }

  // 3x3 Specialized Joint Assignment:
  // 1. Centers: U=white, F=green, R=red, B=blue, L=orange, D=yellow (fixed)
  const centerColors: Record<string, CubeColor> = {
    U: 'white',
    F: 'green',
    R: 'red',
    B: 'blue',
    L: 'orange',
    D: 'yellow',
  };

  const assignedFaces: Record<string, CubeColor[]> = {};
  const changedStickers: Array<{ face: string; index: number; provisional: CubeColor; assigned: CubeColor }> = [];

  interface NonCenterItem {
    face: string;
    index: number;
    detection: StickerDetectionResult;
  }
  const nonCenters: NonCenterItem[] = [];

  for (const face of FACE_KEYS) {
    assignedFaces[face] = new Array(9);
    // Center cell (index 4) locked to canonical face center
    assignedFaces[face][4] = centerColors[face];

    for (let i = 0; i < 9; i++) {
      if (i === 4) continue;
      nonCenters.push({
        face,
        index: i,
        detection: scannedFaces[face][i],
      });
    }
  }

  // Cost matrix: 48 non-centers x 6 colors
  const costMatrix: number[][] = nonCenters.map((item) => {
    return CUBE_COLORS.map((c) => {
      const ref = REFERENCE_PALETTE[c];
      return deltaE2000(item.detection.lab, ref);
    });
  });

  const quotaPerColor = 8;
  const assignment: number[] = new Array(48).fill(-1);
  const colorCounts: Record<CubeColor, number> = {
    white: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    red: 0,
    orange: 0,
  };

  // Greedy match
  const sortedStickers = nonCenters
    .map((item, idx) => {
      const costs = CUBE_COLORS.map((c) => deltaE2000(item.detection.lab, REFERENCE_PALETTE[c])).sort((a, b) => a - b);
      return { idx, margin: costs[1] - costs[0] };
    })
    .sort((a, b) => b.margin - a.margin);

  for (const s of sortedStickers) {
    const idx = s.idx;
    const sortedCand = CUBE_COLORS.map((c, colIdx) => ({
      color: c,
      colIdx,
      cost: costMatrix[idx][colIdx],
    })).sort((a, b) => a.cost - b.cost);

    let assigned = false;
    for (const cand of sortedCand) {
      if (colorCounts[cand.color] < quotaPerColor) {
        assignment[idx] = cand.colIdx;
        colorCounts[cand.color]++;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      assignment[idx] = sortedCand[0].colIdx;
      colorCounts[sortedCand[0].color]++;
    }
  }

  // 2-opt descent
  for (let pass = 0; pass < 8; pass++) {
    let improved = false;
    for (let i = 0; i < 48; i++) {
      for (let j = i + 1; j < 48; j++) {
        const cI = assignment[i];
        const cJ = assignment[j];
        if (cI === cJ) continue;

        const currentCost = costMatrix[i][cI] + costMatrix[j][cJ];
        const swappedCost = costMatrix[i][cJ] + costMatrix[j][cI];

        if (swappedCost + 0.05 < currentCost) {
          assignment[i] = cJ;
          assignment[j] = cI;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  // Update faces and flag discrepancies
  nonCenters.forEach((item, idx) => {
    const assignedCol = CUBE_COLORS[assignment[idx]];
    assignedFaces[item.face][item.index] = assignedCol;

    const provisionalColor = item.detection.color === 'unknown' ? 'white' : item.detection.color;
    if (assignedCol !== provisionalColor) {
      changedStickers.push({
        face: item.face,
        index: item.index,
        provisional: provisionalColor,
        assigned: assignedCol,
      });
      item.detection.isAmbiguous = true;
      item.detection.confidence = Math.min(item.detection.confidence, 0.3);
    }
  });

  const totalCounts: Record<CubeColor, number> = {
    white: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    red: 0,
    orange: 0,
  };
  for (const f of FACE_KEYS) {
    for (const col of assignedFaces[f]) {
      totalCounts[col] = (totalCounts[col] || 0) + 1;
    }
  }

  const isValid = CUBE_COLORS.every((c) => totalCounts[c] === 9);

  return {
    faces: assignedFaces,
    changedStickers,
    counts: totalCounts,
    isValid,
  };
}

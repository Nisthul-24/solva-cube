import { FaceName3x3, Axis } from '../../components/3d/cubieModel';
import { CubeColor } from '../../types/puzzle';
import { Cube4x4State, TurnInfo4x4 } from './cube4x4Types';
export { Cube4x4State, TurnInfo4x4 };

export const ALL_54_4X4_MOVES: string[] = [];
for (const base of ['U', 'D', 'L', 'R', 'F', 'B', 'Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw', 'u', 'd', 'l', 'r', 'f', 'b']) {
  for (const suf of ['', "'", '2']) {
    ALL_54_4X4_MOVES.push(`${base}${suf}`);
  }
}

export interface Sticker4x4Layout {
  face: FaceName3x3;
  index: number;
  center: [number, number, number];
  normal: [number, number, number];
  cubieCoord: [number, number, number];
}

export const CUBE4X4_FACES: FaceName3x3[] = ['U', 'R', 'F', 'D', 'L', 'B'];

/**
 * 96 outer stickers for the 4x4 Revenge cube
 * Coordinates are at +/-0.5 and +/-1.5 per axis.
 * Face plane is at +/-2.0 (sticker surface).
 */
export function generate4x4StickerLayout(): Sticker4x4Layout[] {
  const layout: Sticker4x4Layout[] = [];

  for (const face of CUBE4X4_FACES) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c;
        let x = 0;
        let y = 0;
        let z = 0;
        let nx = 0;
        let ny = 0;
        let nz = 0;
        let cx = 0;
        let cy = 0;
        let cz = 0;

        const coords = [-1.5, -0.5, 0.5, 1.5];

        if (face === 'U') {
          // U: y = 2.0. r is z (from back -1.5 to front 1.5), c is x (-1.5 to 1.5)
          x = coords[c];
          y = 2.0;
          z = coords[r];
          nx = 0; ny = 1; nz = 0;
          cx = coords[c]; cy = 1.5; cz = coords[r];
        } else if (face === 'D') {
          // D: y = -2.0. r is z (from front 1.5 to back -1.5), c is x (-1.5 to 1.5)
          x = coords[c];
          y = -2.0;
          z = coords[3 - r];
          nx = 0; ny = -1; nz = 0;
          cx = coords[c]; cy = -1.5; cz = coords[3 - r];
        } else if (face === 'F') {
          // F: z = 2.0. r is y (from top 1.5 to bottom -1.5), c is x (-1.5 to 1.5)
          x = coords[c];
          y = coords[3 - r];
          z = 2.0;
          nx = 0; ny = 0; nz = 1;
          cx = coords[c]; cy = coords[3 - r]; cz = 1.5;
        } else if (face === 'B') {
          // B: z = -2.0. r is y (from top 1.5 to bottom -1.5), c is x (from right 1.5 to left -1.5)
          x = coords[3 - c];
          y = coords[3 - r];
          z = -2.0;
          nx = 0; ny = 0; nz = -1;
          cx = coords[3 - c]; cy = coords[3 - r]; cz = -1.5;
        } else if (face === 'R') {
          // R: x = 2.0. r is y (from top 1.5 to bottom -1.5), c is z (from front 1.5 to back -1.5)
          x = 2.0;
          y = coords[3 - r];
          z = coords[3 - c];
          nx = 1; ny = 0; nz = 0;
          cx = 1.5; cy = coords[3 - r]; cz = coords[3 - c];
        } else if (face === 'L') {
          // L: x = -2.0. r is y (from top 1.5 to bottom -1.5), c is z (from back -1.5 to front 1.5)
          x = -2.0;
          y = coords[3 - r];
          z = coords[c];
          nx = -1; ny = 0; nz = 0;
          cx = -1.5; cy = coords[3 - r]; cz = coords[c];
        }

        layout.push({
          face,
          index: idx,
          center: [x, y, z],
          normal: [nx, ny, nz],
          cubieCoord: [cx, cy, cz],
        });
      }
    }
  }

  return layout;
}

export const STICKER_LAYOUT_4X4 = generate4x4StickerLayout();

/**
 * 4x4 turnInfo single source of truth for animation, arrow, highlight, and wording
 */
export function turnInfo4x4(moveStr: string): TurnInfo4x4 {
  const clean = moveStr.trim();
  const isDouble = clean.includes('2');
  const isPrime = clean.includes("'");
  const isWide = clean.includes('w');
  const baseChar = clean[0];
  const isInner = baseChar === baseChar.toLowerCase() && !isWide;
  const faceUpper = baseChar.toUpperCase() as FaceName3x3;

  let axis: Axis = 'y';
  let baseAngle = -Math.PI / 2; // default CW standard
  let layers: number[] = [3];
  let layerName = 'Right layer';
  let wordingAction = 'UP';

  // 3x3 sign table mapping
  // R: x, -90° | L: x, +90° | U: y, -90° | D: y, +90° | F: z, -90° | B: z, +90°
  switch (faceUpper) {
    case 'R':
      axis = 'x';
      baseAngle = -Math.PI / 2;
      wordingAction = 'UP';
      if (isWide) {
        layers = [2, 3];
        layerName = 'Right two layers';
      } else if (isInner) {
        layers = [2];
        layerName = 'Inner right slice';
      } else {
        layers = [3];
        layerName = 'Right layer';
      }
      break;
    case 'L':
      axis = 'x';
      baseAngle = Math.PI / 2;
      wordingAction = 'DOWN';
      if (isWide) {
        layers = [0, 1];
        layerName = 'Left two layers';
      } else if (isInner) {
        layers = [1];
        layerName = 'Inner left slice';
      } else {
        layers = [0];
        layerName = 'Left layer';
      }
      break;
    case 'U':
      axis = 'y';
      baseAngle = -Math.PI / 2;
      wordingAction = 'LEFT';
      if (isWide) {
        layers = [2, 3];
        layerName = 'Top two layers';
      } else if (isInner) {
        layers = [2];
        layerName = 'Inner top slice';
      } else {
        layers = [3];
        layerName = 'Top layer';
      }
      break;
    case 'D':
      axis = 'y';
      baseAngle = Math.PI / 2;
      wordingAction = 'RIGHT';
      if (isWide) {
        layers = [0, 1];
        layerName = 'Bottom two layers';
      } else if (isInner) {
        layers = [1];
        layerName = 'Inner bottom slice';
      } else {
        layers = [0];
        layerName = 'Bottom layer';
      }
      break;
    case 'F':
      axis = 'z';
      baseAngle = -Math.PI / 2;
      wordingAction = 'CLOCKWISE';
      if (isWide) {
        layers = [2, 3];
        layerName = 'Front two layers';
      } else if (isInner) {
        layers = [2];
        layerName = 'Inner front slice';
      } else {
        layers = [3];
        layerName = 'Front layer';
      }
      break;
    case 'B':
      axis = 'z';
      baseAngle = Math.PI / 2;
      wordingAction = 'COUNTER-CLOCKWISE';
      if (isWide) {
        layers = [0, 1];
        layerName = 'Back two layers';
      } else if (isInner) {
        layers = [1];
        layerName = 'Inner back slice';
      } else {
        layers = [0];
        layerName = 'Back layer';
      }
      break;
  }

  let angle = baseAngle;
  let direction: 'CW' | 'CCW' | 'DOUBLE' = 'CW';

  if (isDouble) {
    angle *= 2;
    direction = 'DOUBLE';
  } else if (isPrime) {
    angle *= -1;
    direction = 'CCW';
  }

  // Generate plain-English wording
  let wording = '';
  if (isWide) {
    if (isDouble) {
      wording = `Turn the two ${faceUpper === 'R' ? 'RIGHT' : faceUpper === 'L' ? 'LEFT' : faceUpper === 'U' ? 'TOP' : faceUpper === 'D' ? 'BOTTOM' : faceUpper === 'F' ? 'FRONT' : 'BACK'} layers 180°`;
    } else {
      const dirText = isPrime
        ? (faceUpper === 'R' ? 'DOWN' : faceUpper === 'L' ? 'UP' : faceUpper === 'U' ? 'RIGHT' : faceUpper === 'D' ? 'LEFT' : faceUpper === 'F' ? 'COUNTER-CLOCKWISE' : 'CLOCKWISE')
        : wordingAction;
      wording = `Turn the two ${faceUpper === 'R' ? 'RIGHT' : faceUpper === 'L' ? 'LEFT' : faceUpper === 'U' ? 'TOP' : faceUpper === 'D' ? 'BOTTOM' : faceUpper === 'F' ? 'FRONT' : 'BACK'} layers ${dirText}`;
    }
  } else if (isInner) {
    const sideName = faceUpper === 'R' ? 'right' : faceUpper === 'L' ? 'left' : faceUpper === 'U' ? 'top' : faceUpper === 'D' ? 'bottom' : faceUpper === 'F' ? 'front' : 'back';
    if (isDouble) {
      wording = `Turn the inner ${faceUpper} slice 180° (the second layer from the ${sideName})`;
    } else {
      const dirText = isPrime
        ? (faceUpper === 'R' ? 'DOWN' : faceUpper === 'L' ? 'UP' : faceUpper === 'U' ? 'RIGHT' : faceUpper === 'D' ? 'LEFT' : faceUpper === 'F' ? 'COUNTER-CLOCKWISE' : 'CLOCKWISE')
        : wordingAction;
      wording = `Turn the inner ${faceUpper} slice ${dirText} (the second layer from the ${sideName})`;
    }
  } else {
    if (isDouble) {
      wording = `Turn the ${faceUpper === 'R' ? 'RIGHT' : faceUpper === 'L' ? 'LEFT' : faceUpper === 'U' ? 'TOP' : faceUpper === 'D' ? 'BOTTOM' : faceUpper === 'F' ? 'FRONT' : 'BACK'} layer 180°`;
    } else {
      const dirText = isPrime
        ? (faceUpper === 'R' ? 'DOWN' : faceUpper === 'L' ? 'UP' : faceUpper === 'U' ? 'RIGHT' : faceUpper === 'D' ? 'LEFT' : faceUpper === 'F' ? 'COUNTER-CLOCKWISE' : 'CLOCKWISE')
        : wordingAction;
      wording = `Turn the ${faceUpper === 'R' ? 'RIGHT' : faceUpper === 'L' ? 'LEFT' : faceUpper === 'U' ? 'TOP' : faceUpper === 'D' ? 'BOTTOM' : faceUpper === 'F' ? 'FRONT' : 'BACK'} layer ${dirText}`;
    }
  }

  return {
    axis,
    layers,
    angle,
    direction,
    layerName,
    wording,
  };
}

/**
 * 3D rotation of a point about an axis
 */
function rotatePointAboutAxis(
  p: [number, number, number],
  axis: Axis,
  angleRad: number
): [number, number, number] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const [x, y, z] = p;

  if (axis === 'x') {
    return [x, y * cos - z * sin, y * sin + z * cos];
  } else if (axis === 'y') {
    return [x * cos + z * sin, y, -x * sin + z * cos];
  } else {
    return [x * cos - y * sin, x * sin + y * cos, z];
  }
}

/**
 * Generate 4x4 move permutation table strictly from 3D geometry
 */
export function generate4x4MovePermutation(moveStr: string): number[] {
  const tInfo = turnInfo4x4(moveStr);
  const { axis, layers, angle } = tInfo;
  const layout = STICKER_LAYOUT_4X4;
  const perm: number[] = new Array(96);

  // Map cubie coordinate to layer index 0..3 along axis
  // coords are -1.5, -0.5, 0.5, 1.5 -> round(c + 1.5) = 0, 1, 2, 3
  const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;

  for (let i = 0; i < 96; i++) {
    const st = layout[i];
    const cubieCoord = st.cubieCoord[axisIdx];
    const layerIdx = Math.round(cubieCoord + 1.5);

    if (layers.includes(layerIdx)) {
      // Rotate sticker center and normal
      const rotCenter = rotatePointAboutAxis(st.center, axis, angle);
      const rotNormal = rotatePointAboutAxis(st.normal, axis, angle);

      // Find destination sticker
      let targetIdx = -1;
      let bestDist = Infinity;

      for (let j = 0; j < 96; j++) {
        const dest = layout[j];
        const dist = Math.sqrt(
          Math.pow(dest.center[0] - rotCenter[0], 2) +
          Math.pow(dest.center[1] - rotCenter[1], 2) +
          Math.pow(dest.center[2] - rotCenter[2], 2)
        );
        const normDot = dest.normal[0] * rotNormal[0] + dest.normal[1] * rotNormal[1] + dest.normal[2] * rotNormal[2];

        if (dist < 0.08 && normDot > 0.9 && dist < bestDist) {
          bestDist = dist;
          targetIdx = j;
        }
      }

      if (targetIdx === -1) {
        throw new Error(`Permutation mismatch for move ${moveStr} on sticker ${i} (${st.face}${st.index})`);
      }

      perm[i] = targetIdx;
    } else {
      perm[i] = i;
    }
  }

  return perm;
}

// Cache of move permutations
const PERMUTATION_CACHE_4X4: Record<string, number[]> = {};

export function get4x4MovePermutation(moveStr: string): number[] {
  if (!PERMUTATION_CACHE_4X4[moveStr]) {
    PERMUTATION_CACHE_4X4[moveStr] = generate4x4MovePermutation(moveStr);
  }
  return PERMUTATION_CACHE_4X4[moveStr];
}

/**
 * Apply move to 4x4 state
 */
export function apply4x4Move(state: Cube4x4State, moveStr: string): Cube4x4State {
  const perm = get4x4MovePermutation(moveStr);
  const flatCurrent: CubeColor[] = [];

  for (const face of CUBE4X4_FACES) {
    flatCurrent.push(...state[face]);
  }

  const flatNext: CubeColor[] = new Array(96);
  for (let src = 0; src < 96; src++) {
    const dest = perm[src];
    flatNext[dest] = flatCurrent[src];
  }

  const nextState: Cube4x4State = {
    U: flatNext.slice(0, 16),
    R: flatNext.slice(16, 32),
    F: flatNext.slice(32, 48),
    D: flatNext.slice(48, 64),
    L: flatNext.slice(64, 80),
    B: flatNext.slice(80, 96),
  };

  return nextState;
}

/**
 * Default Solved State for 4x4
 */
export function getStandardSolved4x4State(): Cube4x4State {
  return {
    U: new Array(16).fill('white'),
    R: new Array(16).fill('red'),
    F: new Array(16).fill('green'),
    D: new Array(16).fill('yellow'),
    L: new Array(16).fill('orange'),
    B: new Array(16).fill('blue'),
  };
}

/**
 * Corner definitions on 4x4:
 * The 8 corner cubies are located at (+/-1.5, +/-1.5, +/-1.5).
 */
export interface CornerDef4x4 {
  name: string;
  stickers: Array<{ face: FaceName3x3; index: number }>;
}

export const CORNERS_4X4: CornerDef4x4[] = [
  // Defined in clockwise cyclic order looking from outside the corner:
  { name: 'UFR', stickers: [{ face: 'U', index: 15 }, { face: 'F', index: 3 }, { face: 'R', index: 0 }] }, // U -> F -> R
  { name: 'UFL', stickers: [{ face: 'U', index: 12 }, { face: 'L', index: 3 }, { face: 'F', index: 0 }] }, // U -> L -> F
  { name: 'UBR', stickers: [{ face: 'U', index: 3 }, { face: 'R', index: 3 }, { face: 'B', index: 0 }] }, // U -> R -> B
  { name: 'UBL', stickers: [{ face: 'U', index: 0 }, { face: 'B', index: 3 }, { face: 'L', index: 0 }] }, // U -> B -> L
  { name: 'DFR', stickers: [{ face: 'D', index: 3 }, { face: 'R', index: 12 }, { face: 'F', index: 15 }] }, // D -> R -> F
  { name: 'DFL', stickers: [{ face: 'D', index: 0 }, { face: 'F', index: 12 }, { face: 'L', index: 15 }] }, // D -> F -> L
  { name: 'DBR', stickers: [{ face: 'D', index: 15 }, { face: 'B', index: 12 }, { face: 'R', index: 15 }] }, // D -> B -> R
  { name: 'DBL', stickers: [{ face: 'D', index: 12 }, { face: 'L', index: 12 }, { face: 'B', index: 15 }] }, // D -> L -> B
];

export interface DerivedColorScheme {
  faceColors: Record<FaceName3x3, CubeColor>;
  oppositePairs: Array<[CubeColor, CubeColor]>;
  solvedState: Cube4x4State;
  holdInstruction: string;
}

/**
 * Derives color scheme from user's cube corners (Section 2 - Colour scheme derivation)
 * Does NOT assume standard scheme. Accepts standard, Japanese, mirror-image, and brand variants.
 */
export function deriveColorSchemeFromCorners(state: Cube4x4State): DerivedColorScheme {
  // 1. Collect all 8 corner color triples
  const cornerTriples: Array<CubeColor[]> = CORNERS_4X4.map((c) =>
    c.stickers.map((st) => state[st.face][st.index])
  );

  // 2. Tally co-occurrences of colors on corners
  const allColorsSet = new Set<CubeColor>();
  for (const triple of cornerTriples) {
    for (const col of triple) {
      if (col) allColorsSet.add(col);
    }
  }

  const colors = Array.from(allColorsSet);
  if (colors.length < 6) {
    // If incomplete, fallback to standard scheme
    return {
      faceColors: { U: 'white', D: 'yellow', F: 'green', B: 'blue', R: 'red', L: 'orange' },
      oppositePairs: [['white', 'yellow'], ['green', 'blue'], ['red', 'orange']],
      solvedState: getStandardSolved4x4State(),
      holdInstruction: 'Hold the cube with the WHITE face on top and the GREEN face toward you',
    };
  }

  // Find opposite pairs: pairs of colors that never appear on the same corner
  const pairCounts = new Map<string, number>();
  for (const triple of cornerTriples) {
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const key = [triple[i], triple[j]].sort().join('-');
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const oppositePairs: Array<[CubeColor, CubeColor]> = [];
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const key = [colors[i], colors[j]].sort().join('-');
      if (!pairCounts.has(key) || pairCounts.get(key) === 0) {
        oppositePairs.push([colors[i], colors[j]]);
      }
    }
  }

  // 3. Find majority color on U and F faces to respect the cube's orientation as held
  const getMajorityColor = (faceList: CubeColor[]): CubeColor => {
    const cMap = new Map<CubeColor, number>();
    for (const c of faceList) {
      if (c) cMap.set(c, (cMap.get(c) || 0) + 1);
    }
    let best = colors[0];
    let max = -1;
    for (const [col, count] of cMap.entries()) {
      if (count > max) {
        max = count;
        best = col;
      }
    }
    return best;
  };

  const topColor = getMajorityColor(state.U);

  // Find opposite of topColor
  const topPair = oppositePairs.find((p) => p.includes(topColor));
  const bottomColor = topPair ? (topPair[0] === topColor ? topPair[1] : topPair[0]) : (colors.find((c) => c !== topColor) || colors[1]);

  // Determine frontColor from F face (must not be top or bottom)
  let frontColorCandidate = getMajorityColor(state.F);
  if (frontColorCandidate === topColor || frontColorCandidate === bottomColor) {
    const remainingForFront = colors.filter((c) => c !== topColor && c !== bottomColor);
    frontColorCandidate = remainingForFront[0];
  }
  const frontColor = frontColorCandidate;

  // Find opposite of frontColor
  const frontPair = oppositePairs.find((p) => p.includes(frontColor));
  const backColor = frontPair ? (frontPair[0] === frontColor ? frontPair[1] : frontPair[0]) : (colors.find((c) => c !== topColor && c !== bottomColor && c !== frontColor) || colors[2]);

  // Determine rightColor and leftColor from remaining opposite pair and corner chirality
  const lastPair = oppositePairs.find((p) => !p.includes(topColor) && !p.includes(bottomColor) && !p.includes(frontColor) && !p.includes(backColor));
  let rightColor: CubeColor = 'red';
  let leftColor: CubeColor = 'orange';

  if (lastPair) {
    // Find the corner where topColor is immediately followed by frontColor in clockwise cyclic order:
    // That corner's third color is uniquely rightColor!
    let foundRight: CubeColor | null = null;

    for (const triple of cornerTriples) {
      if (triple[0] === topColor && triple[1] === frontColor) {
        foundRight = triple[2];
        break;
      }
      if (triple[1] === topColor && triple[2] === frontColor) {
        foundRight = triple[0];
        break;
      }
      if (triple[2] === topColor && triple[0] === frontColor) {
        foundRight = triple[1];
        break;
      }
    }

    if (foundRight && lastPair.includes(foundRight)) {
      rightColor = foundRight;
      leftColor = lastPair[0] === rightColor ? lastPair[1] : lastPair[0];
    } else {
      rightColor = lastPair[0];
      leftColor = lastPair[1];
    }
  }

  const faceColors: Record<FaceName3x3, CubeColor> = {
    U: topColor,
    D: bottomColor,
    F: frontColor,
    B: backColor,
    R: rightColor,
    L: leftColor,
  };

  const solvedState: Cube4x4State = {
    U: new Array(16).fill(topColor),
    D: new Array(16).fill(bottomColor),
    F: new Array(16).fill(frontColor),
    B: new Array(16).fill(backColor),
    R: new Array(16).fill(rightColor),
    L: new Array(16).fill(leftColor),
  };

  const holdInstruction = `Hold the cube with the ${topColor.toUpperCase()} face on top and the ${frontColor.toUpperCase()} face toward you`;

  return {
    faceColors,
    oppositePairs,
    solvedState,
    holdInstruction,
  };
}

/**
 * 40-move random scramble generator for 4x4
 */
export function generate4x4RandomScramble(moveCount = 40): string[] {
  const outerMoves = ['R', 'L', 'U', 'D', 'F', 'B'];
  const wideMoves = ['Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw'];
  const innerMoves = ['r', 'l', 'u', 'd', 'f', 'b'];
  const allBase = [...outerMoves, ...wideMoves, ...innerMoves];
  const modifiers = ['', "'", '2'];

  const scramble: string[] = [];
  let lastBase = '';

  for (let i = 0; i < moveCount; i++) {
    let base = allBase[Math.floor(Math.random() * allBase.length)];
    while (base === lastBase) {
      base = allBase[Math.floor(Math.random() * allBase.length)];
    }
    lastBase = base;
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(`${base}${mod}`);
  }

  return scramble;
}

/**
 * Invert a move string
 */
export function invert4x4Move(moveStr: string): string {
  const clean = moveStr.trim();
  if (clean.includes('2')) return clean;
  if (clean.includes("'")) return clean.replace("'", '');
  return `${clean}'`;
}

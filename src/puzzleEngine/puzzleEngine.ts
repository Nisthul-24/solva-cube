import {
  PYRAMINX_VERTICES,
  PYRAMINX_STICKERS_3D,
  Vec3,
  dot,
  cross,
  sub,
  add,
  scale,
  norm,
  normalize,
  FaceNamePyraminx,
  PyraminxColor,
  R_TETRA,
} from '../solvers/pyraminx/pyraminxGeometry';
import { PYRAMINX_PIECES_14, PyraminxPieceDef } from '../solvers/pyraminx/pyraminxPieces';
import {
  generate4x4StickerLayout,
  STICKER_LAYOUT_4X4,
  Sticker4x4Layout,
} from '../solvers/cube4x4/cube4x4Geometry';
import { FaceName3x3, Axis } from '../components/3d/cubieModel';
import { getOrthonormalBasis, buildOrbitArrow } from '../components/3d/puzzleTurnInfo';

export type OrbitArrowData = ReturnType<typeof buildOrbitArrow>;

export interface EngineSticker {
  id: string;
  normal: Vec3;
  centroid: Vec3;
  colorSlot: string;
  face?: string;
  index?: number;
}

export interface EnginePiece {
  id: string;
  name: string;
  homeCentroid: Vec3;
  stickers: EngineSticker[];
  type?: string;
}

export interface EngineMove {
  name: string;
  axis: Vec3; // GLOBAL fixed vector: +x/+y/+z for cube, vertex unit vector for Pyraminx
  axisName?: 'x' | 'y' | 'z';
  selector: (centroid: Vec3) => boolean;
  angle: number; // signed radians
  isDouble: boolean;
  isCCW: boolean;
  permutation: number[]; // derived from 3D geometry rotation of sticker centroids
  turningPieceIds: string[]; // cached array of piece ids that turn
  turningPieceSet: Set<string>;
  wording: string; // layer description: "the two bottom layers", "the second layer from the bottom", etc.
  layerName: string; // pulsing chip text: "Bottom two layers", "Inner right slice", etc.
  fullInstruction: string; // e.g. "Turn the two bottom layers 180°"
  directionWord: string;
  layerCentroid: Vec3; // centroid of turning pieces
  layerExtent: number; // extent along axis
  arrowCenter: Vec3; // point on the axis
  arrowRadius: number; // 1.18 x halfDiag or 1.25 x rho(t_cut)
  arrow: OrbitArrowData;
}

export interface PuzzleEngine {
  puzzleId: '4x4' | 'pyraminx';
  pieces: EnginePiece[];
  moves: Map<string, EngineMove>;
  layerPieces: (move: string) => string[];
  wording: (move: string) => { layerDesc: string; layerName: string; fullInstruction: string };
  getMove: (move: string) => EngineMove | undefined;
}

// 3D rotation of a point around an axis by angle radians (Rodrigues' rotation formula)
export function rotateAroundAxis(point: Vec3, axis: Vec3, angleRad: number): Vec3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const a = normalize(axis);
  const d = dot(a, point);
  const cr = cross(a, point);

  return [
    point[0] * c + cr[0] * s + a[0] * d * (1 - c),
    point[1] * c + cr[1] * s + a[1] * d * (1 - c),
    point[2] * c + cr[2] * s + a[2] * d * (1 - c),
  ];
}

// -----------------------------------------------------------------------
// 4X4 REVENGE CUBE ENGINE IMPLEMENTATION
// -----------------------------------------------------------------------

function build4x4Pieces(): EnginePiece[] {
  const coords = [-1.5, -0.5, 0.5, 1.5];
  const pieces: EnginePiece[] = [];
  const stickerLayout = STICKER_LAYOUT_4X4;

  for (const x of coords) {
    for (const y of coords) {
      for (const z of coords) {
        const id = `c4_${x}_${y}_${z}`;
        const homeCentroid: Vec3 = [x, y, z];

        // Find stickers that belong to this cubie
        const cubieStickers: EngineSticker[] = [];
        for (let i = 0; i < stickerLayout.length; i++) {
          const st = stickerLayout[i];
          const [cx, cy, cz] = st.cubieCoord;
          if (
            Math.abs(cx - x) < 0.01 &&
            Math.abs(cy - y) < 0.01 &&
            Math.abs(cz - z) < 0.01
          ) {
            cubieStickers.push({
              id: `st_${st.face}_${st.index}`,
              normal: st.normal as Vec3,
              centroid: st.center as Vec3,
              colorSlot: st.face,
              face: st.face,
              index: st.index,
            });
          }
        }

        pieces.push({
          id,
          name: `Cubie [${x}, ${y}, ${z}]`,
          homeCentroid,
          stickers: cubieStickers,
        });
      }
    }
  }

  return pieces;
}

function build4x4Wording(axisName: 'x' | 'y' | 'z', layers: number[], isDouble: boolean, isPrime: boolean): {
  layerDesc: string;
  layerName: string;
  fullInstruction: string;
  directionWord: string;
} {
  const minSide = axisName === 'x' ? 'left' : axisName === 'y' ? 'bottom' : 'back';
  const maxSide = axisName === 'x' ? 'right' : axisName === 'y' ? 'top' : 'front';
  const capMin = minSide.charAt(0).toUpperCase() + minSide.slice(1);
  const capMax = maxSide.charAt(0).toUpperCase() + maxSide.slice(1);

  let layerDesc = '';
  let layerName = '';

  const sortedLayers = [...layers].sort();
  const isWide = sortedLayers.length === 2;
  const isInner = sortedLayers.length === 1 && (sortedLayers[0] === 1 || sortedLayers[0] === 2);

  if (isWide) {
    if (sortedLayers[0] === 0 && sortedLayers[1] === 1) {
      layerDesc = `the two ${minSide} layers`;
      layerName = `${capMin} two layers`;
    } else {
      layerDesc = `the two ${maxSide} layers`;
      layerName = `${capMax} two layers`;
    }
  } else if (isInner) {
    if (sortedLayers[0] === 1) {
      layerDesc = `the second layer from the ${minSide}`;
      layerName = `Inner ${minSide} slice`;
    } else {
      layerDesc = `the second layer from the ${maxSide}`;
      layerName = `Inner ${maxSide} slice`;
    }
  } else {
    if (sortedLayers[0] === 0) {
      layerDesc = `the ${minSide} layer`;
      layerName = `${capMin} layer`;
    } else {
      layerDesc = `the ${maxSide} layer`;
      layerName = `${capMax} layer`;
    }
  }

  // Direction word for front-perspective action
  let cwAction = '';
  let ccwAction = '';
  if (axisName === 'y') {
    cwAction = sortedLayers.includes(3) || sortedLayers.includes(2) ? 'LEFT' : 'RIGHT';
    ccwAction = sortedLayers.includes(3) || sortedLayers.includes(2) ? 'RIGHT' : 'LEFT';
  } else if (axisName === 'x') {
    cwAction = sortedLayers.includes(3) || sortedLayers.includes(2) ? 'UP' : 'DOWN';
    ccwAction = sortedLayers.includes(3) || sortedLayers.includes(2) ? 'DOWN' : 'UP';
  } else {
    cwAction = sortedLayers.includes(3) || sortedLayers.includes(2) ? 'CLOCKWISE' : 'COUNTER-CLOCKWISE';
    ccwAction = sortedLayers.includes(3) || sortedLayers.includes(2) ? 'COUNTER-CLOCKWISE' : 'CLOCKWISE';
  }

  const directionWord = isDouble ? '180°' : isPrime ? ccwAction : cwAction;
  const fullInstruction = isDouble
    ? `Turn ${layerDesc} 180°`
    : `Turn ${layerDesc} ${directionWord}`;

  return { layerDesc, layerName, fullInstruction, directionWord };
}

function build4x4Moves(pieces: EnginePiece[]): Map<string, EngineMove> {
  const moves = new Map<string, EngineMove>();
  const baseMoves = ['U', 'D', 'L', 'R', 'F', 'B', 'Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw', 'u', 'd', 'l', 'r', 'f', 'b'];
  const stickerLayout = STICKER_LAYOUT_4X4;

  for (const base of baseMoves) {
    const isWide = base.includes('w');
    const isInner = base === base.toLowerCase() && !isWide;
    const faceUpper = base[0].toUpperCase() as FaceName3x3;

    let axis: Vec3 = [0, 1, 0];
    let axisName: 'x' | 'y' | 'z' = 'y';
    let baseAngle = -Math.PI / 2;
    let layers: number[] = [3];

    switch (faceUpper) {
      case 'R':
        axis = [1, 0, 0];
        axisName = 'x';
        baseAngle = -Math.PI / 2;
        layers = isWide ? [2, 3] : isInner ? [2] : [3];
        break;
      case 'L':
        axis = [1, 0, 0];
        axisName = 'x';
        baseAngle = Math.PI / 2;
        layers = isWide ? [0, 1] : isInner ? [1] : [0];
        break;
      case 'U':
        axis = [0, 1, 0];
        axisName = 'y';
        baseAngle = -Math.PI / 2;
        layers = isWide ? [2, 3] : isInner ? [2] : [3];
        break;
      case 'D':
        axis = [0, 1, 0];
        axisName = 'y';
        baseAngle = Math.PI / 2;
        layers = isWide ? [0, 1] : isInner ? [1] : [0];
        break;
      case 'F':
        axis = [0, 0, 1];
        axisName = 'z';
        baseAngle = -Math.PI / 2;
        layers = isWide ? [2, 3] : isInner ? [2] : [3];
        break;
      case 'B':
        axis = [0, 0, 1];
        axisName = 'z';
        baseAngle = Math.PI / 2;
        layers = isWide ? [0, 1] : isInner ? [1] : [0];
        break;
    }

    const axisIdx = axisName === 'x' ? 0 : axisName === 'y' ? 1 : 2;

    for (const suffix of ['', "'", '2']) {
      const name = `${base}${suffix}`;
      const isDouble = suffix === '2';
      const isPrime = suffix === "'";
      const angle = isDouble ? baseAngle * 2 : isPrime ? -baseAngle : baseAngle;

      const selector = (centroid: Vec3): boolean => {
        const coord = centroid[axisIdx];
        const layerIdx = Math.round(coord + 1.5);
        return layers.includes(layerIdx);
      };

      const turningPieces = pieces.filter((p) => selector(p.homeCentroid));
      const turningPieceIds = turningPieces.map((p) => p.id);
      const turningPieceSet = new Set(turningPieceIds);

      // Centroid and extent of turning pieces
      const sumCentroid: Vec3 = [0, 0, 0];
      let minCoord = Infinity;
      let maxCoord = -Infinity;
      for (const p of turningPieces) {
        sumCentroid[0] += p.homeCentroid[0];
        sumCentroid[1] += p.homeCentroid[1];
        sumCentroid[2] += p.homeCentroid[2];
        const c = p.homeCentroid[axisIdx];
        if (c < minCoord) minCoord = c;
        if (c > maxCoord) maxCoord = c;
      }
      const count = turningPieces.length || 1;
      const layerCentroid: Vec3 = [
        sumCentroid[0] / count,
        sumCentroid[1] / count,
        sumCentroid[2] / count,
      ];
      // Extent along axis: distance from min to max cubie centers + 1.0 (cubie size)
      const layerExtent = maxCoord - minCoord + 1.0;

      // Arrow center: on axis at the mean coordinate of the layers
      // Layer coords are -1.5, -0.5, 0.5, 1.5
      const layerCoords = [-1.5, -0.5, 0.5, 1.5];
      const meanAxisCoord = layers.reduce((acc, l) => acc + layerCoords[l], 0) / layers.length;
      const arrowCenter = scale(axis, meanAxisCoord);

      // Arrow radius: 1.18 x half-diagonal of cross section (2.0 * sqrt(2))
      const halfDiag = 2.0 * Math.SQRT2;
      const arrowRadius = 1.18 * halfDiag;

      // Orthonormal basis for arrow
      const { U, V } = getOrthonormalBasis(axis);
      const ribbonWidth = 0.22;
      const headLength = 0.70;
      const headWidth = 0.44;
      const sweepSpan = isDouble ? (220 * Math.PI) / 180 : (110 * Math.PI) / 180;

      const arrow = buildOrbitArrow(
        arrowCenter,
        axis,
        U,
        V,
        arrowRadius,
        angle,
        ribbonWidth,
        headLength,
        headWidth,
        sweepSpan
      );

      // Permutation table: derived strictly by rotating sticker centroids in 3D
      const permutation: number[] = new Array(96);
      for (let i = 0; i < 96; i++) {
        const st = stickerLayout[i];
        const cubieCoord = st.cubieCoord[axisIdx];
        const layerIdx = Math.round(cubieCoord + 1.5);

        if (layers.includes(layerIdx)) {
          const rotCenter = rotateAroundAxis(st.center as Vec3, axis, angle);
          const rotNormal = rotateAroundAxis(st.normal as Vec3, axis, angle);

          let targetIdx = i;
          let bestDist = Infinity;
          for (let j = 0; j < 96; j++) {
            const dest = stickerLayout[j];
            const d = Math.hypot(
              dest.center[0] - rotCenter[0],
              dest.center[1] - rotCenter[1],
              dest.center[2] - rotCenter[2]
            );
            const nDot = dot(dest.normal as Vec3, rotNormal);
            if (d < 0.08 && nDot > 0.9 && d < bestDist) {
              bestDist = d;
              targetIdx = j;
            }
          }
          permutation[i] = targetIdx;
        } else {
          permutation[i] = i;
        }
      }

      const { layerDesc, layerName, fullInstruction, directionWord } = build4x4Wording(
        axisName,
        layers,
        isDouble,
        isPrime
      );

      moves.set(name, {
        name,
        axis,
        axisName,
        selector,
        angle,
        isDouble,
        isCCW: isPrime,
        permutation,
        turningPieceIds,
        turningPieceSet,
        wording: layerDesc,
        layerName,
        fullInstruction,
        directionWord,
        layerCentroid,
        layerExtent,
        arrowCenter,
        arrowRadius,
        arrow,
      });
    }
  }

  return moves;
}

// -----------------------------------------------------------------------
// PYRAMINX ENGINE IMPLEMENTATION
// -----------------------------------------------------------------------

function buildPyraminxPieces(): EnginePiece[] {
  return PYRAMINX_PIECES_14.map((p) => {
    return {
      id: p.id,
      name: p.name,
      homeCentroid: p.centroid,
      stickers: p.stickers.map((st) => ({
        id: st.id,
        normal: st.normal,
        centroid: st.centroid,
        colorSlot: st.face,
        face: st.face,
        index: st.index,
      })),
      type: p.type,
    };
  });
}

function buildPyraminxMoves(pieces: EnginePiece[]): Map<string, EngineMove> {
  const moves = new Map<string, EngineMove>();
  const vertexKeys: Array<'U' | 'L' | 'R' | 'B'> = ['U', 'L', 'R', 'B'];
  const allStickers = PYRAMINX_STICKERS_3D;

  const vNames: Record<'U' | 'L' | 'R' | 'B', string> = {
    U: 'top',
    L: 'bottom-left',
    R: 'bottom-right',
    B: 'back',
  };

  const vNamesCap: Record<'U' | 'L' | 'R' | 'B', string> = {
    U: 'Top',
    L: 'Bottom-left',
    R: 'Bottom-right',
    B: 'Back',
  };

  for (const vKey of vertexKeys) {
    const vertex = PYRAMINX_VERTICES[vKey];
    const axis = normalize(vertex);
    const R_dist = norm(vertex); // sqrt(3)

    for (const isTip of [false, true]) {
      const baseName = isTip ? vKey.toLowerCase() : vKey;
      const threshold = isTip ? 2 / 3 : 1 / 3;

      for (const suffix of ['', "'"]) {
        const name = `${baseName}${suffix}`;
        const isCCW = suffix === "'";
        const angle = (isCCW ? 120 : -120) * (Math.PI / 180);

        const selector = (centroid: Vec3): boolean => {
          const t = (dot(centroid, axis) + R_dist / 3) / ((4 * R_dist) / 3);
          return t > threshold - 0.05;
        };

        const turningPieces = pieces.filter((p) => selector(p.homeCentroid));
        const turningPieceIds = turningPieces.map((p) => p.id);
        const turningPieceSet = new Set(turningPieceIds);

        // Centroid of turning pieces
        const sumCentroid: Vec3 = [0, 0, 0];
        let minD = Infinity;
        let maxD = -Infinity;
        for (const p of turningPieces) {
          sumCentroid[0] += p.homeCentroid[0];
          sumCentroid[1] += p.homeCentroid[1];
          sumCentroid[2] += p.homeCentroid[2];
          const d = dot(p.homeCentroid, axis);
          if (d < minD) minD = d;
          if (d > maxD) maxD = d;
        }
        const count = turningPieces.length || 1;
        const layerCentroid: Vec3 = [
          sumCentroid[0] / count,
          sumCentroid[1] / count,
          sumCentroid[2] / count,
        ];
        const layerExtent = (1 - threshold) * ((4 * R_dist) / 3);

        // Plane at t_cut + 0.12
        const tCut = threshold;
        const tPlane = tCut + 0.12;
        const dPlane = -R_dist / 3 + tPlane * ((4 * R_dist) / 3);
        const arrowCenter = scale(axis, dPlane);

        // Arrow radius: 1.25 x rho(t_cut), rho(t) = sqrt(8/3) * (1 - t)
        const rhoCut = Math.sqrt(8 / 3) * (1 - tCut);
        const arrowRadius = 1.25 * rhoCut;

        const { U, V } = getOrthonormalBasis(axis);
        const ribbonWidth = isTip ? 0.08 : 0.11;
        const headLength = isTip ? 0.26 : 0.35;
        const headWidth = isTip ? 0.16 : 0.22;
        const sweepSpan = (120 * Math.PI) / 180;

        const arrow = buildOrbitArrow(
          arrowCenter,
          axis,
          U,
          V,
          arrowRadius,
          angle,
          ribbonWidth,
          headLength,
          headWidth,
          sweepSpan
        );

        // Permutation table strictly from rotating sticker centroids
        const permutation: number[] = new Array(36);
        for (let i = 0; i < 36; i++) {
          const st = allStickers[i];
          const t = (dot(st.centroid, axis) + R_dist / 3) / ((4 * R_dist) / 3);
          if (t > threshold - 0.05) {
            const rotCentroid = rotateAroundAxis(st.centroid, axis, angle);
            const rotNormal = rotateAroundAxis(st.normal, axis, angle);

            let targetIdx = i;
            let bestDist = Infinity;
            for (let j = 0; j < 36; j++) {
              const dest = allStickers[j];
              const d = Math.hypot(
                dest.centroid[0] - rotCentroid[0],
                dest.centroid[1] - rotCentroid[1],
                dest.centroid[2] - rotCentroid[2]
              );
              const nDot = dot(dest.normal, rotNormal);
              if (d < 0.1 && nDot > 0.9 && d < bestDist) {
                bestDist = d;
                targetIdx = j;
              }
            }
            permutation[i] = targetIdx;
          } else {
            permutation[i] = i;
          }
        }

        const vName = vNames[vKey];
        const vNameCap = vNamesCap[vKey];
        const part = isTip ? 'tip' : 'corner';
        const layerDesc = `the ${vName} ${part}`;
        const layerName = `${vNameCap} ${part}`;
        const dir = isCCW ? 'counter-clockwise' : 'clockwise';
        const verb = isTip ? 'Twist' : 'Turn';
        const fullInstruction = `${verb} ${layerDesc} ${dir}`;

        moves.set(name, {
          name,
          axis,
          selector,
          angle,
          isDouble: false,
          isCCW,
          permutation,
          turningPieceIds,
          turningPieceSet,
          wording: layerDesc,
          layerName,
          fullInstruction,
          directionWord: dir,
          layerCentroid,
          layerExtent,
          arrowCenter,
          arrowRadius,
          arrow,
        });
      }
    }
  }

  return moves;
}

// -----------------------------------------------------------------------
// ENGINE SINGLETONS & PUBLIC API
// -----------------------------------------------------------------------

class PuzzleEngineInstance implements PuzzleEngine {
  puzzleId: '4x4' | 'pyraminx';
  pieces: EnginePiece[];
  moves: Map<string, EngineMove>;

  constructor(puzzleId: '4x4' | 'pyraminx') {
    this.puzzleId = puzzleId;
    if (puzzleId === '4x4') {
      this.pieces = build4x4Pieces();
      this.moves = build4x4Moves(this.pieces);
    } else {
      this.pieces = buildPyraminxPieces();
      this.moves = buildPyraminxMoves(this.pieces);
    }
  }

  layerPieces = (move: string): string[] => {
    const m = this.moves.get(move.trim());
    return m ? m.turningPieceIds : [];
  };

  wording = (move: string) => {
    const m = this.moves.get(move.trim());
    if (!m) {
      return { layerDesc: '', layerName: '', fullInstruction: '' };
    }
    return {
      layerDesc: m.wording,
      layerName: m.layerName,
      fullInstruction: m.fullInstruction,
    };
  };

  getMove = (move: string): EngineMove | undefined => {
    return this.moves.get(move.trim());
  };
}

let engine4x4: PuzzleEngineInstance | null = null;
let enginePyraminx: PuzzleEngineInstance | null = null;

export function getPuzzleEngine(puzzleId: '4x4' | 'pyraminx'): PuzzleEngine {
  if (puzzleId === '4x4') {
    if (!engine4x4) engine4x4 = new PuzzleEngineInstance('4x4');
    return engine4x4;
  }
  if (!enginePyraminx) enginePyraminx = new PuzzleEngineInstance('pyraminx');
  return enginePyraminx;
}

export function layerPieces(puzzleId: '4x4' | 'pyraminx', move: string): string[] {
  return getPuzzleEngine(puzzleId).layerPieces(move);
}

export function wording(
  puzzleId: '4x4' | 'pyraminx',
  move: string
): { layerDesc: string; layerName: string; fullInstruction: string } {
  return getPuzzleEngine(puzzleId).wording(move);
}

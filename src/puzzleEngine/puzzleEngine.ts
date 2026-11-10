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
  outwardNormal?: Vec3; // Unit outward normal toward viewer's side (+1 for U/R/F, -1 for D/L/B)
  layers?: number[]; // Layer indices along axis (0..3 for 4x4)
  axisName?: 'x' | 'y' | 'z';
  selector: (centroid: Vec3) => boolean;
  angle: number; // signed radians
  isDouble: boolean;
  isCCW: boolean;
  isSlice?: boolean;
  isWide?: boolean;
  permutation: number[]; // derived from 3D geometry rotation of sticker centroids
  turningPieces?: EnginePiece[];
  turningPieceIds: string[]; // cached array of piece ids that turn
  turningPieceSet: Set<string>;
  layerDesc?: string;
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

// -----------------------------------------------------------------------
// 4X4 REVENGE CUBE MOVE VOCABULARY & ENGINE
// -----------------------------------------------------------------------

export interface MoveVocab4x4 {
  canonical: string;       // Standard name: 'R', 'Rw', '2R'
  face: FaceName3x3;
  layers: number[];        // Layer indices along positive axis [0..3]
  isWide: boolean;
  isInner: boolean;
  axis: Vec3;              // Unit vector along positive coordinate axis
  outwardNormal: Vec3;     // Outward normal of the face
  axisName: 'x' | 'y' | 'z';
  baseAngle: number;       // Base angle for clockwise turn about outwardNormal
  chipLabel: string;
  sideName: string;
}

// Fixed 4x4 move vocabulary table (Part B item 1)
export const MOVE_VOCAB_4X4: Record<string, MoveVocab4x4> = {
  // RIGHT (+x)
  'R':  { canonical: 'R',  face: 'R', layers: [3],    isWide: false, isInner: false, axis: [1, 0, 0], outwardNormal: [1, 0, 0],  axisName: 'x', baseAngle: -Math.PI / 2, chipLabel: 'R',  sideName: 'right' },
  'Rw': { canonical: 'Rw', face: 'R', layers: [2, 3], isWide: true,  isInner: false, axis: [1, 0, 0], outwardNormal: [1, 0, 0],  axisName: 'x', baseAngle: -Math.PI / 2, chipLabel: 'Rw', sideName: 'right' },
  '2R': { canonical: '2R', face: 'R', layers: [2],    isWide: false, isInner: true,  axis: [1, 0, 0], outwardNormal: [1, 0, 0],  axisName: 'x', baseAngle: -Math.PI / 2, chipLabel: '2R', sideName: 'right' },
  'r':  { canonical: '2R', face: 'R', layers: [2],    isWide: false, isInner: true,  axis: [1, 0, 0], outwardNormal: [1, 0, 0],  axisName: 'x', baseAngle: -Math.PI / 2, chipLabel: '2R', sideName: 'right' },

  // LEFT (-x)
  'L':  { canonical: 'L',  face: 'L', layers: [0],    isWide: false, isInner: false, axis: [1, 0, 0], outwardNormal: [-1, 0, 0], axisName: 'x', baseAngle: Math.PI / 2,  chipLabel: 'L',  sideName: 'left' },
  'Lw': { canonical: 'Lw', face: 'L', layers: [0, 1], isWide: true,  isInner: false, axis: [1, 0, 0], outwardNormal: [-1, 0, 0], axisName: 'x', baseAngle: Math.PI / 2,  chipLabel: 'Lw', sideName: 'left' },
  '2L': { canonical: '2L', face: 'L', layers: [1],    isWide: false, isInner: true,  axis: [1, 0, 0], outwardNormal: [-1, 0, 0], axisName: 'x', baseAngle: Math.PI / 2,  chipLabel: '2L', sideName: 'left' },
  'l':  { canonical: '2L', face: 'L', layers: [1],    isWide: false, isInner: true,  axis: [1, 0, 0], outwardNormal: [-1, 0, 0], axisName: 'x', baseAngle: Math.PI / 2,  chipLabel: '2L', sideName: 'left' },

  // TOP / UP (+y)
  'U':  { canonical: 'U',  face: 'U', layers: [3],    isWide: false, isInner: false, axis: [0, 1, 0], outwardNormal: [0, 1, 0],  axisName: 'y', baseAngle: -Math.PI / 2, chipLabel: 'U',  sideName: 'top' },
  'Uw': { canonical: 'Uw', face: 'U', layers: [2, 3], isWide: true,  isInner: false, axis: [0, 1, 0], outwardNormal: [0, 1, 0],  axisName: 'y', baseAngle: -Math.PI / 2, chipLabel: 'Uw', sideName: 'top' },
  '2U': { canonical: '2U', face: 'U', layers: [2],    isWide: false, isInner: true,  axis: [0, 1, 0], outwardNormal: [0, 1, 0],  axisName: 'y', baseAngle: -Math.PI / 2, chipLabel: '2U', sideName: 'top' },
  'u':  { canonical: '2U', face: 'U', layers: [2],    isWide: false, isInner: true,  axis: [0, 1, 0], outwardNormal: [0, 1, 0],  axisName: 'y', baseAngle: -Math.PI / 2, chipLabel: '2U', sideName: 'top' },

  // BOTTOM / DOWN (-y)
  'D':  { canonical: 'D',  face: 'D', layers: [0],    isWide: false, isInner: false, axis: [0, 1, 0], outwardNormal: [0, -1, 0], axisName: 'y', baseAngle: Math.PI / 2,  chipLabel: 'D',  sideName: 'bottom' },
  'Dw': { canonical: 'Dw', face: 'D', layers: [0, 1], isWide: true,  isInner: false, axis: [0, 1, 0], outwardNormal: [0, -1, 0], axisName: 'y', baseAngle: Math.PI / 2,  chipLabel: 'Dw', sideName: 'bottom' },
  '2D': { canonical: '2D', face: 'D', layers: [1],    isWide: false, isInner: true,  axis: [0, 1, 0], outwardNormal: [0, -1, 0], axisName: 'y', baseAngle: Math.PI / 2,  chipLabel: '2D', sideName: 'bottom' },
  'd':  { canonical: '2D', face: 'D', layers: [1],    isWide: false, isInner: true,  axis: [0, 1, 0], outwardNormal: [0, -1, 0], axisName: 'y', baseAngle: Math.PI / 2,  chipLabel: '2D', sideName: 'bottom' },

  // FRONT (+z)
  'F':  { canonical: 'F',  face: 'F', layers: [3],    isWide: false, isInner: false, axis: [0, 0, 1], outwardNormal: [0, 0, 1],  axisName: 'z', baseAngle: -Math.PI / 2, chipLabel: 'F',  sideName: 'front' },
  'Fw': { canonical: 'Fw', face: 'F', layers: [2, 3], isWide: true,  isInner: false, axis: [0, 0, 1], outwardNormal: [0, 0, 1],  axisName: 'z', baseAngle: -Math.PI / 2, chipLabel: 'Fw', sideName: 'front' },
  '2F': { canonical: '2F', face: 'F', layers: [2],    isWide: false, isInner: true,  axis: [0, 0, 1], outwardNormal: [0, 0, 1],  axisName: 'z', baseAngle: -Math.PI / 2, chipLabel: '2F', sideName: 'front' },
  'f':  { canonical: '2F', face: 'F', layers: [2],    isWide: false, isInner: true,  axis: [0, 0, 1], outwardNormal: [0, 0, 1],  axisName: 'z', baseAngle: -Math.PI / 2, chipLabel: '2F', sideName: 'front' },

  // BACK (-z)
  'B':  { canonical: 'B',  face: 'B', layers: [0],    isWide: false, isInner: false, axis: [0, 0, 1], outwardNormal: [0, 0, -1], axisName: 'z', baseAngle: Math.PI / 2,  chipLabel: 'B',  sideName: 'back' },
  'Bw': { canonical: 'Bw', face: 'B', layers: [0, 1], isWide: true,  isInner: false, axis: [0, 0, 1], outwardNormal: [0, 0, -1], axisName: 'z', baseAngle: Math.PI / 2,  chipLabel: 'Bw', sideName: 'back' },
  '2B': { canonical: '2B', face: 'B', layers: [1],    isWide: false, isInner: true,  axis: [0, 0, 1], outwardNormal: [0, 0, -1], axisName: 'z', baseAngle: Math.PI / 2,  chipLabel: '2B', sideName: 'back' },
  'b':  { canonical: '2B', face: 'B', layers: [1],    isWide: false, isInner: true,  axis: [0, 0, 1], outwardNormal: [0, 0, -1], axisName: 'z', baseAngle: Math.PI / 2,  chipLabel: '2B', sideName: 'back' },
};

function build4x4WordingFromVocab(
  vocab: MoveVocab4x4,
  isDouble: boolean,
  isPrime: boolean
): {
  layerDesc: string;
  layerName: string;
  fullInstruction: string;
  directionWord: string;
} {
  const { sideName, isWide, isInner, axisName } = vocab;
  const capSide = sideName.charAt(0).toUpperCase() + sideName.slice(1);

  let layerDesc = '';
  let layerName = '';

  if (isWide) {
    layerDesc = `the two ${sideName} layers`;
    layerName = `${capSide} two layers`;
  } else if (isInner) {
    layerDesc = `the inner layer second from the ${sideName}`;
    layerName = `Inner ${sideName} slice`;
  } else {
    layerDesc = `the outer ${sideName} layer`;
    layerName = `Outer ${sideName} layer`;
  }

  // Direction word for front-perspective action
  let cwAction = '';
  let ccwAction = '';
  if (axisName === 'y') {
    cwAction = vocab.layers.includes(3) || vocab.layers.includes(2) ? 'LEFT' : 'RIGHT';
    ccwAction = vocab.layers.includes(3) || vocab.layers.includes(2) ? 'RIGHT' : 'LEFT';
  } else if (axisName === 'x') {
    cwAction = vocab.layers.includes(3) || vocab.layers.includes(2) ? 'UP' : 'DOWN';
    ccwAction = vocab.layers.includes(3) || vocab.layers.includes(2) ? 'DOWN' : 'UP';
  } else {
    cwAction = vocab.layers.includes(3) || vocab.layers.includes(2) ? 'CLOCKWISE' : 'COUNTER-CLOCKWISE';
    ccwAction = vocab.layers.includes(3) || vocab.layers.includes(2) ? 'COUNTER-CLOCKWISE' : 'CLOCKWISE';
  }

  const directionWord = isDouble ? '180°' : isPrime ? ccwAction : cwAction;
  const fullInstruction = isDouble
    ? `Turn ${layerDesc} 180°`
    : `Turn ${layerDesc} ${directionWord}`;

  return { layerDesc, layerName, fullInstruction, directionWord };
}

function build4x4Moves(pieces: EnginePiece[]): Map<string, EngineMove> {
  const moves = new Map<string, EngineMove>();
  const stickerLayout = STICKER_LAYOUT_4X4;
  const baseKeys = Object.keys(MOVE_VOCAB_4X4);

  for (const baseKey of baseKeys) {
    const vocab = MOVE_VOCAB_4X4[baseKey];
    const { axis, outwardNormal, axisName, layers, baseAngle } = vocab;
    const axisIdx = axisName === 'x' ? 0 : axisName === 'y' ? 1 : 2;

    for (const suffix of ['', "'", '2']) {
      const name = `${baseKey}${suffix}`;
      const canonicalName = `${vocab.canonical}${suffix}`;
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

      // Centroid of turning pieces
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
      const layerExtent = maxCoord - minCoord + 1.0;

      // Arrow center: centroid of turning cubies projected onto the axis
      // Dot product with unit axis gives exact coordinate along axis
      const axisCoord = dot(layerCentroid, axis);
      const arrowCenter = scale(axis, axisCoord);

      // Arrow orbit radius: 1.15 x largest distance from rotation axis A to any moving piece's vertex
      let maxDistToAxis = 0;
      for (const p of turningPieces) {
        const [cx, cy, cz] = p.homeCentroid;
        for (const dx of [-0.5, 0.5]) {
          for (const dy of [-0.5, 0.5]) {
            for (const dz of [-0.5, 0.5]) {
              const v: Vec3 = [cx + dx, cy + dy, cz + dz];
              const vDotA = dot(v, axis);
              const vPerp = sub(v, scale(axis, vDotA));
              const d = norm(vPerp);
              if (d > maxDistToAxis) maxDistToAxis = d;
            }
          }
        }
      }
      const arrowRadius = 1.15 * maxDistToAxis;

      // Orthonormal basis for arrow using the exact animation axis
      // Orient U towards canonical camera direction [1, 0.8, 1] so arrow faces user
      const camDir: Vec3 = [1, 0.8, 1];
      const camRel = sub(camDir, arrowCenter);
      const camDotA = dot(camRel, axis);
      let camPerp = sub(camRel, scale(axis, camDotA));
      if (norm(camPerp) < 1e-4) {
        camPerp = Math.abs(axis[1]) < 0.88 ? [0, 1, 0] : [1, 0, 0];
      }
      const U = normalize(camPerp);
      const V = cross(axis, U);
      const ribbonWidth = 0.22;
      const headLength = 0.65;
      const headWidth = 0.42;
      const sweepSpan = (90 * Math.PI) / 180; // 90-degree arc for cube

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

      // Permutation table strictly from 3D geometry rotation
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

      const { layerDesc, layerName, fullInstruction, directionWord } = build4x4WordingFromVocab(
        vocab,
        isDouble,
        isPrime
      );

      const moveObj: EngineMove = {
        name,
        axis,
        outwardNormal,
        axisName,
        angle,
        layers,
        isDouble,
        isSlice: vocab.isInner,
        isWide: vocab.isWide,
        selector,
        turningPieces,
        turningPieceIds,
        turningPieceSet,
        layerCentroid,
        layerExtent,
        arrowCenter,
        arrowRadius,
        arrow,
        permutation,
        layerDesc,
        layerName,
        wording: fullInstruction,
        fullInstruction,
        directionWord,
        isCCW: isPrime,
      };

      moves.set(name, moveObj);
      if (canonicalName !== name && !moves.has(canonicalName)) {
        moves.set(canonicalName, moveObj);
      }
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

        // Arrow center: centered on the cap's centroid projected onto vertex axis (Part C item 2)
        const arrowCenter = scale(axis, dot(layerCentroid, axis));

        // Arrow radius: 1.15 x largest distance from rotation axis A to any moving piece's vertex
        let maxDistToAxis = 0;
        for (const p of turningPieces) {
          const pDef = PYRAMINX_PIECES_14.find((def) => def.id === p.id);
          if (pDef) {
            const pos = pDef.bodyPositions;
            for (let vi = 0; vi < pos.length; vi += 3) {
              const v: Vec3 = [pos[vi], pos[vi + 1], pos[vi + 2]];
              const vDotA = dot(v, axis);
              const vPerp = sub(v, scale(axis, vDotA));
              const d = norm(vPerp);
              if (d > maxDistToAxis) maxDistToAxis = d;
            }
          }
        }
        const arrowRadius = 1.15 * maxDistToAxis;

        const { U, V } = getOrthonormalBasis(axis);
        // Width: 5% of model size (model edge length = sqrt(8) approx 2.828)
        const ribbonWidth = 0.05 * Math.sqrt(8); // approx 0.141
        const headLength = 0.36;
        const headWidth = 0.28;
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

export function getStandardMoveNotation(puzzleId: string, notation: string): string {
  if (puzzleId !== '4x4') return notation;
  const suf = notation.endsWith('2') ? '2' : notation.endsWith("'") ? "'" : '';
  const base = notation.replace(/['2]/g, '');
  const vocab = MOVE_VOCAB_4X4[base];
  if (vocab) {
    return `${vocab.canonical}${suf}`;
  }
  return notation;
}

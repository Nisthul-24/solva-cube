import { PuzzleId } from '../types/puzzle';
import { getPuzzleEngine } from '../puzzleEngine/puzzleEngine';

export interface NotationItem {
  move: string;
  desc: string;
  dir: 'CW' | 'CCW' | 'DOUBLE';
  face: string;
}

export interface LearnSection {
  title: string;
  content: string;
  bullets?: string[];
}

export interface SolutionStepItem {
  number: number;
  title: string;
  desc: string;
  detail?: string;
}

export interface PuzzleLearnContent {
  puzzleId: PuzzleId;
  title: string;
  howToHold: {
    description: string;
    bullets: string[];
  };
  colorLayout: {
    description: string;
    opposites?: string[];
  };
  solutionSteps?: SolutionStepItem[];
  parityDefinition?: string;
  notations: NotationItem[];
  tips: string[];
}

/**
 * Dynamically generates 4x4 move notation from the app's real puzzleEngine
 * ensuring descriptions, directions, and layer names always match the player.
 */
export function get4x4DynamicNotations(): NotationItem[] {
  const eng = getPuzzleEngine('4x4');
  const allMoves = [
    // Outer layers
    'R', "R'", 'R2',
    'L', "L'", 'L2',
    'U', "U'", 'U2',
    'D', "D'", 'D2',
    'F', "F'", 'F2',
    'B', "B'", 'B2',
    // Wide turns (two layers together)
    'Rw', "Rw'", 'Rw2',
    'Lw', "Lw'", 'Lw2',
    'Uw', "Uw'", 'Uw2',
    'Dw', "Dw'", 'Dw2',
    'Fw', "Fw'", 'Fw2',
    'Bw', "Bw'", 'Bw2',
    // Inner slice single turns (lowercase notation)
    'r', "r'", 'r2',
    'l', "l'", 'l2',
    'u', "u'", 'u2',
    'd', "d'", 'd2',
    'f', "f'", 'f2',
    'b', "b'", 'b2',
    // Inner slice numerical prefix (2R notation alias)
    '2R', "2R'", '2R2',
    '2L', "2L'", '2L2',
    '2U', "2U'", '2U2',
    '2D', "2D'", '2D2',
    '2F', "2F'", '2F2',
    '2B', "2B'", '2B2',
  ];

  return allMoves.map((m) => {
    const info = eng.getMove(m);
    const desc = info?.fullInstruction || `Turn ${m}`;
    const dir: 'CW' | 'CCW' | 'DOUBLE' = info?.isDouble ? 'DOUBLE' : info?.isCCW ? 'CCW' : 'CW';
    const face = info?.layerName || 'Layer';
    return {
      move: m,
      desc,
      dir,
      face,
    };
  });
}

export const PUZZLE_LEARN_CONTENT: Record<PuzzleId, PuzzleLearnContent> = {
  '3x3': {
    puzzleId: '3x3',
    title: '3x3 Cube',
    howToHold: {
      description: 'When entering colours or following the step-by-step solution, hold your cube steadily with:',
      bullets: [
        'WHITE centre pointing UP (Top face)',
        'GREEN centre facing directly toward YOU (Front face)',
        'RED centre on your RIGHT, and ORANGE centre on your LEFT',
        'BLUE centre on the BACK, and YELLOW centre on the BOTTOM',
      ],
    },
    colorLayout: {
      description: 'Standard Western colour scheme opposite pairs:',
      opposites: [
        'White is opposite Yellow',
        'Green is opposite Blue',
        'Red is opposite Orange',
      ],
    },
    notations: [
      { move: 'R', desc: 'Turn Right face clockwise 90°', dir: 'CW', face: 'Right' },
      { move: "R'", desc: 'Turn Right face counter-clockwise 90°', dir: 'CCW', face: 'Right' },
      { move: 'R2', desc: 'Turn Right face 180° (half turn)', dir: 'DOUBLE', face: 'Right' },
      { move: 'L', desc: 'Turn Left face clockwise 90°', dir: 'CW', face: 'Left' },
      { move: "L'", desc: 'Turn Left face counter-clockwise 90°', dir: 'CCW', face: 'Left' },
      { move: 'U', desc: 'Turn Top face clockwise 90°', dir: 'CW', face: 'Top' },
      { move: "U'", desc: 'Turn Top face counter-clockwise 90°', dir: 'CCW', face: 'Top' },
      { move: 'D', desc: 'Turn Bottom face clockwise 90°', dir: 'CW', face: 'Bottom' },
      { move: "D'", desc: 'Turn Bottom face counter-clockwise 90°', dir: 'CCW', face: 'Bottom' },
      { move: 'F', desc: 'Turn Front face clockwise 90°', dir: 'CW', face: 'Front' },
      { move: "F'", desc: 'Turn Front face counter-clockwise 90°', dir: 'CCW', face: 'Front' },
      { move: 'B', desc: 'Turn Back face clockwise 90°', dir: 'CW', face: 'Back' },
      { move: "B'", desc: 'Turn Back face counter-clockwise 90°', dir: 'CCW', face: 'Back' },
    ],
    tips: [
      'Every turn is clockwise when looking directly at that face.',
      'An apostrophe (\') means prime: turn counter-clockwise.',
      'A number 2 (like R2) means turn 180° in either direction.',
    ],
  },

  '2x2': {
    puzzleId: '2x2',
    title: '2x2 Pocket Cube',
    howToHold: {
      description: 'The 2x2 has 8 corners and no fixed centre pieces. SolvaCube normalises orientation for you:',
      bullets: [
        'Hold the cube with WHITE on Top and GREEN facing you if possible',
        'If your cube has different colours, SolvaCube automatically tracks the reference corner',
        'Keep the same orientation throughout the solution steps',
      ],
    },
    colorLayout: {
      description: 'Opposite colour pairs are identical to the 3x3:',
      opposites: [
        'White is opposite Yellow',
        'Green is opposite Blue',
        'Red is opposite Orange',
      ],
    },
    notations: [
      { move: 'R', desc: 'Turn Right layer clockwise 90°', dir: 'CW', face: 'Right' },
      { move: "R'", desc: 'Turn Right layer counter-clockwise 90°', dir: 'CCW', face: 'Right' },
      { move: 'R2', desc: 'Turn Right layer 180°', dir: 'DOUBLE', face: 'Right' },
      { move: 'U', desc: 'Turn Top layer clockwise 90°', dir: 'CW', face: 'Top' },
      { move: "U'", desc: 'Turn Top layer counter-clockwise 90°', dir: 'CCW', face: 'Top' },
      { move: 'U2', desc: 'Turn Top layer 180°', dir: 'DOUBLE', face: 'Top' },
      { move: 'F', desc: 'Turn Front layer clockwise 90°', dir: 'CW', face: 'Front' },
      { move: "F'", desc: 'Turn Front layer counter-clockwise 90°', dir: 'CCW', face: 'Front' },
      { move: 'F2', desc: 'Turn Front layer 180°', dir: 'DOUBLE', face: 'Front' },
    ],
    tips: [
      '2x2 solutions only require R, U, and F turns.',
      'Always keep your grip steady without rotating the whole cube in your hands.',
    ],
  },

  'pyraminx': {
    puzzleId: 'pyraminx',
    title: 'Pyraminx',
    howToHold: {
      description: 'Hold the pyramid with one vertex pointing straight UP:',
      bullets: [
        'Top vertex (U) points UP toward the ceiling',
        'Front face (F) faces directly toward YOU',
        'Right vertex (R) is on your right, and Left vertex (L) is on your left',
        'Back vertex (B) points directly away from you',
        'Bottom face (D) is horizontal on the bottom',
      ],
    },
    colorLayout: {
      description: 'SolvaCube works with ANY brand or colour scheme:',
      opposites: [
        'The 4 axial center pieces determine the solved color of each face',
        'The color missing from an axial is the color of the face opposite that vertex',
        'Both standard and mirror-image color layouts are fully supported',
      ],
    },
    notations: [
      { move: 'U', desc: 'Turn Top corner (tip + middle layer) clockwise 120°', dir: 'CW', face: 'Top Corner' },
      { move: "U'", desc: 'Turn Top corner (tip + middle layer) counter-clockwise 120°', dir: 'CCW', face: 'Top Corner' },
      { move: 'u', desc: 'Twist just the Top tip clockwise 120°', dir: 'CW', face: 'Top Tip' },
      { move: "u'", desc: 'Twist just the Top tip counter-clockwise 120°', dir: 'CCW', face: 'Top Tip' },
      { move: 'L', desc: 'Turn Left corner (tip + middle layer) clockwise 120°', dir: 'CW', face: 'Left Corner' },
      { move: "L'", desc: 'Turn Left corner (tip + middle layer) counter-clockwise 120°', dir: 'CCW', face: 'Left Corner' },
      { move: 'l', desc: 'Twist just the Left tip clockwise 120°', dir: 'CW', face: 'Left Tip' },
      { move: "l'", desc: 'Twist just the Left tip counter-clockwise 120°', dir: 'CCW', face: 'Left Tip' },
      { move: 'R', desc: 'Turn Right corner (tip + middle layer) clockwise 120°', dir: 'CW', face: 'Right Corner' },
      { move: "R'", desc: 'Turn Right corner (tip + middle layer) counter-clockwise 120°', dir: 'CCW', face: 'Right Corner' },
      { move: 'r', desc: 'Twist just the Right tip clockwise 120°', dir: 'CW', face: 'Right Tip' },
      { move: "r'", desc: 'Twist just the Right tip counter-clockwise 120°', dir: 'CCW', face: 'Right Tip' },
      { move: 'B', desc: 'Turn Back corner (tip + middle layer) clockwise 120°', dir: 'CW', face: 'Back Corner' },
      { move: "B'", desc: 'Turn Back corner (tip + middle layer) counter-clockwise 120°', dir: 'CCW', face: 'Back Corner' },
      { move: 'b', desc: 'Twist just the Back tip clockwise 120°', dir: 'CW', face: 'Back Tip' },
      { move: "b'", desc: 'Twist just the Back tip counter-clockwise 120°', dir: 'CCW', face: 'Back Tip' },
    ],
    tips: [
      'Uppercase letters (U, L, R, B) turn the vertex tip PLUS the middle layer.',
      'Lowercase letters (u, l, r, b) twist only the small corner point.',
      'Clockwise is defined looking from outside the vertex toward the center.',
    ],
  },
  '4x4': {
    puzzleId: '4x4',
    title: '4x4 Revenge Cube',
    howToHold: {
      description: 'The 4x4 has no fixed centres, so orientation comes strictly from the corners. Pick a reference pair like White on Top and Green in Front, and maintain that exact orientation steadily throughout all steps:',
      bullets: [
        'White on Top and Green facing you (or any fixed colour pair)',
        'Orientation comes from the corners (no fixed centres), so keep the same orientation throughout',
        'Keep your grip steady without rotating the whole cube between steps',
      ],
    },
    colorLayout: {
      description: 'With no fixed centres, the 8 corner pieces determine the true colour layout:',
      opposites: [
        'White is opposite Yellow',
        'Green is opposite Blue',
        'Red is opposite Orange',
      ],
    },
    solutionSteps: [
      {
        number: 1,
        title: 'Solve Centres',
        desc: 'Group the 2×2 centre blocks on all 6 faces using inner slice and wide turns.',
      },
      {
        number: 2,
        title: 'Pair Edges',
        desc: 'Match all 12 edge pairs (24 edge pieces into composite 2×1 edge blocks).',
      },
      {
        number: 3,
        title: '3x3 Stage',
        desc: 'Solve the cube like a standard 3x3 using only outer layer turns.',
      },
      {
        number: 4,
        title: 'Fix Parities',
        desc: 'Resolve special 4x4 states using slice algorithms.',
        detail: 'A state impossible on a 3x3 caused by edge/corner swaps within the extra slices.',
      },
    ],
    parityDefinition: 'A state impossible on a 3x3 caused by edge/corner swaps within the extra slices.',
    get notations(): NotationItem[] {
      return get4x4DynamicNotations();
    },
    tips: [
      'Outer face moves (R, U, F, D, L, B) turn only the single outermost layer.',
      'Wide turns (Rw, Uw, Fw, Dw, Lw, Bw) turn the outer two layers together.',
      'Inner slice turns (r / 2R, u / 2U, etc.) turn only the second layer from that face.',
      "An apostrophe (') denotes prime (counter-clockwise), and 2 denotes a 180° half turn.",
    ],
  },
};


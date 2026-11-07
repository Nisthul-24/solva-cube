import { PuzzleId } from '../types/puzzle';

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
  notations: NotationItem[];
  tips: string[];
}

export const PUZZLE_LEARN_CONTENT: Record<PuzzleId, PuzzleLearnContent> = {
  '3x3': {
    puzzleId: '3x3',
    title: "3x3 Rubik's Cube",
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
      description: 'Hold the 4x4 with the derived orientation:',
      bullets: [
        'Top face pointing UP (determined by your cube scheme)',
        'Front face facing directly toward YOU',
        'Keep the same orientation during each stage',
      ],
    },
    colorLayout: {
      description: 'The 4x4 has no fixed centers; the 8 corner pieces define the color layout:',
      opposites: [
        'Colors that never appear together on a corner are opposite pairs',
        'Cyclic corner order defines chirality (right-handed vs left-handed)',
        'Works with standard, Japanese, and any brand layout',
      ],
    },
    notations: [
      { move: 'R', desc: 'Turn outer RIGHT layer 90° clockwise (upwards)', dir: 'CW', face: 'Right' },
      { move: "R'", desc: 'Turn outer RIGHT layer 90° counter-clockwise (downwards)', dir: 'CCW', face: 'Right' },
      { move: 'Rw', desc: 'Turn two RIGHT layers 90° clockwise (wide turn)', dir: 'CW', face: 'Right Wide' },
      { move: "Rw'", desc: 'Turn two RIGHT layers 90° counter-clockwise', dir: 'CCW', face: 'Right Wide' },
      { move: 'r', desc: 'Turn inner RIGHT slice 90° clockwise (second layer)', dir: 'CW', face: 'Inner Right' },
      { move: "r'", desc: 'Turn inner RIGHT slice 90° counter-clockwise', dir: 'CCW', face: 'Inner Right' },
      { move: 'U', desc: 'Turn outer TOP layer 90° clockwise', dir: 'CW', face: 'Top' },
      { move: 'Uw', desc: 'Turn two TOP layers 90° clockwise (wide turn)', dir: 'CW', face: 'Top Wide' },
      { move: 'u', desc: 'Turn inner TOP slice 90° clockwise', dir: 'CW', face: 'Inner Top' },
      { move: 'F', desc: 'Turn outer FRONT layer 90° clockwise', dir: 'CW', face: 'Front' },
      { move: 'Fw', desc: 'Turn two FRONT layers 90° clockwise (wide turn)', dir: 'CW', face: 'Front Wide' },
      { move: 'f', desc: 'Turn inner FRONT slice 90° clockwise', dir: 'CW', face: 'Inner Front' },
    ],
    tips: [
      'Outer face moves (R, U, F, etc.) turn only the single outermost layer.',
      'Wide moves (Rw, Uw, Fw, etc.) turn the outer two layers together.',
      'Inner slice moves (r, u, f, etc.) turn only the second layer from the face.',
    ],
  },
};


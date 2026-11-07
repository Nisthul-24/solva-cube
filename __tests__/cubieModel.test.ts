import {
  CubieCubeModel,
  invertMoves,
  MOVE_TURN_TABLE,
} from '../src/components/3d/cubieModel';

describe('Pure-TS 3D Cubie Model & Move Table (Requirement A.10)', () => {
  test('R moves the front-right edge up', () => {
    const cube = new CubieCubeModel();
    // Front-Right edge initial pos: x = 1, y = 0, z = 1
    const fr = cube.findCubieAt(1, 0, 1);
    expect(fr).toBeDefined();

    cube.applyMove('R');

    // After R, that piece must be at Top-Right: x = 1, y = 1, z = 0 (y moved UP from 0 to 1)
    expect(fr?.x).toBe(1);
    expect(fr?.y).toBe(1);
    expect(fr?.z).toBe(0);
  });

  test('L moves the front-left edge down', () => {
    const cube = new CubieCubeModel();
    // Front-Left edge initial pos: x = -1, y = 0, z = 1
    const fl = cube.findCubieAt(-1, 0, 1);
    expect(fl).toBeDefined();

    cube.applyMove('L');

    // After L, that piece must be at Bottom-Left: x = -1, y = -1, z = 0 (y moved DOWN from 0 to -1)
    expect(fl?.x).toBe(-1);
    expect(fl?.y).toBe(-1);
    expect(fl?.z).toBe(0);
  });

  test('U moves the front-top edge left', () => {
    const cube = new CubieCubeModel();
    // Front-Top edge initial pos: x = 0, y = 1, z = 1
    const ft = cube.findCubieAt(0, 1, 1);
    expect(ft).toBeDefined();

    cube.applyMove('U');

    // After U, that piece must be at Left-Top: x = -1, y = 1, z = 0 (x moved LEFT from 0 to -1)
    expect(ft?.x).toBe(-1);
    expect(ft?.y).toBe(1);
    expect(ft?.z).toBe(0);
  });

  test('D moves the front-bottom edge right', () => {
    const cube = new CubieCubeModel();
    // Front-Bottom edge initial pos: x = 0, y = -1, z = 1
    const fb = cube.findCubieAt(0, -1, 1);
    expect(fb).toBeDefined();

    cube.applyMove('D');

    // After D, that piece must be at Right-Bottom: x = 1, y = -1, z = 0 (x moved RIGHT from 0 to 1)
    expect(fb?.x).toBe(1);
    expect(fb?.y).toBe(-1);
    expect(fb?.z).toBe(0);
  });

  test('F turns front face clockwise (top edge moves right)', () => {
    const cube = new CubieCubeModel();
    // Top-Front edge pos: x = 0, y = 1, z = 1
    const tf = cube.findCubieAt(0, 1, 1);
    cube.applyMove('F');
    // Top-Front edge should move to Right-Front: x = 1, y = 0, z = 1
    expect(tf?.x).toBe(1);
    expect(tf?.y).toBe(0);
    expect(tf?.z).toBe(1);
  });

  test('B turns back layer (top edge moves left)', () => {
    const cube = new CubieCubeModel();
    // Top-Back edge pos: x = 0, y = 1, z = -1
    const tb = cube.findCubieAt(0, 1, -1);
    cube.applyMove('B');
    // Top-Back edge should move to Left-Back: x = -1, y = 0, z = -1
    expect(tb?.x).toBe(-1);
    expect(tb?.y).toBe(0);
    expect(tb?.z).toBe(-1);
  });

  test('Applying a random scramble, then its inverse, leaves the cube solved (100 runs)', () => {
    const ALL_MOVES = [
      'R', "R'", 'R2',
      'L', "L'", 'L2',
      'U', "U'", 'U2',
      'D', "D'", 'D2',
      'F', "F'", 'F2',
      'B', "B'", 'B2',
    ];

    for (let trial = 0; trial < 100; trial++) {
      const cube = new CubieCubeModel();
      expect(cube.isSolved()).toBe(true);

      // Generate random scramble of 25 moves
      const scramble: string[] = [];
      for (let i = 0; i < 25; i++) {
        const move = ALL_MOVES[Math.floor(Math.random() * ALL_MOVES.length)];
        scramble.push(move);
      }

      // Apply scramble
      cube.applyMoves(scramble);

      // Invert scramble
      const inverse = invertMoves(scramble);
      cube.applyMoves(inverse);

      // Must be solved!
      expect(cube.isSolved()).toBe(true);
    }
  });
});


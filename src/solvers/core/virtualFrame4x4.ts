import { FaceName3x3 } from '../../components/3d/cubieModel';

export type CubeOrientation = {
  U: FaceName3x3;
  D: FaceName3x3;
  F: FaceName3x3;
  B: FaceName3x3;
  L: FaceName3x3;
  R: FaceName3x3;
};

export const IDENTITY_ORIENTATION: CubeOrientation = {
  U: 'U',
  D: 'D',
  F: 'F',
  B: 'B',
  L: 'L',
  R: 'R',
};

// Rotations along x (around R), y (around U), z (around F)
export function rotateOrientationX(o: CubeOrientation, quarterTurns = 1): CubeOrientation {
  const turns = ((quarterTurns % 4) + 4) % 4;
  let cur = { ...o };
  for (let t = 0; t < turns; t++) {
    // x rotation: U -> B -> D -> F -> U; L and R stay L and R
    const next: CubeOrientation = {
      U: cur.F,
      D: cur.B,
      F: cur.D,
      B: cur.U,
      L: cur.L,
      R: cur.R,
    };
    cur = next;
  }
  return cur;
}

export function rotateOrientationY(o: CubeOrientation, quarterTurns = 1): CubeOrientation {
  const turns = ((quarterTurns % 4) + 4) % 4;
  let cur = { ...o };
  for (let t = 0; t < turns; t++) {
    // y rotation: F -> L -> B -> R -> F; U and D stay U and D
    const next: CubeOrientation = {
      U: cur.U,
      D: cur.D,
      F: cur.R,
      B: cur.L,
      L: cur.F,
      R: cur.B,
    };
    cur = next;
  }
  return cur;
}

export function rotateOrientationZ(o: CubeOrientation, quarterTurns = 1): CubeOrientation {
  const turns = ((quarterTurns % 4) + 4) % 4;
  let cur = { ...o };
  for (let t = 0; t < turns; t++) {
    // z rotation: U -> R -> D -> L -> U; F and B stay F and B
    const next: CubeOrientation = {
      U: cur.L,
      D: cur.R,
      F: cur.F,
      B: cur.B,
      L: cur.D,
      R: cur.U,
    };
    cur = next;
  }
  return cur;
}

/**
 * Virtual Frame maintaining rotation frame R in SO(3).
 * Maps virtual moves to physical moves without emitting whole-cube rotations.
 */
export class VirtualFrame4x4 {
  private orientation: CubeOrientation;

  constructor(initialOrientation: CubeOrientation = IDENTITY_ORIENTATION) {
    this.orientation = { ...initialOrientation };
  }

  public getOrientation(): CubeOrientation {
    return { ...this.orientation };
  }

  public setOrientation(o: CubeOrientation) {
    this.orientation = { ...o };
  }

  public rotateX(quarterTurns = 1) {
    this.orientation = rotateOrientationX(this.orientation, quarterTurns);
  }

  public rotateY(quarterTurns = 1) {
    this.orientation = rotateOrientationY(this.orientation, quarterTurns);
  }

  public rotateZ(quarterTurns = 1) {
    this.orientation = rotateOrientationZ(this.orientation, quarterTurns);
  }

  /**
   * Absorbs a whole-cube rotation (e.g. from ROT_MAP or pair rotation):
   * 'x' (Rw Lw'), 'y' (Uw Dw'), 'z' (Fw Bw')
   */
  public absorbRotation(axis: 'x' | 'y' | 'z', amount: number) {
    if (axis === 'x') this.rotateX(amount);
    else if (axis === 'y') this.rotateY(amount);
    else if (axis === 'z') this.rotateZ(amount);
  }

  /**
   * Maps a virtual face name ('U', 'D', 'F', 'B', 'L', 'R') to the current physical face.
   */
  public mapFace(virtualFace: FaceName3x3): FaceName3x3 {
    return this.orientation[virtualFace];
  }

  /**
   * Maps a virtual move notation (e.g. "r", "U'", "Fw2") to physical move notation.
   */
  public mapMove(virtualMove: string): string {
    const virtualFaceChar = virtualMove[0];
    const isLower = virtualFaceChar === virtualFaceChar.toLowerCase();
    const vFace = virtualFaceChar.toUpperCase() as FaceName3x3;

    const physicalFace = this.orientation[vFace] || vFace;
    const physicalFaceChar = isLower ? physicalFace.toLowerCase() : physicalFace;

    const rest = virtualMove.slice(1);
    return `${physicalFaceChar}${rest}`;
  }
}


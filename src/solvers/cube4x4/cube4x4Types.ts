import { FaceName3x3, Axis } from '../../components/3d/cubieModel';
import { CubeColor } from '../../types/puzzle';

export type Cube4x4FaceName = FaceName3x3;

export interface Cube4x4State {
  U: CubeColor[]; // 16 stickers
  R: CubeColor[]; // 16 stickers
  F: CubeColor[]; // 16 stickers
  D: CubeColor[]; // 16 stickers
  L: CubeColor[]; // 16 stickers
  B: CubeColor[]; // 16 stickers
}

export interface TurnInfo4x4 {
  axis: Axis;
  layers: number[]; // indices 0..3 along axis
  angle: number; // in radians
  direction: 'CW' | 'CCW' | 'DOUBLE';
  layerName: string;
  wording: string;
}


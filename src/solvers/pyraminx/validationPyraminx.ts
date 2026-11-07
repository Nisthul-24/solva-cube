import { ValidationResult } from '../../types/puzzle';
import { PyraminxState } from './pyraminxFacelets';
import {
  validatePyraminxDerived,
  PyraminxValidationResult,
  PYRAMINX_AXIAL_DEFS,
  PYRAMINX_EDGE_DEFS,
} from './pyraminxDerivedTarget';

export {
  PYRAMINX_AXIAL_DEFS,
  PYRAMINX_EDGE_DEFS,
  PyraminxValidationResult,
};

export const PYRAMINX_PHYSICAL_EDGES = PYRAMINX_EDGE_DEFS.map((e) => ({
  name: e.name,
  f1: e.fA,
  i1: e.iA,
  f2: e.fB,
  i2: e.iB,
}));

export const PYRAMINX_PHYSICAL_AXIALS = PYRAMINX_AXIAL_DEFS.map((a) => ({
  name: a.name,
  f1: a.stickers[0].face,
  i1: a.stickers[0].index,
  f2: a.stickers[1].face,
  i2: a.stickers[1].index,
  f3: a.stickers[2].face,
  i3: a.stickers[2].index,
}));

export function validatePyraminxState(state: PyraminxState): ValidationResult {
  return validatePyraminxDerived(state);
}

import { Vec3 } from '../solvers/pyraminx/pyraminxGeometry';
import { getPuzzleEngine, EngineMove, getStandardMoveNotation } from './puzzleEngine';

/**
 * StepPlan: Single immutable source of truth for an active solution step.
 * Introduced in Step 2 to guarantee that animation, highlight, arrow, label chip,
 * wording text, turn icon, camera, state update, and 2D net view all operate
 * on the exact same layer, axis, angle, and cubie set.
 */
export interface StepPlan {
  readonly id: string;
  readonly stepIndex: number;
  readonly emittedMove: string;
  readonly layers: number[];
  readonly axis: Vec3;
  readonly axisName: 'x' | 'y' | 'z';
  readonly angle: number;
  readonly cubieIds: string[];
  readonly turningPieceSet: Set<string>;
  readonly outwardNormal: Vec3;
  readonly arrowCenter: Vec3;
  readonly arrowRadius: number;
  readonly layerCentroid: Vec3;
  readonly chipLabel: string;
  readonly wordingText: string;
  readonly layerName: string;
  readonly runId: number;
}

/**
 * Creates an immutable StepPlan for a given step.
 * Built strictly once from emittedMove via the engine.
 */
export function createStepPlan(
  puzzleId: '4x4' | 'pyraminx',
  stepIndex: number,
  emittedMove: string | null | undefined,
  runId: number = 0
): StepPlan | null {
  if (!emittedMove) return null;
  try {
    const eng = getPuzzleEngine(puzzleId);
    const m: EngineMove | undefined = eng.getMove(emittedMove);
    if (!m) return null;

    const id = `plan_${puzzleId}_step${stepIndex}_${emittedMove}_run${runId}`;
    const layers = m.layers ? [...m.layers] : [3];
    const axis: Vec3 = [m.axis[0], m.axis[1], m.axis[2]];
    const axisName = m.axisName || 'y';
    const angle = m.angle;
    const cubieIds = [...m.turningPieceIds];
    const turningPieceSet = new Set(m.turningPieceIds);
    const outwardNormal: Vec3 = m.outwardNormal
      ? [m.outwardNormal[0], m.outwardNormal[1], m.outwardNormal[2]]
      : [axis[0], axis[1], axis[2]];
    const arrowCenter: Vec3 = [m.arrowCenter[0], m.arrowCenter[1], m.arrowCenter[2]];
    const arrowRadius = m.arrowRadius;
    const layerCentroid: Vec3 = [m.layerCentroid[0], m.layerCentroid[1], m.layerCentroid[2]];

    const chipLabel = getStandardMoveNotation(puzzleId, emittedMove);
    const wordingText = m.fullInstruction || m.wording || emittedMove;
    const layerName = m.layerName || emittedMove;

    const plan: StepPlan = Object.freeze({
      id,
      stepIndex,
      emittedMove,
      layers,
      axis,
      axisName,
      angle,
      cubieIds,
      turningPieceSet,
      outwardNormal,
      arrowCenter,
      arrowRadius,
      layerCentroid,
      chipLabel,
      wordingText,
      layerName,
      runId,
    });

    return plan;
  } catch (err) {
    return null;
  }
}


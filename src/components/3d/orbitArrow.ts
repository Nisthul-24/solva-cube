import {
  Vec3,
  normalize,
  cross,
  add,
  scale,
  sub,
} from '../../solvers/pyraminx/pyraminxGeometry';

// Orthonormal basis for any axis A: U perpendicular to A, V = A × U
export function getOrthonormalBasis(A: Vec3): { A: Vec3; U: Vec3; V: Vec3 } {
  const aNorm = normalize(A);
  // Pick reference vector least parallel to A
  const ref: Vec3 = Math.abs(aNorm[1]) < 0.88 ? [0, 1, 0] : [1, 0, 0];
  const U = normalize(cross(ref, aNorm));
  const V = cross(aNorm, U);
  return { A: aNorm, U, V };
}

/**
 * Builds flat ribbon orbit arc and planar triangular arrowhead in the plane of the arc.
 * Orbit arrow floats strictly outside the puzzle cross section so it is never hidden by it:
 * - Radius = 1.18 x half-diagonal of turning slab cross section (1.25 x circumradius for Pyraminx)
 * - Flat ribbon width = 0.22 x cubie size
 * - Triangular head length = 0.70 x cubie size
 * - Head orientation = normalized last segment tangent
 */
export function buildOrbitArrow(
  c: Vec3,
  A: Vec3,
  U: Vec3,
  V: Vec3,
  radius: number,
  angleRad: number,
  ribbonWidth: number,
  headLength: number,
  headWidth: number,
  sweepRad: number,
  midAngle = 0
) {
  const sign = angleRad < 0 ? -1 : 1;
  const tStart = midAngle - sign * (sweepRad / 2);
  const tEnd = midAngle + sign * (sweepRad / 2);

  const steps = 36;
  const arcPoints: Vec3[] = [];

  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const t = tStart + s * (tEnd - tStart);
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    arcPoints.push([
      c[0] + radius * (U[0] * cosT + V[0] * sinT),
      c[1] + radius * (U[1] * cosT + V[1] * sinT),
      c[2] + radius * (U[2] * cosT + V[2] * sinT),
    ]);
  }

  // End tangent from the last two points (guarantees arrowhead matches arc exactly)
  const pLast = arcPoints[arcPoints.length - 1];
  const pPrev = arcPoints[arcPoints.length - 2];
  const endTangent = normalize(sub(pLast, pPrev));

  // Normal in the plane of the arc (perpendicular to tangent and A)
  const arcPlaneNormal = normalize(cross(A, endTangent));

  // Arrowhead: tip along endTangent, base corners along arcPlaneNormal
  const tipPos = add(pLast, scale(endTangent, headLength));
  const baseLeft = add(pLast, scale(arcPlaneNormal, -headWidth / 2));
  const baseRight = add(pLast, scale(arcPlaneNormal, headWidth / 2));

  // Outline arrowhead (slightly larger)
  const outlineL = headLength * 1.25;
  const outlineW = headWidth * 1.35;
  const outlineTip = add(pLast, scale(endTangent, outlineL));
  const outlineLeft = add(pLast, scale(arcPlaneNormal, -outlineW / 2));
  const outlineRight = add(pLast, scale(arcPlaneNormal, outlineW / 2));

  // 1. Arrowhead geometry (2 triangles: front and back side for DoubleSide visibility)
  const headPositions = new Float32Array([
    tipPos[0], tipPos[1], tipPos[2],
    baseLeft[0], baseLeft[1], baseLeft[2],
    baseRight[0], baseRight[1], baseRight[2],

    tipPos[0], tipPos[1], tipPos[2],
    baseRight[0], baseRight[1], baseRight[2],
    baseLeft[0], baseLeft[1], baseLeft[2],
  ]);

  const headOutlinePositions = new Float32Array([
    outlineTip[0], outlineTip[1], outlineTip[2],
    outlineLeft[0], outlineLeft[1], outlineLeft[2],
    outlineRight[0], outlineRight[1], outlineRight[2],

    outlineTip[0], outlineTip[1], outlineTip[2],
    outlineRight[0], outlineRight[1], outlineRight[2],
    outlineLeft[0], outlineLeft[1], outlineLeft[2],
  ]);

  // 2. Flat Ribbon Arc Mesh (quad strip along arc points in plane of A, U, V)
  function makeRibbonStrip(w: number) {
    const halfW = w / 2;
    const tris: number[] = [];

    for (let i = 0; i < steps; i++) {
      const s1 = i / steps;
      const s2 = (i + 1) / steps;
      const t1 = tStart + s1 * (tEnd - tStart);
      const t2 = tStart + s2 * (tEnd - tStart);

      const rad1: Vec3 = [U[0] * Math.cos(t1) + V[0] * Math.sin(t1), U[1] * Math.cos(t1) + V[1] * Math.sin(t1), U[2] * Math.cos(t1) + V[2] * Math.sin(t1)];
      const rad2: Vec3 = [U[0] * Math.cos(t2) + V[0] * Math.sin(t2), U[1] * Math.cos(t2) + V[1] * Math.sin(t2), U[2] * Math.cos(t2) + V[2] * Math.sin(t2)];

      // Inner and outer points
      const p1In = add(c, scale(rad1, radius - halfW));
      const p1Out = add(c, scale(rad1, radius + halfW));
      const p2In = add(c, scale(rad2, radius - halfW));
      const p2Out = add(c, scale(rad2, radius + halfW));

      // Two triangles per quad (front & back)
      tris.push(
        p1In[0], p1In[1], p1In[2],
        p1Out[0], p1Out[1], p1Out[2],
        p2Out[0], p2Out[1], p2Out[2],

        p1In[0], p1In[1], p1In[2],
        p2Out[0], p2Out[1], p2Out[2],
        p2In[0], p2In[1], p2In[2],

        // Back faces
        p1In[0], p1In[1], p1In[2],
        p2Out[0], p2Out[1], p2Out[2],
        p1Out[0], p1Out[1], p1Out[2],

        p1In[0], p1In[1], p1In[2],
        p2In[0], p2In[1], p2In[2],
        p2Out[0], p2Out[1], p2Out[2],
      );
    }
    return new Float32Array(tris);
  }

  const ribbonPositions = makeRibbonStrip(ribbonWidth);
  const ribbonOutlinePositions = makeRibbonStrip(ribbonWidth + 0.08);

  return {
    arcPoints,
    endTangent,
    arrowhead: { tip: tipPos, left: baseLeft, right: baseRight },
    ribbonPositions,
    ribbonOutlinePositions,
    headPositions,
    headOutlinePositions,
  };
}

export type OrbitArrowData = ReturnType<typeof buildOrbitArrow>;

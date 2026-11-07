import { getPuzzleTurnInfo } from '../src/components/3d/puzzleTurnInfo';
import {
  Vec3,
  dot,
  cross,
  normalize,
  sub,
  add,
  scale,
  rotateAroundAxis,
} from '../src/solvers/pyraminx/pyraminxGeometry';

describe('4x4 Move Arrows: Render-Level Direction Test', () => {
  // All 4x4 move notations: outer, wide, inner
  const ALL_4X4_MOVES = [
    'U', "U'", 'U2', 'Uw', "Uw'", 'Uw2', 'u', "u'", 'u2',
    'D', "D'", 'D2', 'Dw', "Dw'", 'Dw2', 'd', "d'", 'd2',
    'R', "R'", 'R2', 'Rw', "Rw'", 'Rw2', 'r', "r'", 'r2',
    'L', "L'", 'L2', 'Lw', "Lw'", 'Lw2', 'l', "l'", 'l2',
    'F', "F'", 'F2', 'Fw', "Fw'", 'Fw2', 'f', "f'", 'f2',
    'B', "B'", 'B2', 'Bw', "Bw'", 'Bw2', 'b', "b'", 'b2',
  ];

  // 8 diagonal camera directions
  const CAM_DIRS: Vec3[] = [
    normalize([1, 1, 1]),
    normalize([-1, 1, 1]),
    normalize([1, -1, 1]),
    normalize([-1, -1, 1]),
    normalize([1, 1, -1]),
    normalize([-1, 1, -1]),
    normalize([1, -1, -1]),
    normalize([-1, -1, -1]),
  ];

  function projectToViewPlane(v: Vec3, camDir: Vec3): Vec3 {
    // Project vector v onto the plane perpendicular to camDir (screen plane)
    const d = dot(v, camDir);
    return sub(v, scale(camDir, d));
  }

  test('All 4x4 moves: arrow direction agrees with piece animation at 12% progress', () => {
    let testedCount = 0;

    for (const move of ALL_4X4_MOVES) {
      const info = getPuzzleTurnInfo('4x4', move);
      const { axis, angleRad, arcCenter, arcPoints } = info;

      // Arrow tangent at beginning (progress 0)
      const arrowTangent = normalize(sub(arcPoints[1], arcPoints[0]));

      // Test point on the arrow arc at 12% progress:
      const p12 = arcPoints[Math.floor(arcPoints.length * 0.12)];

      // Piece velocity / displacement at p12:
      // In animation: p(t) rotates around axis by angleRad * t
      // Instantaneous velocity: v = angleRad * (axis x (p - arcCenter))
      const radiusVec = sub(p12, arcCenter);
      const pieceVelocity = scale(cross(axis, radiusVec), angleRad);

      for (const cam of CAM_DIRS) {
        // Only evaluate views where the rotation is not edge-on and layer is facing camera
        // Viewing dot:
        const viewDot = Math.abs(dot(axis, cam));
        if (viewDot < 0.25) continue; // too close to edge-on for this camera

        // Project arrow tangent and piece velocity onto camera screen plane
        const projArrow = normalize(projectToViewPlane(arrowTangent, cam));
        const projPiece = normalize(projectToViewPlane(pieceVelocity, cam));

        const screenDot = dot(projArrow, projPiece);
        // Tangent and piece velocity must point in the same direction on screen:
        // dot > 0 and angle < 60° (cos 60° = 0.5)
        expect(screenDot).toBeGreaterThan(0.5);
        testedCount++;
      }
    }

    console.log(`Successfully verified ${testedCount} camera/move view projections!`);
    expect(testedCount).toBeGreaterThan(100);
  });

  test('Intentional sign flip PROVES failure (catch reversed arrows)', () => {
    // If we intentionally flip the sign of angleRad on R:
    const info = getPuzzleTurnInfo('4x4', 'R');
    const { axis, angleRad, arcCenter, arcPoints } = info;
    const arrowTangent = normalize(sub(arcPoints[1], arcPoints[0]));

    // WRONG piece velocity (deliberate sign flip):
    const p12 = arcPoints[Math.floor(arcPoints.length * 0.12)];
    const radiusVec = sub(p12, arcCenter);
    const flippedPieceVelocity = scale(cross(axis, radiusVec), -angleRad);

    const cam = normalize([1, 1, 1]);
    const projArrow = normalize(projectToViewPlane(arrowTangent, cam));
    const projFlipped = normalize(projectToViewPlane(flippedPieceVelocity, cam));

    const screenDot = dot(projArrow, projFlipped);
    // MUST FAIL (screenDot must be negative or < 0)
    expect(screenDot).toBeLessThan(0);
  });
});

import {
  turnInfo,
  computeArrowArc,
  getArrowBasis,
  Axis,
} from '../src/components/3d/cubieModel';

// Vector math helpers for test
function cross(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

describe('Issue 1: Arrow direction agreement for all 18 moves', () => {
  const ALL_18_MOVES = [
    'R', "R'", 'R2',
    'L', "L'", 'L2',
    'U', "U'", 'U2',
    'D', "D'", 'D2',
    'F', "F'", 'F2',
    'B', "B'", 'B2',
  ];

  test('All 18 moves have arrowEndTangent matching rotational velocity at the arrow end', () => {
    for (const move of ALL_18_MOVES) {
      const { axis, layer, angle } = turnInfo(move);
      const { A } = getArrowBasis(axis);
      const sign = angle < 0 ? -1 : 1;

      // Angular velocity vector along axis
      const omega: [number, number, number] = [
        A[0] * sign,
        A[1] * sign,
        A[2] * sign,
      ];

      // Compute arrow arc
      const { endPos, endTangent } = computeArrowArc(move);

      // Compute physical velocity of the point at the arrow's end:
      // v = omega x point
      const velocity = cross(omega, endPos);

      // Tangent in direction of travel must agree with physical velocity
      const alignment = dot(velocity, endTangent);

      expect(alignment).toBeGreaterThan(0);
    }
  });

  test('turnInfo matches exact required specification table', () => {
    expect(turnInfo('R')).toEqual({ axis: 'x', layer: 1, angle: -Math.PI / 2 });
    expect(turnInfo("R'")).toEqual({ axis: 'x', layer: 1, angle: Math.PI / 2 });
    expect(turnInfo('R2')).toEqual({ axis: 'x', layer: 1, angle: -Math.PI });

    expect(turnInfo('L')).toEqual({ axis: 'x', layer: -1, angle: Math.PI / 2 });
    expect(turnInfo("L'")).toEqual({ axis: 'x', layer: -1, angle: -Math.PI / 2 });
    expect(turnInfo('L2')).toEqual({ axis: 'x', layer: -1, angle: Math.PI });

    expect(turnInfo('U')).toEqual({ axis: 'y', layer: 1, angle: -Math.PI / 2 });
    expect(turnInfo("U'")).toEqual({ axis: 'y', layer: 1, angle: Math.PI / 2 });
    expect(turnInfo('U2')).toEqual({ axis: 'y', layer: 1, angle: -Math.PI });

    expect(turnInfo('D')).toEqual({ axis: 'y', layer: -1, angle: Math.PI / 2 });
    expect(turnInfo("D'")).toEqual({ axis: 'y', layer: -1, angle: -Math.PI / 2 });
    expect(turnInfo('D2')).toEqual({ axis: 'y', layer: -1, angle: Math.PI });

    expect(turnInfo('F')).toEqual({ axis: 'z', layer: 1, angle: -Math.PI / 2 });
    expect(turnInfo("F'")).toEqual({ axis: 'z', layer: 1, angle: Math.PI / 2 });
    expect(turnInfo('F2')).toEqual({ axis: 'z', layer: 1, angle: -Math.PI });

    expect(turnInfo('B')).toEqual({ axis: 'z', layer: -1, angle: Math.PI / 2 });
    expect(turnInfo("B'")).toEqual({ axis: 'z', layer: -1, angle: -Math.PI / 2 });
    expect(turnInfo('B2')).toEqual({ axis: 'z', layer: -1, angle: Math.PI });
  });
});


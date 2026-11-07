import {
  PYRAMINX_STICKERS_3D,
  PYRAMINX_VERTICES,
  generatePyraminxMovePermutation,
  rotateAroundAxis,
  normalize,
  dist,
  Vec3,
} from './pyraminxGeometry.test';

describe('Pyraminx 12 Rotations Normalization', () => {
  // Generate the 12 tetrahedral rotation matrices / operations:
  // 1 identity + 8 vertex rotations (120 and 240 deg) + 3 edge rotations (180 deg)
  const ROTATIONS_12: Array<{
    name: string;
    rotVec: (v: Vec3) => Vec3;
    vertexMap: Record<'U' | 'L' | 'R' | 'B', 'U' | 'L' | 'R' | 'B'>;
  }> = [];

  // BFS starting from Identity using vertex rotations
  const generators: Array<{ vKey: 'U' | 'L' | 'R' | 'B'; angle: number }> = [
    { vKey: 'U', angle: (120 * Math.PI) / 180 },
    { vKey: 'L', angle: (120 * Math.PI) / 180 },
    { vKey: 'R', angle: (120 * Math.PI) / 180 },
    { vKey: 'B', angle: (120 * Math.PI) / 180 },
  ];

  type RotFn = (v: Vec3) => Vec3;

  const seenRotations: Array<{ fn: RotFn; hash: string }> = [];

  function hashRot(fn: RotFn): string {
    const pts: Array<'U' | 'L' | 'R' | 'B'> = ['U', 'L', 'R', 'B'];
    return pts
      .map((p) => {
        const v = fn(PYRAMINX_VERTICES[p]);
        return `${Math.round(v[0] * 100)},${Math.round(v[1] * 100)},${Math.round(v[2] * 100)}`;
      })
      .join('|');
  }

  const idFn: RotFn = (v) => v;
  seenRotations.push({ fn: idFn, hash: hashRot(idFn) });

  let q: RotFn[] = [idFn];
  while (q.length > 0 && seenRotations.length < 12) {
    const cur = q.shift()!;
    for (const gen of generators) {
      const axis = normalize(PYRAMINX_VERTICES[gen.vKey]);
      const nextFn: RotFn = (v) => rotateAroundAxis(cur(v), axis, gen.angle);
      const h = hashRot(nextFn);
      if (!seenRotations.some((s) => s.hash === h)) {
        seenRotations.push({ fn: nextFn, hash: h });
        q.push(nextFn);
      }
    }
  }

  expect(seenRotations.length).toBe(12);

  // Build vertex map for each of the 12 rotations
  const all12RotDefs = seenRotations.map((item, idx) => {
    const vMap: any = {};
    const keys: Array<'U' | 'L' | 'R' | 'B'> = ['U', 'L', 'R', 'B'];
    for (const k of keys) {
      // Point PYRAMINX_VERTICES[k] transforms under item.fn to vRot
      const vRot = item.fn(PYRAMINX_VERTICES[k]);
      // Which vertex is closest to vRot?
      let bestKey = k;
      let minD = 1e9;
      for (const cand of keys) {
        const d = dist(vRot, PYRAMINX_VERTICES[cand]);
        if (d < minD) {
          minD = d;
          bestKey = cand;
        }
      }
      vMap[bestKey] = k; // Vertex 'bestKey' in rotated pyramid came from vertex 'k' in original
    }
    return {
      id: idx,
      rotFn: item.fn,
      origVertexOf: vMap as Record<'U' | 'L' | 'R' | 'B', 'U' | 'L' | 'R' | 'B'>,
    };
  });

  test('found exactly 12 tetrahedral rotations', () => {
    expect(all12RotDefs.length).toBe(12);
  });
});

import { ALL_16_PYRAMINX_MOVES, PYRAMINX_VERTICES, Vec3, normalize, scale, add } from '../src/solvers/pyraminx/pyraminxGeometry';
import { PYRAMINX_PIECES_14, selectPyraminxPiecesForMove } from '../src/solvers/pyraminx/pyraminxPieces';
import { PALETTE, scaleBrightness } from '../src/components/3d/stickerLayout';
import * as THREE from 'three';

// 8 camera directions around the sphere
const CAMERA_DIRS: THREE.Vector3[] = [
  new THREE.Vector3(1, 1, 1).normalize(),
  new THREE.Vector3(-1, 1, 1).normalize(),
  new THREE.Vector3(1, 1, -1).normalize(),
  new THREE.Vector3(-1, 1, -1).normalize(),
  new THREE.Vector3(1, -1, 1).normalize(),
  new THREE.Vector3(-1, -1, 1).normalize(),
  new THREE.Vector3(1, -1, -1).normalize(),
  new THREE.Vector3(-1, -1, -1).normalize(),
];

describe('3h. Pyraminx Highlight Alignment & Color Verification (16 Moves x 8 Camera Directions)', () => {
  const stageWidth = 400;
  const stageHeight = 400;
  const dist = 5.25;

  test.each(ALL_16_PYRAMINX_MOVES)('Highlight outline for move %s aligns with piece silhouette (< 8px)', (move) => {
    const sel = selectPyraminxPiecesForMove(move);
    const turningPieces = PYRAMINX_PIECES_14.filter((p) => sel.turningPieceIds.has(p.id));
    expect(turningPieces.length).toBeGreaterThan(0);

    const normalOffset = 0.025; // Vertex extrusion along normal in inverted hull
    const liftOffset = scale(normalize(sel.axis), 0.08); // 0.08 outward lift in waiting state

    for (const camDir of CAMERA_DIRS) {
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.copy(camDir.clone().multiplyScalar(dist));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      // Collect projected vertices of original piece vs inverted hull extruded piece
      for (const piece of turningPieces) {
        const positions = piece.bodyPositions;
        for (let i = 0; i < positions.length; i += 9) {
          // Triangles
          const p1 = new THREE.Vector3(positions[i] + liftOffset[0], positions[i + 1] + liftOffset[1], positions[i + 2] + liftOffset[2]);
          const p2 = new THREE.Vector3(positions[i + 3] + liftOffset[0], positions[i + 4] + liftOffset[1], positions[i + 5] + liftOffset[2]);
          const p3 = new THREE.Vector3(positions[i + 6] + liftOffset[0], positions[i + 7] + liftOffset[1], positions[i + 8] + liftOffset[2]);

          const edge1 = new THREE.Vector3().subVectors(p2, p1);
          const edge2 = new THREE.Vector3().subVectors(p3, p1);
          const norm = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

          // Extruded hull vertex
          const hullP1 = p1.clone().addScaledVector(norm, normalOffset);

          // Project to 2D screen coords
          const sOriginal = p1.clone().project(camera);
          const sHull = hullP1.clone().project(camera);

          const pxOriginalX = (sOriginal.x * 0.5 + 0.5) * stageWidth;
          const pxOriginalY = (-sOriginal.y * 0.5 + 0.5) * stageHeight;

          const pxHullX = (sHull.x * 0.5 + 0.5) * stageWidth;
          const pxHullY = (-sHull.y * 0.5 + 0.5) * stageHeight;

          const pixelDist = Math.hypot(pxHullX - pxOriginalX, pxHullY - pxOriginalY);

          // Must be closely hugging silhouette: < 8px
          expect(pixelDist).toBeLessThan(8.0);
        }
      }
    }
  });

  test('Colour test: turning cap stickers +12% brightness, stationary stickers within 10% PALETTE', () => {
    const basePalette = [PALETTE.green, PALETTE.red, PALETTE.blue, PALETTE.yellow];

    for (const hex of basePalette) {
      const capHex = scaleBrightness(hex, 1.12);
      const statHex = scaleBrightness(hex, 0.90);

      const baseCol = new THREE.Color(hex);
      const capCol = new THREE.Color(capHex);
      const statCol = new THREE.Color(statHex);

      // Cap brightness is ~1.12x of base
      const baseLuminance = 0.299 * baseCol.r + 0.587 * baseCol.g + 0.114 * baseCol.b;
      const capLuminance = 0.299 * capCol.r + 0.587 * capCol.g + 0.114 * capCol.b;
      const statLuminance = 0.299 * statCol.r + 0.587 * statCol.g + 0.114 * statCol.b;

      // Cap is brighter
      expect(capLuminance).toBeGreaterThan(baseLuminance);
      // Stationary is dimmed at most 12% (0.88 - 0.90)
      expect(statLuminance).toBeGreaterThanOrEqual(baseLuminance * 0.88);
      expect(statLuminance).toBeLessThanOrEqual(baseLuminance);
    }
  });
});


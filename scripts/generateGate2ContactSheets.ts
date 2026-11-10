import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { getPuzzleEngine, EngineMove } from '../src/puzzleEngine/puzzleEngine';
import { getNearestAcceptableCamera } from '../src/components/3d/CameraRig';
import { PALETTE, scaleBrightness } from '../src/components/3d/stickerLayout';
import * as THREE from 'three';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';
const MOVES_PER_SHEET = 12;

interface SheetMoveData {
  name: string;
  wording: string;
  axis: [number, number, number];
  angle: number;
  isDouble: boolean;
  turningPieceIds: string[];
  cameraAzimuth: number;
  cameraElevation: number;
  arrow: {
    ribbonPositions: number[];
    ribbonOutlinePositions: number[];
    headPositions: number[];
    headOutlinePositions: number[];
    headTip: [number, number, number];
  } | null;
  belt: {
    size: [number, number, number];
    position: [number, number, number];
  } | null;
}

// Prepare serializable move data
function prepareMoveData(puzzleId: '4x4' | 'pyraminx', m: EngineMove): SheetMoveData {
  const defaultCam = puzzleId === 'pyraminx'
    ? new THREE.Vector3(1, 1, 1).normalize()
    : new THREE.Vector3(1, 0.8, 1).normalize();

  const { targetDir } = getNearestAcceptableCamera(puzzleId, m.name, defaultCam, 'always');
  const az = Math.atan2(targetDir.x, targetDir.z);
  const el = Math.asin(Math.max(-1, Math.min(1, targetDir.y)));

  const eng = getPuzzleEngine(puzzleId);
  const wording = eng.wording(m.name).fullInstruction;

  let beltData: SheetMoveData['belt'] = null;
  if (puzzleId === '4x4' && m.axisName) {
    const axisIdx = m.axisName === 'x' ? 0 : m.axisName === 'y' ? 1 : 2;
    let minC = Infinity, maxC = -Infinity;
    for (const p of eng.pieces) {
      if (m.turningPieceSet.has(p.id)) {
        const c = p.homeCentroid[axisIdx];
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
    const slabMin = minC - 0.5;
    const slabMax = maxC + 0.5;
    const slabThickness = Math.abs(slabMax - slabMin);
    const midCoord = (slabMin + slabMax) / 2;
    const margin = 0.02;
    const fullW = 4.0 + 2 * margin; // 4.04
    const thick = slabThickness + 2 * margin;

    let size: [number, number, number] = [fullW, fullW, fullW];
    let pos: [number, number, number] = [0, 0, 0];
    if (m.axisName === 'x') { size[0] = thick; pos[0] = midCoord; }
    else if (m.axisName === 'y') { size[1] = thick; pos[1] = midCoord; }
    else { size[2] = thick; pos[2] = midCoord; }
    beltData = { size, position: pos };
  }

  let arrowData: SheetMoveData['arrow'] = null;
  if (m.arrow) {
    arrowData = {
      ribbonPositions: Array.from(m.arrow.ribbonPositions),
      ribbonOutlinePositions: Array.from(m.arrow.ribbonOutlinePositions),
      headPositions: Array.from(m.arrow.headPositions),
      headOutlinePositions: Array.from(m.arrow.headOutlinePositions),
      headTip: [m.arrow.arrowhead.tip[0], m.arrow.arrowhead.tip[1], m.arrow.arrowhead.tip[2]],
    };
  }

  return {
    name: m.name,
    wording,
    axis: m.axis,
    angle: m.angle,
    isDouble: m.isDouble,
    turningPieceIds: m.turningPieceIds,
    cameraAzimuth: az,
    cameraElevation: el,
    arrow: arrowData,
    belt: beltData,
  };
}

async function run() {
  console.log('Generating Gate 2 Contact Sheets...');
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--use-gl=angle', '--enable-webgl'],
  });

  const threeModulePath = path.resolve('node_modules/three/build/three.module.js').replace(/\\/g, '/');

  // Process puzzles: 4x4 then Pyraminx
  const puzzles: ('4x4' | 'pyraminx')[] = ['4x4', 'pyraminx'];

  for (const puzzleId of puzzles) {
    const eng = getPuzzleEngine(puzzleId);
    const moves = Array.from(eng.moves.values());
    const totalSheets = Math.ceil(moves.length / MOVES_PER_SHEET);

    for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
      const sheetMoves = moves.slice(sheetIdx * MOVES_PER_SHEET, (sheetIdx + 1) * MOVES_PER_SHEET);
      const movesData = sheetMoves.map((m) => prepareMoveData(puzzleId, m));

      // Build standalone HTML for this sheet
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${puzzleId.toUpperCase()} Contact Sheet ${sheetIdx + 1}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #070B14;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
      width: 1400px;
    }
    .header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #F8FAFC;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 13px;
      color: #94A3B8;
      margin-top: 4px;
    }
    .rows-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .move-row {
      background: #0F172A;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 14px;
    }
    .row-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .move-badge {
      background: #22d3ee;
      color: #070B14;
      font-weight: 900;
      font-size: 14px;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 0.3px;
    }
    .wording {
      font-size: 14px;
      font-weight: 600;
      color: #E2E8F0;
    }
    .frames-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .frame-box {
      background: #0B1120;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }
    .frame-title {
      font-size: 10px;
      font-weight: 700;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .canvas-slot {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 6px;
      background: #070B14;
      display: block;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">SolvaCube Move Animation Gallery · ${puzzleId === '4x4' ? '4x4 Revenge' : 'Pyraminx'} · Sheet ${sheetIdx + 1} of ${totalSheets}</div>
    <div class="subtitle">Unified puzzleEngine · Auto view camera · Waiting (belt + arrow) | 25% | 50% | 100% · Moves ${sheetIdx * MOVES_PER_SHEET + 1}–${sheetIdx * MOVES_PER_SHEET + sheetMoves.length} of ${moves.length}</div>
  </div>

  <div class="rows-container">
    ${movesData.map((m, mIdx) => `
      <div class="move-row">
        <div class="row-header">
          <div class="move-badge">${m.name}</div>
          <div class="wording">${m.wording}</div>
        </div>
        <div class="frames-grid">
          <div class="frame-box">
            <div class="frame-title">Waiting (Arrow + Belt)</div>
            <canvas id="c_${mIdx}_0" class="canvas-slot" width="300" height="300"></canvas>
          </div>
          <div class="frame-box">
            <div class="frame-title">25% Turn</div>
            <canvas id="c_${mIdx}_1" class="canvas-slot" width="300" height="300"></canvas>
          </div>
          <div class="frame-box">
            <div class="frame-title">50% Turn</div>
            <canvas id="c_${mIdx}_2" class="canvas-slot" width="300" height="300"></canvas>
          </div>
          <div class="frame-box">
            <div class="frame-title">100% Turn</div>
            <canvas id="c_${mIdx}_3" class="canvas-slot" width="300" height="300"></canvas>
          </div>
        </div>
      </div>
    `).join('')}
  </div>

  <script type="module">
    import * as THREE from 'file:///${threeModulePath}';

    const puzzleId = '${puzzleId}';
    const movesData = ${JSON.stringify(movesData)};
    const PALETTE = ${JSON.stringify(PALETTE)};

    // Create single reusable WebGL renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(300, 300);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Helper: Build 4x4 scene
    function build4x4Scene(m, progress, isWaiting) {
      const scene = new THREE.Scene();

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const d1 = new THREE.DirectionalLight(0xffffff, 0.85);
      d1.position.set(5, 8, 5);
      scene.add(d1);
      const d2 = new THREE.DirectionalLight(0xffffff, 0.45);
      d2.position.set(-5, -4, -5);
      scene.add(d2);

      const mainGroup = new THREE.Group();
      mainGroup.scale.set(0.75, 0.75, 0.75);
      scene.add(mainGroup);

      const pivot = new THREE.Group();
      mainGroup.add(pivot);

      const boxGeom = new THREE.BoxGeometry(0.96, 0.96, 0.96);
      const darkBodyMat = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.35 });

      const stickerPlanes = {
        U: { rot: [-Math.PI/2, 0, 0], pos: [0, 0.485, 0], color: PALETTE.white },
        D: { rot: [Math.PI/2, 0, 0], pos: [0, -0.485, 0], color: PALETTE.yellow },
        F: { rot: [0, 0, 0], pos: [0, 0, 0.485], color: PALETTE.green },
        B: { rot: [0, Math.PI, 0], pos: [0, 0, -0.485], color: PALETTE.blue },
        R: { rot: [0, Math.PI/2, 0], pos: [0.485, 0, 0], color: PALETTE.red },
        L: { rot: [0, -Math.PI/2, 0], pos: [-0.485, 0, 0], color: PALETTE.orange },
      };
      const stickerGeom = new THREE.PlaneGeometry(0.86, 0.86);

      const coords = [-1.5, -0.5, 0.5, 1.5];
      const turningSet = new Set(m.turningPieceIds);

      for (const x of coords) {
        for (const y of coords) {
          for (const z of coords) {
            const id = 'c4_' + x + '_' + y + '_' + z;
            const isTurning = turningSet.has(id);

            const cubieGroup = new THREE.Group();
            cubieGroup.position.set(x, y, z);
            cubieGroup.add(new THREE.Mesh(boxGeom, darkBodyMat));

            const addSticker = (faceKey) => {
              const info = stickerPlanes[faceKey];
              const mat = new THREE.MeshStandardMaterial({
                color: isTurning ? info.color : info.color,
                roughness: 0.25,
                metalness: 0.05,
                side: THREE.DoubleSide,
              });
              const stMesh = new THREE.Mesh(stickerGeom, mat);
              stMesh.position.set(...info.pos);
              stMesh.rotation.set(...info.rot);
              cubieGroup.add(stMesh);
            };

            if (y === 1.5) addSticker('U');
            if (y === -1.5) addSticker('D');
            if (z === 1.5) addSticker('F');
            if (z === -1.5) addSticker('B');
            if (x === 1.5) addSticker('R');
            if (x === -1.5) addSticker('L');

            if (isTurning && progress > 0 && progress < 1.0) {
              pivot.add(cubieGroup);
            } else {
              mainGroup.add(cubieGroup);
            }
          }
        }
      }

      if (progress > 0 && progress < 1.0) {
        const axisVec = new THREE.Vector3(...m.axis).normalize();
        pivot.setRotationFromAxisAngle(axisVec, m.angle * progress);
      }

      // Waiting visual extras
      if (isWaiting) {
        if (m.belt) {
          const beltGeom = new THREE.BoxGeometry(...m.belt.size);
          const beltMat = new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x22d3ee,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.45,
            roughness: 0.2,
          });
          const beltMesh = new THREE.Mesh(beltGeom, beltMat);
          beltMesh.position.set(...m.belt.position);
          mainGroup.add(beltMesh);
        }

        if (m.arrow) {
          const arrowGroup = new THREE.Group();
          const cyanMat = new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            emissive: 0x00e5ff,
            emissiveIntensity: 0.9,
            side: THREE.DoubleSide,
          });
          const outlineMat = new THREE.MeshBasicMaterial({ color: 0x071626, side: THREE.DoubleSide });

          const ribbonGeom = new THREE.BufferGeometry();
          ribbonGeom.setAttribute('position', new THREE.Float32BufferAttribute(m.arrow.ribbonPositions, 3));
          arrowGroup.add(new THREE.Mesh(ribbonGeom, cyanMat));

          const ribbonOutlineGeom = new THREE.BufferGeometry();
          ribbonOutlineGeom.setAttribute('position', new THREE.Float32BufferAttribute(m.arrow.ribbonOutlinePositions, 3));
          arrowGroup.add(new THREE.Mesh(ribbonOutlineGeom, outlineMat));

          const headGeom = new THREE.BufferGeometry();
          headGeom.setAttribute('position', new THREE.Float32BufferAttribute(m.arrow.headPositions, 3));
          arrowGroup.add(new THREE.Mesh(headGeom, cyanMat));

          const headOutlineGeom = new THREE.BufferGeometry();
          headOutlineGeom.setAttribute('position', new THREE.Float32BufferAttribute(m.arrow.headOutlinePositions, 3));
          arrowGroup.add(new THREE.Mesh(headOutlineGeom, outlineMat));

          mainGroup.add(arrowGroup);
        }
      }

      return scene;
    }

    // Helper: Build Pyraminx scene
    function buildPyraminxScene(m, progress, isWaiting) {
      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 0.85));
      const d1 = new THREE.DirectionalLight(0xffffff, 0.95);
      d1.position.set(5, 8, 5);
      scene.add(d1);

      const mainGroup = new THREE.Group();
      scene.add(mainGroup);

      const pivot = new THREE.Group();
      mainGroup.add(pivot);

      // Model size 2.8284, cap lift 0.056 (<= 0.02 * model size, gapless turn)
      const axisNorm = new THREE.Vector3(...m.axis).normalize();
      if (isWaiting) {
        pivot.position.copy(axisNorm.clone().multiplyScalar(0.056));
      }

      const V = [
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(-1, 1, -1),
        new THREE.Vector3(-1, -1, 1),
      ];

      // Simplified tetrahedron piece mesh
      const makeTetra = (apex, p1, p2, p3, colorHex) => {
        const geom = new THREE.BufferGeometry();
        const pts = [
          apex.x, apex.y, apex.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
          apex.x, apex.y, apex.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z,
          apex.x, apex.y, apex.z, p3.x, p3.y, p3.z, p1.x, p1.y, p1.z,
          p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z,
        ];
        geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        geom.computeVertexNormals();

        const grp = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.35 });
        grp.add(new THREE.Mesh(geom, bodyMat));

        const stMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.25,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        grp.add(new THREE.Mesh(geom, stMat));
        return grp;
      };

      const turningSet = new Set(m.turningPieceIds);
      const isTip = m.name[0] === m.name[0].toLowerCase();
      const cut = isTip ? 0.33 : 0.67;

      // 4 vertex caps
      const colors = [PALETTE.green, PALETTE.red, PALETTE.blue, PALETTE.yellow];
      for (let i = 0; i < 4; i++) {
        const apex = V[i];
        const others = V.filter((_, idx) => idx !== i);
        const b0 = apex.clone().lerp(others[0], cut);
        const b1 = apex.clone().lerp(others[1], cut);
        const b2 = apex.clone().lerp(others[2], cut);

        const pieceMesh = makeTetra(apex, b0, b1, b2, colors[i]);
        const pieceId = 'tip_' + i;
        if (turningSet.has(pieceId) || (isTip && i === 0)) {
          if (progress > 0 && progress < 1.0) {
            pivot.add(pieceMesh);
          } else {
            (isWaiting ? pivot : mainGroup).add(pieceMesh);
          }
        } else {
          mainGroup.add(pieceMesh);
        }
      }

      // Base body
      const baseMesh = makeTetra(
        V[0].clone().multiplyScalar(0.4),
        V[1].clone().multiplyScalar(0.7),
        V[2].clone().multiplyScalar(0.7),
        V[3].clone().multiplyScalar(0.7),
        0x1e293b
      );
      mainGroup.add(baseMesh);

      if (progress > 0 && progress < 1.0) {
        pivot.setRotationFromAxisAngle(axisNorm, m.angle * progress);
      }

      if (isWaiting && m.arrow) {
        const arrowGroup = new THREE.Group();
        const cyanMat = new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x00e5ff,
          emissiveIntensity: 0.9,
          side: THREE.DoubleSide,
        });
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x071626, side: THREE.DoubleSide });

        const ribbonGeom = new THREE.BufferGeometry();
        ribbonGeom.setAttribute('position', new THREE.Float32BufferAttribute(m.arrow.ribbonPositions, 3));
        arrowGroup.add(new THREE.Mesh(ribbonGeom, cyanMat));

        const headGeom = new THREE.BufferGeometry();
        headGeom.setAttribute('position', new THREE.Float32BufferAttribute(m.arrow.headPositions, 3));
        arrowGroup.add(new THREE.Mesh(headGeom, cyanMat));

        mainGroup.add(arrowGroup);
      }

      return scene;
    }

    // Render all frames sequentially using single WebGL context
    async function renderAll() {
      for (let mIdx = 0; mIdx < movesData.length; mIdx++) {
        const m = movesData[mIdx];

        // Camera setup: FOV 32, Auto view pose
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        const dist = puzzleId === 'pyraminx' ? 7.35 : 8.6;
        const cx = dist * Math.cos(m.cameraElevation) * Math.sin(m.cameraAzimuth);
        const cy = dist * Math.sin(m.cameraElevation);
        const cz = dist * Math.cos(m.cameraElevation) * Math.cos(m.cameraAzimuth);
        camera.position.set(cx, cy, cz);
        camera.lookAt(0, 0, 0);

        const configs = [
          { progress: 0, isWaiting: true },
          { progress: 0.25, isWaiting: false },
          { progress: 0.50, isWaiting: false },
          { progress: 1.00, isWaiting: false },
        ];

        for (let fIdx = 0; fIdx < 4; fIdx++) {
          const cfg = configs[fIdx];
          const scene = puzzleId === 'pyraminx'
            ? buildPyraminxScene(m, cfg.progress, cfg.isWaiting)
            : build4x4Scene(m, cfg.progress, cfg.isWaiting);

          renderer.render(scene, camera);

          // Copy WebGL rendered frame to 2D canvas slot
          const targetCanvas = document.getElementById('c_' + mIdx + '_' + fIdx);
          const ctx2d = targetCanvas.getContext('2d');
          ctx2d.drawImage(renderer.domElement, 0, 0);
        }
      }
      window.__RENDERING_DONE = true;
    }

    renderAll();
  </script>
</body>
</html>`;

      const tmpHtmlPath = path.resolve(`temp_sheet_${puzzleId}_${sheetIdx}.html`);
      fs.writeFileSync(tmpHtmlPath, html);

      const page = await browser.newPage({
        viewport: { width: 1450, height: 1800 },
      });

      await page.goto('file:///' + tmpHtmlPath.replace(/\\/g, '/'));
      await page.waitForFunction(() => (window as any).__RENDERING_DONE === true, { timeout: 30000 });
      await page.waitForTimeout(500);

      const outFilename = `gallery_${puzzleId}_sheet${sheetIdx + 1}.png`;
      const outPath = path.join(ARTIFACTS_DIR, outFilename);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Saved contact sheet: ${outFilename} (${sheetMoves.length} moves)`);

      await page.close();
      fs.unlinkSync(tmpHtmlPath);
    }
  }

  await browser.close();
  console.log('All Gate 2 contact sheets generated successfully!');
}

run().catch((err) => {
  console.error('Error generating contact sheets:', err);
  process.exit(1);
});

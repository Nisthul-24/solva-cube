import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { getPuzzleEngine, EngineMove } from '../src/puzzleEngine/puzzleEngine';
import { getNearestAcceptableCamera } from '../src/components/3d/CameraRig';
import { PALETTE } from '../src/components/3d/stickerLayout';
import * as THREE from 'three';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

// The 7 requested moves
const TARGET_7_MOVES = [
  '2R',   // Inner right slice
  '2U2',  // Inner top slice x2
  '2L',   // Inner left slice
  '2D',   // Inner bottom slice
  'R',    // Outer right layer
  'U',    // Outer top layer
  "F'",   // Outer front layer CCW
];

interface MoveData {
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
}

function prepareMoveData(m: EngineMove): MoveData {
  const defaultCam = new THREE.Vector3(1, 0.8, 1).normalize();
  const { targetDir } = getNearestAcceptableCamera('4x4', m.name, defaultCam, 'always');
  const az = Math.atan2(targetDir.x, targetDir.z);
  const el = Math.asin(Math.max(-1, Math.min(1, targetDir.y)));

  const eng = getPuzzleEngine('4x4');
  const wording = eng.wording(m.name).fullInstruction;

  let arrowData: MoveData['arrow'] = null;
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
  };
}

async function run() {
  console.log('Generating SolvaCube 4x4 Contact Sheet for Step 4...');
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const eng = getPuzzleEngine('4x4');
  const movesData: MoveData[] = [];
  for (const name of TARGET_7_MOVES) {
    const m = eng.getMove(name);
    if (!m) throw new Error(`Move not found: ${name}`);
    movesData.push(prepareMoveData(m));
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--allow-file-access-from-files', '--use-gl=angle', '--enable-webgl'],
  });

  const threeModulePath = path.resolve('node_modules/three/build/three.module.js').replace(/\\/g, '/');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SolvaCube 4x4 Step 4 Contact Sheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0F19;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
      width: 1400px;
    }
    .header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #1E293B;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #F8FAFC;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #94A3B8;
      line-height: 1.4;
    }
    .rows-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .move-row {
      background: #111827;
      border: 1px solid #1F2937;
      border-radius: 12px;
      padding: 16px;
    }
    .row-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .move-badge {
      background: #0284C7;
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .wording {
      font-size: 15px;
      font-weight: 600;
      color: #E2E8F0;
    }
    .frames-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .frame-box {
      background: #070B14;
      border: 1px solid #1E293B;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .frame-title {
      font-size: 11px;
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
    <div class="title">SolvaCube 4x4 Contact Sheet (Step 4 Proof)</div>
    <div class="subtitle">
      7 Key Moves: Inner right slice (2R), Inner top slice x2 (2U2), Inner left slice (2L), Inner bottom slice (2D), R, U, F'<br/>
      Frames: Waiting (Arrow + Outline), 25% Turn (Moving Layer Highlighted), 50% Turn (Moving Layer Highlighted), 100% Turn (Completed)
    </div>
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
            <div class="frame-title">Waiting (Arrow + Outline)</div>
            <canvas id="c_${mIdx}_0" class="canvas-slot" width="310" height="310"></canvas>
          </div>
          <div class="frame-box">
            <div class="frame-title">25% Turn (Highlighted)</div>
            <canvas id="c_${mIdx}_1" class="canvas-slot" width="310" height="310"></canvas>
          </div>
          <div class="frame-box">
            <div class="frame-title">50% Turn (Highlighted)</div>
            <canvas id="c_${mIdx}_2" class="canvas-slot" width="310" height="310"></canvas>
          </div>
          <div class="frame-box">
            <div class="frame-title">100% Turn</div>
            <canvas id="c_${mIdx}_3" class="canvas-slot" width="310" height="310"></canvas>
          </div>
        </div>
      </div>
    `).join('')}
  </div>

  <script type="module">
    import * as THREE from 'file:///${threeModulePath}';

    const movesData = ${JSON.stringify(movesData)};
    const PALETTE = ${JSON.stringify(PALETTE)};

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(310, 310);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    function build4x4Scene(m, progress, isWaiting, isHighlighted) {
      const scene = new THREE.Scene();

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const d1 = new THREE.DirectionalLight(0xffffff, 0.9);
      d1.position.set(5, 8, 5);
      scene.add(d1);
      const d2 = new THREE.DirectionalLight(0xffffff, 0.4);
      d2.position.set(-5, -4, -5);
      scene.add(d2);

      const mainGroup = new THREE.Group();
      mainGroup.scale.set(0.68, 0.68, 0.68);
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

      // Inverted hull material for moving mesh outline highlight (Requirement 1b)
      const outlineMat = new THREE.ShaderMaterial({
        vertexShader: \`
          uniform float offset;
          void main() {
            vec3 transformed = position + normal * offset;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
          }
        \`,
        fragmentShader: \`
          void main() {
            gl_FragColor = vec4(0.133, 0.827, 0.933, 1.0); // #22d3ee cyan
          }
        \`,
        uniforms: { offset: { value: 0.045 } },
        side: THREE.BackSide,
        depthTest: true,
      });

      const coords = [-1.5, -0.5, 0.5, 1.5];
      const turningSet = new Set(m.turningPieceIds);

      for (const x of coords) {
        for (const y of coords) {
          for (const z of coords) {
            const id = 'c4_' + x + '_' + y + '_' + z;
            const isTurning = turningSet.has(id);

            const cubieGroup = new THREE.Group();
            cubieGroup.position.set(x, y, z);

            const body = new THREE.Mesh(boxGeom, darkBodyMat);
            cubieGroup.add(body);

            // Inverted hull outline on turning cubies in waiting state and during 25%/50% turn
            if ((isWaiting || isHighlighted) && isTurning) {
              const outlineMesh = new THREE.Mesh(boxGeom, outlineMat);
              cubieGroup.add(outlineMesh);
            }

            // Stickers
            if (y === 1.5) addSticker(cubieGroup, stickerPlanes.U);
            if (y === -1.5) addSticker(cubieGroup, stickerPlanes.D);
            if (z === 1.5) addSticker(cubieGroup, stickerPlanes.F);
            if (z === -1.5) addSticker(cubieGroup, stickerPlanes.B);
            if (x === 1.5) addSticker(cubieGroup, stickerPlanes.R);
            if (x === -1.5) addSticker(cubieGroup, stickerPlanes.L);

            if (isTurning) {
              pivot.add(cubieGroup);
            } else {
              mainGroup.add(cubieGroup);
            }
          }
        }
      }

      function addSticker(parent, conf) {
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(conf.color) });
        const mesh = new THREE.Mesh(stickerGeom, mat);
        mesh.position.set(...conf.pos);
        mesh.rotation.set(...conf.rot);
        parent.add(mesh);
      }

      // Rotate pivot
      const rotAngle = m.angle * progress;
      const rotAxis = new THREE.Vector3(...m.axis).normalize();
      pivot.quaternion.setFromAxisAngle(rotAxis, rotAngle);

      // Cyan Turn Arrow Ribbon in Waiting frame
      if (isWaiting && m.arrow) {
        const arrowGroup = new THREE.Group();

        // 1. Outline ribbon
        const ribbonOutGeom = new THREE.BufferGeometry();
        ribbonOutGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.arrow.ribbonOutlinePositions), 3));
        const outMat = new THREE.MeshBasicMaterial({ color: 0x071626, depthTest: false });
        arrowGroup.add(new THREE.Mesh(ribbonOutGeom, outMat));

        // 2. Cyan ribbon
        const ribbonGeom = new THREE.BufferGeometry();
        ribbonGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.arrow.ribbonPositions), 3));
        const cyanMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, depthTest: false });
        arrowGroup.add(new THREE.Mesh(ribbonGeom, cyanMat));

        // 3. Outline head
        const headOutGeom = new THREE.BufferGeometry();
        headOutGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.arrow.headOutlinePositions), 3));
        arrowGroup.add(new THREE.Mesh(headOutGeom, outMat));

        // 4. Cyan head
        const headGeom = new THREE.BufferGeometry();
        headGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.arrow.headPositions), 3));
        arrowGroup.add(new THREE.Mesh(headGeom, cyanMat));

        mainGroup.add(arrowGroup);
      }

      return scene;
    }

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    const frameConfigs = [
      { progress: 0.0, isWaiting: true, isHighlighted: false },
      { progress: 0.25, isWaiting: false, isHighlighted: true },
      { progress: 0.50, isWaiting: false, isHighlighted: true },
      { progress: 1.0, isWaiting: false, isHighlighted: false },
    ];

    for (let mIdx = 0; mIdx < movesData.length; mIdx++) {
      const m = movesData[mIdx];
      const radius = 4.8;
      const az = m.cameraAzimuth;
      const el = m.cameraElevation;
      const cx = radius * Math.cos(el) * Math.sin(az);
      const cy = radius * Math.sin(el);
      const cz = radius * Math.cos(el) * Math.cos(az);
      camera.position.set(cx, cy, cz);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      for (let fIdx = 0; fIdx < frameConfigs.length; fIdx++) {
        const conf = frameConfigs[fIdx];
        const scene = build4x4Scene(m, conf.progress, conf.isWaiting, conf.isHighlighted);
        renderer.render(scene, camera);

        const canvasTarget = document.getElementById('c_' + mIdx + '_' + fIdx);
        const ctx = canvasTarget.getContext('2d');
        ctx.drawImage(renderer.domElement, 0, 0);
      }
    }

    window.__CONTACT_SHEET_READY__ = true;
  </script>
</body>
</html>`;

  const tempHtmlPath = path.resolve('temp_step4_contact_sheet.html');
  fs.writeFileSync(tempHtmlPath, html, 'utf8');

  const page = await browser.newPage({ viewport: { width: 1400, height: 2600 } });
  await page.goto('file:///' + tempHtmlPath.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForFunction('window.__CONTACT_SHEET_READY__ === true', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 500));

  const outputPath = path.join(ARTIFACTS_DIR, 'gallery_4x4_step4_contact_sheet.png');
  await page.screenshot({ path: outputPath, fullPage: true });

  await browser.close();
  try { fs.unlinkSync(tempHtmlPath); } catch {}

  console.log(`Saved Step 4 contact sheet to: ${outputPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


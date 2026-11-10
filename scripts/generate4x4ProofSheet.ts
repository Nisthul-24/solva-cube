import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { getPuzzleEngine, EngineMove } from '../src/puzzleEngine/puzzleEngine';
import { getNearestAcceptableCamera } from '../src/components/3d/CameraRig';
import { PALETTE } from '../src/components/3d/stickerLayout';
import * as THREE from 'three';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

const TARGET_12_MOVES = [
  'R', "R'", 'Rw', '2R',
  'L', 'B', "B'", 'U',
  '2U', 'D', 'F', 'F2'
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
  console.log('Generating 4x4 12-Move Contact Sheet (Waiting, 50%, 100%)...');
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const eng = getPuzzleEngine('4x4');
  const movesData: MoveData[] = [];
  for (const name of TARGET_12_MOVES) {
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
  <title>4x4 Revenge 12-Move Animation Proof Gallery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0F19;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
      width: 1200px;
    }
    .header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #1E293B;
    }
    .title {
      font-size: 22px;
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
      font-size: 14px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .wording {
      font-size: 14px;
      font-weight: 600;
      color: #E2E8F0;
    }
    .frames-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
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
    <div class="title">SolvaCube 4x4 Proof Sheet · 12 Key Moves (Waiting, 50%, 100%)</div>
    <div class="subtitle">Auto View Camera · Moving Mesh Outline (Cyan) · Direction Arc on Camera Side · Moves: R, R', Rw, 2R, L, B, B', U, 2U, D, F, F2</div>
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
            <canvas id="c_${mIdx}_0" class="canvas-slot" width="340" height="340"></canvas>
          </div>
          <div class="frame-box">
            <div class="frame-title">50% Turn</div>
            <canvas id="c_${mIdx}_1" class="canvas-slot" width="340" height="340"></canvas>
          </div>
          <div class="frame-box">
            <div class="frame-title">100% Turn</div>
            <canvas id="c_${mIdx}_2" class="canvas-slot" width="340" height="340"></canvas>
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
    renderer.setSize(340, 340);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    function build4x4Scene(m, progress, isWaiting, camera) {
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
            gl_FragColor = vec4(0.133, 0.827, 0.933, 1.0); // #22d3ee
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

            // Inverted hull outline on turning cubies in waiting state
            if (isWaiting && isTurning) {
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

    // Render all frames
    for (let mIdx = 0; mIdx < movesData.length; mIdx++) {
      const m = movesData[mIdx];
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

      const radius = 6.2;
      const cx = radius * Math.cos(m.cameraElevation) * Math.sin(m.cameraAzimuth);
      const cy = radius * Math.sin(m.cameraElevation);
      const cz = radius * Math.cos(m.cameraElevation) * Math.cos(m.cameraAzimuth);
      camera.position.set(cx, cy, cz);
      camera.lookAt(0, 0, 0);

      const frames = [
        { id: \`c_\${mIdx}_0\`, progress: 0, isWaiting: true },
        { id: \`c_\${mIdx}_1\`, progress: 0.5, isWaiting: false },
        { id: \`c_\${mIdx}_2\`, progress: 1.0, isWaiting: false },
      ];

      for (const f of frames) {
        const scene = build4x4Scene(m, f.progress, f.isWaiting, camera);
        renderer.render(scene, camera);
        const canvas = document.getElementById(f.id);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(renderer.domElement, 0, 0);
      }
    }

    window.__RENDER_DONE = true;
  </script>
</body>
</html>`;

  const tmpHtmlPath = path.resolve('temp_proof_sheet_4x4.html');
  fs.writeFileSync(tmpHtmlPath, html);

  const page = await browser.newPage({ viewport: { width: 1240, height: 3800 } });
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err));

  await page.goto('file:///' + tmpHtmlPath.replace(/\\/g, '/'));
  await page.waitForFunction(() => (window as any).__RENDER_DONE === true, { timeout: 30000 });
  await page.waitForTimeout(500);

  const outPath = path.join(ARTIFACTS_DIR, 'gallery_4x4_12moves_contact_sheet.png');
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  if (fs.existsSync(tmpHtmlPath)) fs.unlinkSync(tmpHtmlPath);

  console.log('Saved 4x4 proof contact sheet to:', outPath);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

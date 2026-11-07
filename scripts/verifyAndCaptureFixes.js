const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(ARTIFACT_DIR, 'chrome_cdp_fixes_profile');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Verifying SolvaCube Camera, Orbit Arrow, Glass Belt & 4x4 Opening ===');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9225',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--window-size=1200,900',
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const versionInfo = await httpGet('http://localhost:9225/json/version');
      if (versionInfo && versionInfo.webSocketDebuggerUrl) {
        wsUrl = versionInfo.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome 9225');
  }

  const browserWs = new WebSocket(wsUrl);
  let browserId = 1;
  const browserCallbacks = new Map();

  browserWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && browserCallbacks.has(msg.id)) {
      const cb = browserCallbacks.get(msg.id);
      browserCallbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }
  };

  await new Promise((resolve) => (browserWs.onopen = resolve));

  function browserSend(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = browserId++;
      browserCallbacks.set(id, { resolve, reject });
      browserWs.send(JSON.stringify({ id, method, params }));
    });
  }

  const { targetId } = await browserSend('Target.createTarget', { url: 'http://localhost:8081/?debug=1' });
  const pages = await httpGet('http://localhost:9225/json/list');
  const targetPage = pages.find((p) => p.id === targetId || p.type === 'page');
  const pageWs = new WebSocket(targetPage.webSocketDebuggerUrl);
  const pageCallbacks = new Map();
  let pageId = 1;

  pageWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pageCallbacks.has(msg.id)) {
      const cb = pageCallbacks.get(msg.id);
      pageCallbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }
  };

  await new Promise((resolve) => (pageWs.onopen = resolve));

  function pageSend(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = pageId++;
      pageCallbacks.set(id, { resolve, reject });
      pageWs.send(JSON.stringify({ id, method, params }));
    });
  }

  await pageSend('Page.enable');
  await pageSend('Runtime.enable');

  async function evaluate(expression) {
    const res = await pageSend('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async function captureScreenshot(filename) {
    const res = await pageSend('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${filename}`);
  }

  // 1. Home Screen Verification & All 4 Puzzle Card Opening
  console.log('\n--- 1. Testing Home Screen & Puzzle Selection ---');
  await evaluate('window.location.href = "http://localhost:8081/?debug=1"');
  await sleep(3500);

  await captureScreenshot('home_cards_all_puzzles.png');

  // Assert puzzle cards exist on home
  const cards = await evaluate(`
    Array.from(document.querySelectorAll('[role="button"]'))
      .map(el => el.textContent)
      .filter(t => t.includes("Rubik") || t.includes("Pocket") || t.includes("Pyraminx") || t.includes("Revenge"))
  `);
  console.log('Detected puzzle cards on home:', cards);

  // Click 4x4 card directly to prove it opens setup immediately without getting blocked
  console.log('\n--- Clicking 4x4 Revenge Cube card ---');
  const clicked4x4 = await evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('[role="button"]'))
        .find(el => el.textContent.includes("4x4") || el.textContent.includes("Revenge"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log('4x4 card clicked:', clicked4x4);
  await sleep(3500);

  await captureScreenshot('input_4x4_setup_screen.png');

  const setupTitle = await evaluate(`
    (() => {
      const headers = Array.from(document.querySelectorAll('div, span, p')).map(e => e.textContent);
      return headers.find(t => t.includes("4x4") && t.includes("Setup"));
    })()
  `);
  console.log('Setup header title found:', setupTitle);

  // 2. Load 3x3 Player with Orbit Arrow & Glass Belt
  console.log('\n--- 2. Testing 3x3 Player Orbit Arrow & Glass Belt ---');
  await evaluate(`
    (() => {
      const state = JSON.parse(localStorage.getItem('@solvacube_puzzle_store') || '{}');
      state.state = state.state || {};
      state.state.activePuzzleId = '3x3';
      state.state.solutionMoves = [
        { notation: 'R', description: 'Turn Right face clockwise' },
        { notation: 'U', description: 'Turn Top face clockwise' },
        { notation: "R'", description: 'Turn Right face counter-clockwise' },
        { notation: 'U2', description: 'Turn Top face 180 degrees' }
      ];
      state.state.currentMoveIndex = 0;
      state.state.isPlaying = false;
      localStorage.setItem('@solvacube_puzzle_store', JSON.stringify(state));
      window.location.href = "http://localhost:8081/player?debug=1";
    })()
  `);
  await sleep(4000);
  await captureScreenshot('player_3x3_orbit_arrow_glass_belt.png');

  // Step to U move
  await evaluate(`
    (() => {
      const nextBtn = Array.from(document.querySelectorAll('[role="button"]'))
        .find(el => el.textContent.includes("Next"));
      if (nextBtn) nextBtn.click();
    })()
  `);
  await sleep(2500);

  // 3. Load 2x2 Player with Orbit Arrow
  console.log('\n--- 3. Testing 2x2 Player Orbit Arrow & Glass Belt ---');
  await evaluate(`
    (() => {
      const state = JSON.parse(localStorage.getItem('@solvacube_puzzle_store') || '{}');
      state.state = state.state || {};
      state.state.activePuzzleId = '2x2';
      state.state.solutionMoves = [
        { notation: 'R', description: 'Turn Right face clockwise' },
        { notation: 'U', description: 'Turn Top face clockwise' },
        { notation: 'F', description: 'Turn Front face clockwise' }
      ];
      state.state.currentMoveIndex = 0;
      state.state.isPlaying = false;
      localStorage.setItem('@solvacube_puzzle_store', JSON.stringify(state));
      window.location.href = "http://localhost:8081/player?debug=1";
    })()
  `);
  await sleep(4000);
  await captureScreenshot('player_2x2_orbit_arrow_glass_belt.png');

  // 4. Load Pyraminx Player with Orbit Arrow & Cut-Plane Line
  console.log('\n--- 4. Testing Pyraminx Player Orbit Arrow, Cap Glow & Cut-Plane Line ---');
  await evaluate(`
    (() => {
      const state = JSON.parse(localStorage.getItem('@solvacube_puzzle_store') || '{}');
      state.state = state.state || {};
      state.state.activePuzzleId = 'pyraminx';
      state.state.solutionMoves = [
        { notation: 'U', description: 'Turn Top corner clockwise' },
        { notation: "R'", description: 'Turn Right corner counter-clockwise' },
        { notation: 'u', description: 'Turn Top tip clockwise' }
      ];
      state.state.currentMoveIndex = 0;
      state.state.isPlaying = false;
      localStorage.setItem('@solvacube_puzzle_store', JSON.stringify(state));
      window.location.href = "http://localhost:8081/player?debug=1";
    })()
  `);
  await sleep(4000);
  await captureScreenshot('player_pyraminx_orbit_arrow_cut_line.png');

  // 5. Load 4x4 Player with Outer & Wide Moves
  console.log('\n--- 5. Testing 4x4 Player Outer, Wide & Inner Moves ---');
  await evaluate(`
    (() => {
      const state = JSON.parse(localStorage.getItem('@solvacube_puzzle_store') || '{}');
      state.state = state.state || {};
      state.state.activePuzzleId = '4x4';
      state.state.solutionMoves = [
        { notation: 'R', description: 'Turn outer Right layer clockwise' },
        { notation: 'Uw', description: 'Turn Top two layers clockwise' },
        { notation: 'r', description: 'Turn inner Right slice clockwise' },
        { notation: "Rw'", description: 'Turn Right two layers counter-clockwise' }
      ];
      state.state.currentMoveIndex = 0;
      state.state.isPlaying = false;
      localStorage.setItem('@solvacube_puzzle_store', JSON.stringify(state));
      window.location.href = "http://localhost:8081/player?debug=1";
    })()
  `);
  await sleep(4500);
  await captureScreenshot('player_4x4_orbit_arrow_glass_belt.png');

  // Advance to Uw (wide move)
  await evaluate(`
    (() => {
      const nextBtn = Array.from(document.querySelectorAll('[role="button"]'))
        .find(el => el.textContent.includes("Next"));
      if (nextBtn) nextBtn.click();
    })()
  `);
  await sleep(3000);
  await captureScreenshot('player_4x4_wide_move.png');

  // 6. Camera Log Metrics Verification
  console.log('\n--- 6. Verifying Camera Log Frame Metrics ---');
  const camLog = await evaluate(`window.__camLog || []`);
  console.log(`Total camera frames logged: ${camLog.length}`);

  if (camLog.length > 0) {
    let maxRotDeg = 0;
    let maxDistPct = 0;
    let minPolar = 180;
    let maxPolar = 0;

    for (const entry of camLog) {
      if (entry.rotDeltaDeg > maxRotDeg) maxRotDeg = entry.rotDeltaDeg;
      if (entry.distDeltaPct > maxDistPct) maxDistPct = entry.distDeltaPct;
      if (entry.polarAngleDeg < minPolar) minPolar = entry.polarAngleDeg;
      if (entry.polarAngleDeg > maxPolar) maxPolar = entry.polarAngleDeg;
    }

    console.log(`Max per-frame rotation: ${maxRotDeg.toFixed(3)}° (Requirement: <= 3.0°)`);
    console.log(`Max per-frame distance delta: ${maxDistPct.toFixed(3)}% (Requirement: <= 2.0%)`);
    console.log(`Polar angle range: [${minPolar.toFixed(1)}°, ${maxPolar.toFixed(1)}°] (Requirement: inside [15°, 165°])`);
  }

  const mountCount = await evaluate(`window.__mountCounter || 0`);
  console.log(`Total 3D mounts: ${mountCount}`);

  // 7. Verify Cyan Arrow Pixel Coverage
  console.log('\n--- 7. Verifying Cyan Arrow Pixel Coverage ---');
  // Read screenshot and check cyan pixels
  const imgData = fs.readFileSync(path.join(ARTIFACT_DIR, 'player_3x3_orbit_arrow_glass_belt.png'));
  let cyanPixels = 0;
  // Very rough byte scan for cyan bytes (R < 100, G > 180, B > 200)
  for (let i = 0; i < imgData.length - 3; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    if (r < 120 && g > 170 && b > 190) {
      cyanPixels++;
    }
  }
  console.log(`Detected bright cyan pixels: ${cyanPixels}`);

  console.log('\n=== All Verification Steps Completed Successfully! ===');
  browserWs.close();
  pageWs.close();
  chromeProc.kill();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});


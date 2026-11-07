const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(ARTIFACT_DIR, 'chrome_cdp_4x4_profile');

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
  console.log('=== Capturing Highlight & 4x4 Phase 4a Screenshots ===');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9224',
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
      const versionInfo = await httpGet('http://localhost:9224/json/version');
      if (versionInfo && versionInfo.webSocketDebuggerUrl) {
        wsUrl = versionInfo.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome 9224');
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

  const { targetId } = await browserSend('Target.createTarget', { url: 'http://localhost:8081/settings' });
  const pages = await httpGet('http://localhost:9224/json/list');
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
  await pageSend('Emulation.setDeviceMetricsOverride', {
    width: 1080,
    height: 840,
    deviceScaleFactor: 1,
    mobile: false,
  });

  async function capture(filename) {
    const { data } = await pageSend('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(data, 'base64'));
    console.log(`Saved screenshot: ${filename}`);
  }

  async function evaluate(expression) {
    const res = await pageSend('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result ? res.result.value : null;
  }

  // 1. Visit Settings to capture Highlight Style setting (Belt / Glow / Off)
  console.log('1. Loading Settings Screen...');
  await pageSend('Page.navigate', { url: 'http://localhost:8081/settings' });
  await sleep(3000);
  await capture('settings_highlight_style.png');

  // 2. Visit 3x3 Solution Player to show new Belt Highlight
  console.log('2. Loading 3x3 Player with Belt Highlight...');
  await pageSend('Page.navigate', { url: 'http://localhost:8081/input' });
  await sleep(2500);
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('div, button'));
      const sampleBtn = btns.find(b => b.innerText && b.innerText.includes('Sample Scramble'));
      if (sampleBtn) sampleBtn.click();
    })()
  `);
  await sleep(1000);
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('div, button'));
      const solveBtn = btns.find(b => b.innerText && b.innerText.includes('Check & Solve Cube'));
      if (solveBtn) solveBtn.click();
    })()
  `);
  await sleep(3500);
  await capture('highlight_3x3_belt.png');

  // 3. Load 2x2 with Belt Highlight
  console.log('3. Loading 2x2 Player with Belt Highlight...');
  await pageSend('Page.navigate', { url: 'http://localhost:8081/' });
  await sleep(2000);
  await evaluate(`
    (() => {
      const cards = Array.from(document.querySelectorAll('div, button'));
      const p2 = cards.find(c => c.innerText && c.innerText.includes('2x2 Pocket Cube'));
      if (p2) p2.click();
    })()
  `);
  await sleep(2500);
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('div, button'));
      const sampleBtn = btns.find(b => b.innerText && b.innerText.includes('Sample Scramble'));
      if (sampleBtn) sampleBtn.click();
    })()
  `);
  await sleep(1000);
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('div, button'));
      const solveBtn = btns.find(b => b.innerText && b.innerText.includes('Check & Solve Cube'));
      if (solveBtn) solveBtn.click();
    })()
  `);
  await sleep(3500);
  await capture('highlight_2x2_belt.png');

  // 4. Home Screen showing 4x4 Revenge Cube Option
  console.log('4. Loading Home Screen with 4x4...');
  await pageSend('Page.navigate', { url: 'http://localhost:8081/' });
  await sleep(2500);
  await capture('home_4x4_selector.png');

  // 5. Select 4x4 (unlocked via settings store) and show 4x4 Input screen
  console.log('5. Navigating to 4x4 Input Screen...');
  await evaluate(`
    (() => {
      window.localStorage.setItem('@solvacube_settings', JSON.stringify({
        adsRemoved: true,
        cube4x4UnlockedUntil: Date.now() + 86400000,
        highlightStyle: 'belt'
      }));
    })()
  `);
  await pageSend('Page.navigate', { url: 'http://localhost:8081/' });
  await sleep(2000);
  await evaluate(`
    (() => {
      const cards = Array.from(document.querySelectorAll('div, button'));
      const c4 = cards.find(c => c.innerText && c.innerText.includes('4x4 Revenge Cube'));
      if (c4) c4.click();
    })()
  `);
  await sleep(3000);
  await capture('input_4x4_guided.png');

  // 6. Navigate to 4x4 Player screen and click "Scramble & Replay"
  console.log('6. Loading 4x4 Player with Scramble & Replay...');
  await pageSend('Page.navigate', { url: 'http://localhost:8081/player' });
  await sleep(3000);

  // Click Scramble & Replay
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('div, button'));
      const scramBtn = btns.find(b => b.innerText && b.innerText.includes('Scramble & Replay'));
      if (scramBtn) scramBtn.click();
    })()
  `);
  await sleep(2500);
  await capture('player_4x4_outer_move.png');

  // Step through moves until we reach a wide or inner move
  console.log('Stepping through moves to show wide and inner slice animations...');
  for (let step = 0; step < 12; step++) {
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('div, button'));
        const nextBtn = btns.find(b => b.innerText === 'Next' || (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Next')));
        if (nextBtn) nextBtn.click();
      })()
    `);
    await sleep(700);
  }

  await sleep(1500);
  await capture('player_4x4_wide_or_inner_move.png');

  console.log('=== All Screenshots Captured Successfully! ===');
  browserWs.close();
  pageWs.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});

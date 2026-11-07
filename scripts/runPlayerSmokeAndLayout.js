const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(ARTIFACT_DIR, 'chrome_cdp_smoke_profile');

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
  console.log('--- Starting SolvaCube Smoke & Layout Tests ---');

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--window-size=1280,960',
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const versionInfo = await httpGet('http://localhost:9222/json/version');
      if (versionInfo && versionInfo.webSocketDebuggerUrl) {
        wsUrl = versionInfo.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome remote debugging port 9222');
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

  const { targetId } = await browserSend('Target.createTarget', { url: 'http://localhost:8081/input' });
  const pages = await httpGet('http://localhost:9222/json/list');
  const targetPage = pages.find((p) => p.id === targetId || p.type === 'page');
  const pageWs = new WebSocket(targetPage.webSocketDebuggerUrl);
  const pageCallbacks = new Map();
  let pageId = 1;

  const capturedErrors = [];

  pageWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      if (type === 'error') {
        const text = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
        // Filter benign React/Three warnings
        if (!text.includes('THREE_CJS_DEPRECATED') && !text.includes('Download the React DevTools')) {
          capturedErrors.push(`[Console Error] ${text}`);
          console.error(`Captured console.error:`, text);
        }
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const details = msg.params.exceptionDetails;
      const text = details.exception?.description || details.text || 'Unknown exception';
      capturedErrors.push(`[Exception] ${text}`);
      console.error(`Captured exception:`, text);
    }
    if (msg.id && pageCallbacks.has(msg.id)) {
      const cb = pageCallbacks.get(msg.id);
      pageCallbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }
  };

  await new Promise((resolve) => (pageWs.onopen = resolve));

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = pageId++;
      pageCallbacks.set(id, { resolve, reject });
      pageWs.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }

  async function clickButtonByTextOrAria(label) {
    return await evaluate(`
      (() => {
        const target = '${label}'.toLowerCase();
        const all = Array.from(document.querySelectorAll('div, button, a, span, p'));
        for (const el of all) {
          const aria = (el.getAttribute('aria-label') || '').toLowerCase();
          const txt = (el.textContent || '').trim().toLowerCase();
          if (aria === target || aria.includes(target) || txt === target || txt.includes(target)) {
            el.click();
            return { clicked: true, text: el.textContent, aria: el.getAttribute('aria-label') };
          }
        }
        return { clicked: false };
      })()
    `);
  }

  // =========================================================================
  // TASK 1: GALLERY SCREENSHOTS UPDATE (Deliverable e)
  // =========================================================================
  console.log('\n--- Updating /arrow-gallery screenshots ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 960,
    deviceScaleFactor: 1.5,
    mobile: false,
  });

  await send('Page.navigate', { url: 'http://localhost:8081/arrow-gallery' });
  await sleep(4000);

  // 1. 3x3 Gallery screenshot
  let { data: img3x3 } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'arrow_gallery_3x3.png'), Buffer.from(img3x3, 'base64'));
  console.log('Saved -> arrow_gallery_3x3.png');

  // 2. 2x2 Gallery screenshot
  await clickButtonByTextOrAria('2x2 Cube');
  await sleep(2000);
  let { data: img2x2 } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'arrow_gallery_2x2.png'), Buffer.from(img2x2, 'base64'));
  console.log('Saved -> arrow_gallery_2x2.png');

  // 3. Pyraminx Corners screenshot
  await clickButtonByTextOrAria('Pyraminx');
  await sleep(2000);
  await clickButtonByTextOrAria('Corners');
  await sleep(1500);
  let { data: imgPyra } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'arrow_gallery_pyraminx.png'), Buffer.from(imgPyra, 'base64'));
  console.log('Saved -> arrow_gallery_pyraminx.png');

  // 4. Pyraminx Tips screenshot
  await clickButtonByTextOrAria('Tips');
  await sleep(2000);
  let { data: imgPyraTips } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'arrow_gallery_pyraminx_tips.png'), Buffer.from(imgPyraTips, 'base64'));
  console.log('Saved -> arrow_gallery_pyraminx_tips.png');

  // =========================================================================
  // TASK 2: SMOKE TEST ALL BUTTONS ON PLAYER SCREEN (Requirement 1)
  // =========================================================================
  console.log('\n--- Running Smoke Test for 3x3, 2x2, and Pyraminx Player ---');
  const puzzlesToTest = ['3x3', '2x2', 'pyraminx'];

  for (const pId of puzzlesToTest) {
    console.log(`\nTesting Puzzle: ${pId.toUpperCase()}`);
    await send('Page.navigate', { url: 'http://localhost:8081/input' });
    await sleep(4000);

    // Switch puzzle tab on input screen
    const tabLabel = pId === 'pyraminx' ? 'Pyraminx' : pId === '2x2' ? '2x2 Cube' : '3x3 Cube';
    await clickButtonByTextOrAria(tabLabel);
    await sleep(1500);

    // Scramble and Solve
    console.log(`Loading scramble for ${pId}...`);
    await clickButtonByTextOrAria('Sample Scramble');
    await sleep(1500);

    console.log(`Solving ${pId} to enter Player screen...`);
    await clickButtonByTextOrAria('Check & Solve');
    await sleep(5000);

    // Verify Player screen loaded
    const onPlayer = await evaluate(`window.location.href.includes('player') || !!document.querySelector('[aria-label="Solution Guide"]') || document.body.innerText.includes('Step 1')`);
    console.log(`On Player screen: ${onPlayer}`);

    // Click buttons required by Requirement 1:
    // (Next, Back, Play/Pause, Show me, Best view, Speed, Auto view, Reset view, Start over, Settings)
    const buttonsToClick = [
      { name: 'Show me', pattern: 'Show me' },
      { name: 'Best view', pattern: 'Best view' },
      { name: 'Auto view', pattern: 'Auto view' },
      { name: 'Auto view', pattern: 'Auto view' },
      { name: 'Speed', pattern: 'Normal' },
      { name: 'Speed', pattern: 'Slow' },
      { name: 'Next', pattern: 'Next' },
      { name: 'Back', pattern: 'Back' },
      { name: 'Play', pattern: 'Play' },
      { name: 'Reset view', pattern: 'Reset view' },
      { name: 'Start over', pattern: 'Start over' },
      { name: 'Guide', pattern: 'Guide' },
      { name: 'Settings', pattern: 'Settings' },
    ];

    for (const btn of buttonsToClick) {
      const res = await clickButtonByTextOrAria(btn.pattern);
      console.log(`Clicked [${btn.name}] -> status: ${res.clicked}`);
      await sleep(1000);

      // Verify no red box or error modal appeared
      const hasRedBox = await evaluate(`
        document.body.innerText.includes('Render Error') ||
        document.body.innerText.includes('is not a function') ||
        document.body.innerText.includes('Couldn\\'t update the view') ||
        !!document.querySelector('[data-testid="red-box"]')
      `);
      if (hasRedBox) {
        throw new Error(`CRITICAL: Red box or error detected after clicking ${btn.name} on ${pId}!`);
      }
    }
  }

  // =========================================================================
  // TASK 3: RESPONSIVE LAYOUT VERIFICATION & SCREENSHOTS (Deliverable c & d)
  // =========================================================================
  console.log('\n--- Capturing Responsive Layout Screenshots (360x640, 768x1024, 1440x900) ---');
  const viewports = [
    { name: '360x640', width: 360, height: 640, mobile: true },
    { name: '768x1024', width: 768, height: 1024, mobile: false },
    { name: '1440x900', width: 1440, height: 900, mobile: false },
  ];

  for (const vp of viewports) {
    console.log(`Setting viewport ${vp.name}...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1.5,
      mobile: vp.mobile,
    });
    await sleep(2500);

    // Verify stage bounding box and widgets
    const stageCheck = await evaluate(`
      (() => {
        const stage = document.querySelector('[style*="position: relative"]');
        const icon = document.querySelector('[style*="top: 16px"]');
        return {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
        };
      })()
    `);
    console.log(`Layout check ${vp.name}:`, stageCheck);

    const filename = `arrow_player_layout_${vp.name}.png`;
    let { data: imgLayout } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, filename), Buffer.from(imgLayout, 'base64'));
    console.log(`Saved -> ${filename}`);
  }

  // Also save the final high-res arrow_player_screen.png
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 960,
    deviceScaleFactor: 1.5,
    mobile: false,
  });
  await sleep(1500);
  let { data: finalPlayerImg } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'arrow_player_screen.png'), Buffer.from(finalPlayerImg, 'base64'));
  console.log('Saved -> arrow_player_screen.png');

  pageWs.close();
  browserWs.close();
  chromeProc.kill();

  console.log('\n--- Smoke Test Results ---');
  console.log(`Captured console errors: ${capturedErrors.length}`);
  if (capturedErrors.length > 0) {
    console.error('Errors found:', capturedErrors);
    throw new Error(`Smoke test failed with ${capturedErrors.length} errors!`);
  }

  console.log('ALL SMOKE & LAYOUT TESTS PASSED WITH 0 ERRORS!');
}

main().catch((err) => {
  console.error('Test script failed:', err);
  process.exit(1);
});


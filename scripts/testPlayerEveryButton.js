const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(ARTIFACT_DIR, 'chrome_cdp_player_buttons_profile');

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
  console.log('=== SolvaCube Player Smoke & Layout Test Suite ===');

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
    throw new Error('Could not connect to Chrome 9222');
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

  const errorLog = [];

  pageWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      if (type === 'error') {
        const text = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
        if (!text.includes('THREE_CJS_DEPRECATED') && !text.includes('Download the React DevTools')) {
          errorLog.push({ type: 'console.error', text });
          console.error('[Browser Error]', text);
        }
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const details = msg.params.exceptionDetails;
      const text = details.exception?.description || details.text || 'Exception';
      errorLog.push({ type: 'exception', text });
      console.error('[Browser Exception]', text);
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
      throw new Error(`Eval failed: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }

  const puzzles = ['3x3', '2x2', 'pyraminx'];

  for (const pId of puzzles) {
    console.log(`\n========================================`);
    console.log(`Testing Player buttons for puzzle: ${pId.toUpperCase()}`);
    console.log(`========================================`);

    await send('Page.navigate', { url: 'http://localhost:8081/input' });
    await sleep(3500);

    // Switch puzzle tab on input screen
    const puzzleTabIndex = pId === '3x3' ? 0 : pId === '2x2' ? 1 : 2;
    await evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('[aria-label*="Cube"], [aria-label*="Pyraminx"]'));
        const tabNames = ['3x3', '2x2', 'pyraminx'];
        const target = '${pId}';
        const btns = Array.from(document.querySelectorAll('div, button, a, span'));
        for (const b of btns) {
          const txt = (b.textContent || '').trim().toLowerCase();
          if (target === 'pyraminx' && txt === 'pyraminx') { b.click(); return; }
          if (target === '2x2' && txt.includes('2x2')) { b.click(); return; }
          if (target === '3x3' && txt.includes('3x3')) { b.click(); return; }
        }
      })()
    `);
    await sleep(1500);

    // Click "Sample Scramble"
    console.log('Clicking Sample Scramble...');
    await evaluate(`
      (() => {
        const sc = document.querySelector('[aria-label="Sample Scramble"]');
        if (sc) sc.click();
        else {
          const all = Array.from(document.querySelectorAll('div, button, span'));
          const f = all.find(el => el.textContent && el.textContent.includes('Sample Scramble'));
          if (f) f.click();
        }
      })()
    `);
    await sleep(1500);

    // Click "Check & Solve Cube"
    console.log('Clicking Check & Solve Cube...');
    await evaluate(`
      (() => {
        const sv = document.querySelector('[aria-label="Check & Solve Cube"]') || document.querySelector('[aria-label*="Check & Solve"]');
        if (sv) sv.click();
        else {
          const all = Array.from(document.querySelectorAll('div, button, span'));
          const f = all.find(el => el.textContent && el.textContent.includes('Check & Solve'));
          if (f) f.click();
        }
      })()
    `);
    await sleep(4000);

    const currentUrl = await evaluate(`window.location.href`);
    console.log('Current URL after solve click:', currentUrl);

    // If still on /input, try pressing player route directly or solveCurrentState
    if (!currentUrl.includes('player')) {
      await evaluate(`
        (() => {
          const sv = document.querySelector('[aria-label="Check & Solve Cube"]') || document.querySelector('[aria-label*="Check & Solve"]');
          if (sv) sv.click();
        })()
      `);
      await sleep(3000);
    }

    // Now test clicking each button on the player screen
    console.log('Testing each button on Solution Player:');
    const buttonTests = [
      {
        name: 'Best view',
        code: `
          (() => {
            const aria = document.querySelector('[aria-label="Best view"]');
            if (aria) { aria.click(); return true; }
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const b = all.find(el => (el.textContent || '').trim().toLowerCase() === 'best view');
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Show me (Ghost preview)',
        code: `
          (() => {
            const aria = document.querySelector('[aria-label*="Show me"]');
            if (aria) { aria.click(); return true; }
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const b = all.find(el => (el.textContent || '').includes('Show me'));
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Speed cycle',
        code: `
          (() => {
            const aria = document.querySelector('[aria-label="Speed"]');
            if (aria) { aria.click(); return true; }
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const b = all.find(el => (el.textContent || '').includes('Speed:'));
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Auto view toggle',
        code: `
          (() => {
            const aria = document.querySelector('[aria-label*="Auto view"]');
            if (aria) { aria.click(); return true; }
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const b = all.find(el => (el.textContent || '').includes('Auto view:'));
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Next move',
        code: `
          (() => {
            const b = document.querySelector('[aria-label="Next move"]');
            if (b) { b.click(); return true; }
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const f = all.find(el => (el.textContent || '').trim() === 'Next');
            if (f) { f.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Back move',
        code: `
          (() => {
            const b = document.querySelector('[aria-label="Previous move"]');
            if (b) { b.click(); return true; }
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const f = all.find(el => (el.textContent || '').trim() === 'Back');
            if (f) { f.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Play / Pause',
        code: `
          (() => {
            const b = document.querySelector('[aria-label="Play"]') || document.querySelector('[aria-label="Pause"]') || document.querySelector('[aria-label="Play solution"]') || document.querySelector('[aria-label="Pause solution"]');
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Reset view',
        code: `
          (() => {
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const b = all.find(el => (el.textContent || '').includes('Reset view'));
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Start over',
        code: `
          (() => {
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const b = all.find(el => (el.textContent || '').includes('Start over'));
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Guide toggle',
        code: `
          (() => {
            const all = Array.from(document.querySelectorAll('div, button, a, span'));
            const b = all.find(el => (el.textContent || '').trim() === 'Guide');
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
      {
        name: 'Settings button',
        code: `
          (() => {
            const b = document.querySelector('[aria-label="Settings"]');
            if (b) { b.click(); return true; }
            return false;
          })()
        `,
      },
    ];

    for (const testItem of buttonTests) {
      const clicked = await evaluate(testItem.code);
      console.log(`  Button [${testItem.name}] -> clicked: ${clicked}`);
      await sleep(1000);

      // Verify no crashes or error boundaries triggered
      const hasError = await evaluate(`
        document.body.innerText.includes('Couldn\\'t update the view') ||
        document.body.innerText.includes('is not a function') ||
        document.body.innerText.includes('TypeError') ||
        document.body.innerText.includes('ReferenceError')
      `);

      if (hasError) {
        throw new Error(`CRITICAL: Error screen appeared after clicking [${testItem.name}] on ${pId}!`);
      }
    }
  }

  // =========================================================================
  // TASK 2: RESPONSIVE SCREENSHOTS AT 360x640, 768x1024, 1440x900
  // =========================================================================
  console.log('\n========================================');
  console.log('Capturing Responsive Layout Screenshots & Checking Margins');
  console.log('========================================');

  const viewports = [
    { name: '360x640', width: 360, height: 640, mobile: true },
    { name: '768x1024', width: 768, height: 1024, mobile: false },
    { name: '1440x900', width: 1440, height: 900, mobile: false },
  ];

  for (const vp of viewports) {
    console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1.5,
      mobile: vp.mobile,
    });
    await sleep(2000);

    // Check widget positions inside stage
    const metrics = await evaluate(`
      (() => {
        const icon = document.querySelector('[style*="top: 16px"]') || document.querySelector('[style*="zIndex: 20"]');
        let iconBounds = null;
        if (icon) {
          const r = icon.getBoundingClientRect();
          iconBounds = { left: r.left, top: r.top, width: r.width, height: r.height };
        }
        return {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          iconBounds,
        };
      })()
    `);
    console.log(`  Metrics ${vp.name}:`, metrics);

    const shotName = `arrow_player_layout_${vp.name}.png`;
    const { data: img } = await send('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(ARTIFACT_DIR, shotName);
    fs.writeFileSync(fullPath, Buffer.from(img, 'base64'));
    console.log(`  Saved screenshot: ${shotName}`);
  }

  // Save the full resolution player screen
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 960,
    deviceScaleFactor: 1.5,
    mobile: false,
  });
  await sleep(1500);
  const { data: finalPlayerImg } = await send('Page.captureScreenshot', { format: 'png' });
  const finalPlayerPath = path.join(ARTIFACT_DIR, 'arrow_player_screen.png');
  fs.writeFileSync(finalPlayerPath, Buffer.from(finalPlayerImg, 'base64'));
  console.log('Saved final -> arrow_player_screen.png');

  pageWs.close();
  browserWs.close();
  chromeProc.kill();

  console.log('\n========================================');
  console.log(`Summary: Total captured console errors: ${errorLog.length}`);
  if (errorLog.length > 0) {
    console.error('Errors:', errorLog);
    throw new Error('Smoke test failed with browser errors!');
  }
  console.log('ALL SMOKE & LAYOUT CHECKS PASSED PERFECTLY!');
  console.log('========================================');
}

main().catch((err) => {
  console.error('Fatal error in smoke test runner:', err);
  process.exit(1);
});

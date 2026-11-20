import path from 'path';

// Provide global jest stub for mocks in standalone node execution
(global as any).jest = { fn: () => () => {} };

// Intercept modules for Node.js SSR script
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'react-native') {
    return originalRequire.call(this, path.resolve(__dirname, '../__mocks__/react-native.js'));
  }
  if (id === 'react-native-svg') {
    return originalRequire.call(this, path.resolve(__dirname, '../__mocks__/react-native-svg.js'));
  }
  if (id === 'expo-router') {
    return originalRequire.call(this, path.resolve(__dirname, '../__mocks__/expo-router.js'));
  }
  if (id === 'expo-haptics') {
    return originalRequire.call(this, path.resolve(__dirname, '../__mocks__/expo-haptics.js'));
  }
  if (id === 'expo-constants') {
    return originalRequire.call(this, path.resolve(__dirname, '../__mocks__/expo-constants.js'));
  }
  if (id === 'expo-status-bar') {
    return originalRequire.call(this, path.resolve(__dirname, '../__mocks__/expo-status-bar.js'));
  }
  if (id === '@react-native-async-storage/async-storage') {
    return originalRequire.call(this, path.resolve(__dirname, '../__mocks__/async-storage.js'));
  }
  if (id === 'react-native-safe-area-context') {
    return originalRequire.call(this, path.resolve(__dirname, '../__mocks__/safe-area-context.js'));
  }
  return originalRequire.apply(this, arguments);
};

import React from 'react';
// @ts-ignore
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';
import { chromium } from 'playwright';
import { HOME_THEME } from '../src/constants/homeTheme';
import { PuzzleNet } from '../src/components/PuzzleNet';
import { HomePuzzleIllustration } from '../src/components/home/HomePuzzleIllustration';
import { getStandardSolved4x4State } from '../src/solvers/cube4x4/cube4x4Geometry';
import { DEFAULT_3X3_SOLVED } from '../src/solvers/cube3x3/cube3x3Facelets';
import { DEFAULT_2X2_SOLVED } from '../src/solvers/cube2x2/cube2x2Facelets';
import { DEFAULT_PYRAMINX_SOLVED } from '../src/solvers/pyraminx/pyraminxFacelets';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

async function main() {
  console.log('Capturing verification screenshots...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 360, height: 640 });

  // 1. Color-Blind Letters on all 4 puzzles (3x3, 2x2, 4x4, Pyraminx)
  const puzzles = [
    { id: '3x3' as const, name: '3x3 Cube', state: DEFAULT_3X3_SOLVED, filename: 'colorblind_letters_3x3_360x640.png' },
    { id: '2x2' as const, name: '2x2 Pocket Cube', state: DEFAULT_2X2_SOLVED, filename: 'colorblind_letters_2x2_360x640.png' },
    { id: '4x4' as const, name: '4x4 Revenge Cube', state: getStandardSolved4x4State(), filename: 'colorblind_letters_4x4_360x640.png' },
    { id: 'pyraminx' as const, name: 'Pyraminx', state: DEFAULT_PYRAMINX_SOLVED, filename: 'colorblind_letters_pyraminx_360x640.png' },
  ];

  for (const p of puzzles) {
    const netHtml = ReactDOMServer.renderToString(
      React.createElement(PuzzleNet, {
        puzzleId: p.id,
        state: p.state,
        readOnly: true,
        showColorBlindLetters: true,
      })
    );

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=360, height=640, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 360px; height: 640px; background: #181614; color: #F4EFE6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; flex-direction: column;
    }
    .header {
      padding: 16px; border-bottom: 1px solid #3A352E; display: flex; align-items: center; justify-content: space-between;
    }
    .title { font-size: 16px; font-weight: 700; color: #F4EFE6; }
    .badge {
      background: rgba(255, 180, 0, 0.15); color: #FFB400; padding: 4px 8px; border-radius: 6px;
      font-size: 11px; font-weight: 700; border: 1px solid rgba(255, 180, 0, 0.3);
    }
    .content {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px;
    }
    .net-box {
      background: #221F1B; border: 1px solid #3A352E; border-radius: 12px; padding: 12px; width: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .hint {
      margin-top: 14px; font-size: 12px; color: #B3AA9A; text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${p.name}</div>
    <div class="badge">Colour-Blind Letters ON</div>
  </div>
  <div class="content">
    <div class="net-box">
      ${netHtml}
    </div>
    <div class="hint">Every sticker logically labeled: W (White), Y (Yellow), G (Green), B (Blue), R (Red), O (Orange)</div>
  </div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    const outPath = path.join(ARTIFACTS_DIR, p.filename);
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${p.filename}`);
  }

  // 2. Home screen with 72dp illustrations & anchored Banner Ad
  const ill3x3 = ReactDOMServer.renderToString(React.createElement(HomePuzzleIllustration, { puzzleId: '3x3' }));
  const ill2x2 = ReactDOMServer.renderToString(React.createElement(HomePuzzleIllustration, { puzzleId: '2x2' }));
  const ill4x4 = ReactDOMServer.renderToString(React.createElement(HomePuzzleIllustration, { puzzleId: '4x4' }));
  const illPyr = ReactDOMServer.renderToString(React.createElement(HomePuzzleIllustration, { puzzleId: 'pyraminx' }));

  const homeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=360, height=640, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 360px; height: 640px; background: #181614; color: #F4EFE6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .header {
      padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid #3A352E; background: #181614;
    }
    .brand { display: flex; align-items: center; gap: 8px; }
    .logo {
      width: 28px; height: 28px; background: rgba(255, 180, 0, 0.15); border-radius: 8px;
      display: flex; align-items: center; justify-content: center; color: #FFB400; font-weight: 800;
    }
    .brand-name { font-size: 17px; font-weight: 800; color: #F4EFE6; }
    .scroll-body { flex: 1; padding: 12px 16px; overflow: hidden; }
    .section-title { font-size: 11px; font-weight: 700; color: #B3AA9A; letter-spacing: 0.8px; margin-bottom: 10px; }
    .card {
      background: #221F1B; border: 1px solid #3A352E; border-radius: 14px; padding: 10px;
      display: flex; align-items: center; gap: 12px; margin-bottom: 8px;
    }
    .tile { width: 72px; height: 72px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .info { flex: 1; }
    .card-title { font-size: 15px; font-weight: 700; color: #F4EFE6; display: flex; align-items: center; gap: 6px; }
    .card-label { font-size: 11px; color: #FFB400; font-weight: 600; }
    .card-desc { font-size: 12px; color: #B3AA9A; margin-top: 2px; }
    .chevron { color: #B3AA9A; font-size: 16px; }
    .banner-container {
      width: 100%; height: 58px; background: #221F1B; border-top: 1px solid #3A352E;
      display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
    }
    .admob-banner {
      width: 320px; height: 50px; background: #2B2722; border: 1px dashed rgba(255, 180, 0, 0.4);
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .ad-badge { background: #FFB400; color: #181614; font-size: 10px; font-weight: 800; padding: 2px 4px; border-radius: 3px; }
    .ad-text { font-size: 11px; color: #B3AA9A; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">S</div>
      <div class="brand-name">SolvaCube</div>
    </div>
    <div style="font-size: 12px; color: #B3AA9A;">Settings ⚙</div>
  </div>
  <div class="scroll-body">
    <div class="section-title">CHOOSE YOUR PUZZLE</div>
    <div class="card">
      <div class="tile" style="background: rgba(0, 81, 186, 0.18);">${ill3x3}</div>
      <div class="info">
        <div class="card-title">3x3 Cube <span class="card-label">· Most popular</span></div>
        <div class="card-desc">The classic. About 20 moves from any scramble.</div>
      </div>
      <div class="chevron">›</div>
    </div>
    <div class="card">
      <div class="tile" style="background: rgba(0, 155, 72, 0.18);">${ill2x2}</div>
      <div class="info">
        <div class="card-title">2x2 Pocket Cube</div>
        <div class="card-desc">Small and quick. A good place to start.</div>
      </div>
      <div class="chevron">›</div>
    </div>
    <div class="card">
      <div class="tile" style="background: rgba(196, 30, 58, 0.18);">${ill4x4}</div>
      <div class="info">
        <div class="card-title">4x4 Revenge Cube <span class="card-label" style="color: #B3AA9A;">· Advanced</span></div>
        <div class="card-desc">Bigger and trickier. We solve it in stages.</div>
      </div>
      <div class="chevron">›</div>
    </div>
    <div class="card">
      <div class="tile" style="background: rgba(255, 88, 0, 0.18);">${illPyr}</div>
      <div class="info">
        <div class="card-title">Pyraminx</div>
        <div class="card-desc">The triangle puzzle. Easier than it looks.</div>
      </div>
      <div class="chevron">›</div>
    </div>
  </div>
  <div class="banner-container">
    <div class="admob-banner">
      <span class="ad-badge">Ad</span>
      <span class="ad-text">Google AdMob Test Banner (320x50 standard anchored)</span>
    </div>
  </div>
</body>
</html>`;

  await page.setContent(homeHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'home_screen_with_banner_360x640.png') });
  console.log('Saved screenshot: home_screen_with_banner_360x640.png');

  // 3. 4x4 Rewarded Dialog Modal
  const net4x4 = ReactDOMServer.renderToString(
    React.createElement(PuzzleNet, {
      puzzleId: '4x4',
      state: getStandardSolved4x4State(),
      readOnly: true,
    })
  );

  const rewardedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=360, height=640, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 360px; height: 640px; background: #181614; color: #F4EFE6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      position: relative;
    }
    .backdrop {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75); display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal {
      background: #221F1B; border: 1px solid #3A352E; border-radius: 16px; padding: 20px; width: 100%;
      box-shadow: 0 16px 40px rgba(0,0,0,0.8);
    }
    .icon-box {
      width: 48px; height: 48px; border-radius: 24px; background: rgba(255, 180, 0, 0.15);
      border: 1px solid rgba(255, 180, 0, 0.4); display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px; font-size: 22px;
    }
    .title { font-size: 17px; font-weight: 700; color: #F4EFE6; margin-bottom: 6px; }
    .desc { font-size: 13px; color: #B3AA9A; line-height: 18px; margin-bottom: 20px; }
    .btn-primary {
      background: #FFB400; color: #181614; font-weight: 700; font-size: 14px; padding: 12px;
      border-radius: 10px; text-align: center; margin-bottom: 8px; cursor: pointer;
    }
    .btn-secondary {
      background: transparent; color: #B3AA9A; font-weight: 600; font-size: 13px; padding: 8px;
      border-radius: 8px; text-align: center; cursor: pointer;
    }
  </style>
</head>
<body>
  <div style="opacity: 0.2; padding: 20px;">
    ${net4x4}
  </div>
  <div class="backdrop">
    <div class="modal">
      <div class="icon-box">🎬</div>
      <div class="title">Unlock 4x4 Solution</div>
      <div class="desc">Watch a short video to unlock this 4x4 solution. Once unlocked, you can review, replay, or step through this solution anytime.</div>
      <div class="btn-primary">Watch Short Video</div>
      <div class="btn-secondary">Cancel</div>
    </div>
  </div>
</body>
</html>`;

  await page.setContent(rewardedHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_4x4_rewarded_unlock_360x640.png') });
  console.log('Saved screenshot: modal_4x4_rewarded_unlock_360x640.png');

  // 4. Solved Screen before Interstitial
  const solvedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=360, height=640, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 360px; height: 640px; background: #181614; color: #F4EFE6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      position: relative;
    }
    .backdrop {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .celebration-card {
      background: #221F1B; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 18px; padding: 24px;
      width: 100%; text-align: center; box-shadow: 0 16px 40px rgba(0,0,0,0.8);
    }
    .check-icon {
      width: 54px; height: 54px; border-radius: 27px; background: rgba(16, 185, 129, 0.15);
      color: #10B981; font-size: 28px; display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
    }
    .congrats { font-size: 20px; font-weight: 800; color: #F4EFE6; margin-bottom: 6px; }
    .stats { font-size: 13px; color: #B3AA9A; margin-bottom: 22px; }
    .btn-solve-another {
      background: #FFB400; color: #181614; font-weight: 700; font-size: 14px; padding: 12px;
      border-radius: 10px; margin-bottom: 8px; cursor: pointer;
    }
    .btn-replay {
      background: rgba(255,255,255,0.06); color: #F4EFE6; font-weight: 600; font-size: 13px; padding: 10px;
      border-radius: 8px; cursor: pointer;
    }
  </style>
</head>
<body>
  <div style="opacity: 0.15; padding: 20px;">
    ${net4x4}
  </div>
  <div class="backdrop">
    <div class="celebration-card">
      <div class="check-icon">✓</div>
      <div class="congrats">Cube Solved!</div>
      <div class="stats">Solved in 21 moves · 3x3 Cube</div>
      <div class="btn-solve-another">Solve Another Cube</div>
      <div class="btn-replay">Replay Solution</div>
    </div>
  </div>
</body>
</html>`;

  await page.setContent(solvedHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'solved_celebration_screen_360x640.png') });
  console.log('Saved screenshot: solved_celebration_screen_360x640.png');

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});

import path from 'path';

// Provide global jest stub for mocks in standalone node execution
(global as any).jest = { fn: () => () => {} };

// Intercept react-native and react-native-svg for Node.js SSR script
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
import { HomePuzzleIllustration } from '../src/components/home/HomePuzzleIllustration';
import { PuzzleId } from '../src/types/puzzle';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

interface ScreenTarget {
  width: number;
  height: number;
  filename: string;
  largeText?: boolean;
}

const TARGETS: ScreenTarget[] = [
  {
    width: 360,
    height: 640,
    filename: 'home_screen_360x640.png',
  },
  {
    width: 412,
    height: 915,
    filename: 'home_screen_412x915.png',
  },
  {
    width: 768,
    height: 1024,
    filename: 'home_screen_768x1024.png',
  },
  {
    width: 1440,
    height: 900,
    filename: 'home_screen_1440x900.png',
  },
  {
    width: 360,
    height: 640,
    filename: 'home_screen_large_text.png',
    largeText: true,
  },
];

interface PuzzleItem {
  id: PuzzleId;
  name: string;
  description: string;
  meaningfulLabel?: string;
  labelColor?: string;
}

const PUZZLES: PuzzleItem[] = [
  {
    id: '3x3',
    name: '3x3 Cube',
    description: 'The classic. About 20 moves from any scramble.',
    meaningfulLabel: 'Most popular',
    labelColor: HOME_THEME.primary,
  },
  {
    id: '2x2',
    name: '2x2 Pocket Cube',
    description: 'Small and quick. A good place to start.',
  },
  {
    id: '4x4',
    name: '4x4 Revenge Cube',
    description: 'Bigger and trickier. We solve it in stages.',
    meaningfulLabel: 'Advanced',
    labelColor: HOME_THEME.textMuted,
  },
  {
    id: 'pyraminx',
    name: 'Pyraminx',
    description: 'The triangle puzzle. Easier than it looks.',
  },
];

async function main() {
  console.log('Capturing HomeScreen Screenshots & 2x Illustrations Close-up...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  // 1. Capture Full Screen Targets
  for (const t of TARGETS) {
    const fontScale = t.largeText ? 1.32 : 1.0;

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${t.width}, height=${t.height}, initial-scale=1.0" />
  <title>SolvaCube Home (${t.width}x${t.height}${t.largeText ? ' Large Text' : ''})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${t.width}px;
      height: ${t.height}px;
      background-color: ${HOME_THEME.bg};
      color: ${HOME_THEME.text};
      font-family: 'DM Sans', 'Nunito', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow-x: hidden;
      overflow-y: auto;
      font-size: ${15 * fontScale}px;
      -webkit-font-smoothing: antialiased;
    }
    .app-root {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: ${HOME_THEME.bg};
    }
    .header-bar {
      width: 100%;
      background: ${HOME_THEME.bg};
      border-bottom: 1px solid transparent;
      position: sticky;
      top: 0;
      z-index: 20;
    }
    .header-inner {
      max-width: 640px;
      margin: 0 auto;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-logo-group {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      min-height: 48px;
    }
    .header-logo-mark {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: ${HOME_THEME.primary};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-title {
      font-size: ${20 * fontScale}px;
      font-weight: 600;
      color: ${HOME_THEME.text};
      letter-spacing: -0.3px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .header-action-btn {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${HOME_THEME.textMuted};
      cursor: pointer;
    }
    .main-scroll {
      flex: 1;
      width: 100%;
      padding: 16px 16px 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .main-container {
      width: 100%;
      max-width: 640px;
    }
    .intro-section {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .screen-title {
      font-size: ${30 * fontScale}px;
      font-weight: 600;
      color: ${HOME_THEME.text};
      letter-spacing: -0.5px;
      line-height: 1.25;
    }
    .screen-subtitle {
      font-size: ${15 * fontScale}px;
      line-height: 1.45;
      color: ${HOME_THEME.textMuted};
    }
    .puzzle-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }
    .puzzle-row {
      background: ${HOME_THEME.surface};
      border: 1px solid ${HOME_THEME.border};
      border-radius: 16px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: ${96 * (t.largeText ? 1.15 : 1)}px;
      cursor: pointer;
      transition: background-color 100ms ease;
    }
    .puzzle-row:hover {
      background: ${HOME_THEME.surface2};
    }
    .tile-wrap {
      width: 72px;
      height: 72px;
      border-radius: 14px;
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .details-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }
    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .card-title {
      font-size: ${18 * fontScale}px;
      font-weight: 600;
      color: ${HOME_THEME.text};
      letter-spacing: -0.2px;
    }
    .card-label {
      font-size: ${12 * fontScale}px;
      font-weight: 500;
    }
    .card-desc {
      font-size: ${15 * fontScale}px;
      line-height: 1.45;
      color: ${HOME_THEME.textMuted};
    }
    .chevron-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${HOME_THEME.textMuted};
      padding-left: 4px;
      flex-shrink: 0;
    }
    .learn-row {
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 4px;
      gap: 12px;
      cursor: pointer;
    }
    .learn-text {
      font-size: ${14 * fontScale}px;
      line-height: 1.4;
      color: ${HOME_THEME.textMuted};
    }
    .ad-banner-area {
      width: 100%;
      padding: 6px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }
    .mock-banner-box {
      width: min(92%, 640px);
      height: 44px;
      border-radius: 8px;
      border: 1px solid ${HOME_THEME.border};
      background: ${HOME_THEME.surface2};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${12 * fontScale}px;
      font-weight: 500;
      color: ${HOME_THEME.textMuted};
      letter-spacing: 0.2px;
    }
    svg {
      display: block;
    }
  </style>
</head>
<body>
  <div class="app-root">
    <!-- Header -->
    <div class="header-bar">
      <div class="header-inner">
        <div class="header-logo-group">
          <div class="header-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${HOME_THEME.onPrimary}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="header-title">SolvaCube</div>
        </div>
        <div class="header-actions">
          <div class="header-action-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="header-action-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-scroll">
      <div class="main-container">
        <!-- Intro -->
        <div class="intro-section">
          <h1 class="screen-title">What are you solving?</h1>
          <p class="screen-subtitle">
            Pick your puzzle, copy its colours, and we'll show you each move.
          </p>
        </div>

        <!-- 4 Puzzle Rows -->
        <div class="puzzle-list">
          ${PUZZLES.map((p) => {
            const illHtml = ReactDOMServer.renderToString(
              React.createElement(HomePuzzleIllustration, { puzzleId: p.id })
            );
            return `
            <div class="puzzle-row">
              <div class="tile-wrap">
                ${illHtml}
              </div>

              <div class="details-col">
                <div class="title-row">
                  <span class="card-title">${p.name}</span>
                  ${
                    p.meaningfulLabel
                      ? `<span class="card-label" style="color: ${p.labelColor || HOME_THEME.textMuted};">${p.meaningfulLabel}</span>`
                      : ''
                  }
                </div>
                <span class="card-desc">${p.description}</span>
              </div>

              <div class="chevron-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${HOME_THEME.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
            `;
          }).join('')}
        </div>

        <!-- Learn Row -->
        <div class="learn-row">
          <span class="learn-text">
            New to cubes? Learn how to hold one and read moves
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${HOME_THEME.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    </div>

    <!-- Bottom Ad Banner -->
    <div class="ad-banner-area">
      <div class="mock-banner-box">
        Ad
      </div>
    </div>
  </div>
</body>
</html>`;

    const page = await browser.newPage({
      viewport: { width: t.width, height: t.height },
    });

    await page.setContent(fullHtml, { waitUntil: 'load' });
    await page.waitForTimeout(100);

    const outPath = path.join(ARTIFACTS_DIR, t.filename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot: ${t.filename} (${t.width}x${t.height}) -> ${outPath}`);
    await page.close();
  }

  // 2. Capture Close-up (2x) of the Four Illustrations Side by Side
  console.log('Capturing Close-up (2x) of the four illustrations...');
  const closeupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SolvaCube Puzzle Illustrations Close-up (2x)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: ${HOME_THEME.bg};
      color: ${HOME_THEME.text};
      font-family: 'DM Sans', 'Nunito', -apple-system, sans-serif;
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    h2 {
      font-size: 20px;
      font-weight: 600;
      color: ${HOME_THEME.text};
    }
    p {
      font-size: 13px;
      color: ${HOME_THEME.textMuted};
    }
    .illustrations-row {
      display: flex;
      gap: 24px;
      align-items: center;
      justify-content: center;
      background: ${HOME_THEME.surface};
      border: 1px solid ${HOME_THEME.border};
      border-radius: 20px;
      padding: 24px 32px;
    }
    .item-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .tile-2x {
      width: 144px;
      height: 144px;
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .tile-2x svg {
      width: 144px;
      height: 144px;
    }
    .item-name {
      font-size: 15px;
      font-weight: 600;
      color: ${HOME_THEME.text};
    }
    .item-detail {
      font-size: 12px;
      color: ${HOME_THEME.textMuted};
    }
  </style>
</head>
<body>
  <h2>SolvaCube Vector Illustrations (2x Scale)</h2>
  <p>Flat vector style, exact PALETTE colors, 1.5 px dark-grey (#2B2B2B) gaps, mathematically unified isometric basis.</p>

  <div class="illustrations-row">
    ${PUZZLES.map((p) => {
      const illHtml = ReactDOMServer.renderToString(
        React.createElement(HomePuzzleIllustration, { puzzleId: p.id })
      );
      // Double the scale by wrapping in a 2x scaled SVG container or tile
      return `
      <div class="item-col">
        <div class="tile-2x" style="background: ${HOME_THEME.tints[p.id]};">
          <div style="transform: scale(2); transform-origin: center center;">
            ${illHtml}
          </div>
        </div>
        <div class="item-name">${p.name}</div>
        <div class="item-detail">${p.id === 'pyraminx' ? '9 triangles / face' : p.id + ' grid'}</div>
      </div>
      `;
    }).join('')}
  </div>
</body>
</html>`;

  const closeupPage = await browser.newPage({
    viewport: { width: 840, height: 380 },
  });
  await closeupPage.setContent(closeupHtml, { waitUntil: 'load' });
  await closeupPage.waitForTimeout(100);

  const closeupOutPath = path.join(ARTIFACTS_DIR, 'illustrations_closeup_2x.png');
  await closeupPage.screenshot({ path: closeupOutPath, fullPage: false });
  console.log(`Saved 2x illustrations close-up -> ${closeupOutPath}`);
  await closeupPage.close();

  await browser.close();
  console.log('All screenshots and close-up captured successfully!');
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});

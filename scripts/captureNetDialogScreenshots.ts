import React from 'react';
// @ts-ignore
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { PuzzleNet } from '../src/components/PuzzleNet';
import { getStandardSolved4x4State } from '../src/solvers/cube4x4/cube4x4Geometry';
import { DEFAULT_PYRAMINX_SOLVED } from '../src/solvers/pyraminx/pyraminxFacelets';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

interface RenderTarget {
  puzzleId: '4x4' | 'pyraminx';
  state: any;
  highlightMove: string;
  width: number;
  height: number;
  filename: string;
}

const TARGETS: RenderTarget[] = [
  {
    puzzleId: '4x4',
    state: getStandardSolved4x4State(),
    highlightMove: '2R',
    width: 1440,
    height: 900,
    filename: 'net_dialog_4x4_1440x900.png',
  },
  {
    puzzleId: '4x4',
    state: getStandardSolved4x4State(),
    highlightMove: '2R',
    width: 360,
    height: 640,
    filename: 'net_dialog_4x4_360x640.png',
  },
  {
    puzzleId: 'pyraminx',
    state: DEFAULT_PYRAMINX_SOLVED,
    highlightMove: 'U',
    width: 1440,
    height: 900,
    filename: 'net_dialog_pyraminx_1440x900.png',
  },
  {
    puzzleId: 'pyraminx',
    state: DEFAULT_PYRAMINX_SOLVED,
    highlightMove: 'U',
    width: 360,
    height: 640,
    filename: 'net_dialog_pyraminx_360x640.png',
  },
];

async function main() {
  console.log('Capturing Net Overview Dialog Screenshots...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  for (const t of TARGETS) {
    const netHtml = ReactDOMServer.renderToString(
      React.createElement(PuzzleNet, {
        puzzleId: t.puzzleId,
        state: t.state,
        readOnly: true,
        highlightMove: t.highlightMove,
      })
    );

    const dialogHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${t.width}, height=${t.height}, initial-scale=1.0" />
  <title>${t.puzzleId.toUpperCase()} Net Overview Dialog (${t.width}x${t.height})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${t.width}px;
      height: ${t.height}px;
      background-color: #0B1120;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .screen-bg {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .dialog-card {
      background: #0F172A;
      border: 1px solid rgba(34, 211, 238, 0.3);
      border-radius: 14px;
      padding: 14px 16px;
      width: ${t.width <= 480 ? '94%' : 'min(900px, 85%)'};
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .dialog-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dialog-title {
      font-size: ${t.width <= 480 ? '12px' : '15px'};
      font-weight: 700;
      color: #F8FAFC;
    }
    .close-btn {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;
      font-size: 16px;
      cursor: pointer;
      border-radius: 4px;
    }
    .dialog-body {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    svg {
      display: block;
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="screen-bg">
    <div class="dialog-card">
      <div class="dialog-header">
        <div class="dialog-title-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span class="dialog-title">2D Net Overview (Turning Layer Outlined in Cyan) · Move ${t.highlightMove}</span>
        </div>
        <div class="close-btn">&#x2715;</div>
      </div>
      <div class="dialog-body">
        ${netHtml}
      </div>
    </div>
  </div>
</body>
</html>`;

    const tmpPath = path.resolve(`temp_dialog_${t.filename}.html`);
    fs.writeFileSync(tmpPath, dialogHtml);

    const page = await browser.newPage({
      viewport: { width: t.width, height: t.height },
    });

    await page.goto('file:///' + tmpPath.replace(/\\/g, '/'));
    await page.waitForTimeout(300);

    const outPath = path.join(ARTIFACTS_DIR, t.filename);
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${t.filename} (${t.width}x${t.height})`);

    await page.close();
    fs.unlinkSync(tmpPath);
  }

  await browser.close();
  console.log('All Net Overview Dialog screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Error capturing net screenshots:', err);
  process.exit(1);
});


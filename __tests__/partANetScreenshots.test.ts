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

describe('PART A: 2D Net Overview Dialog Screenshots', () => {
  jest.setTimeout(60000);

  test('Capture 4x4 and Pyraminx Net Overview Dialogs at 1440x900 and 360x640', async () => {
    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
    });

    const TARGETS = [
      {
        puzzleId: '4x4' as const,
        state: getStandardSolved4x4State(),
        highlightMove: '2R',
        width: 1440,
        height: 900,
        filename: 'net_dialog_4x4_1440x900.png',
      },
      {
        puzzleId: '4x4' as const,
        state: getStandardSolved4x4State(),
        highlightMove: '2R',
        width: 360,
        height: 640,
        filename: 'net_dialog_4x4_360x640.png',
      },
      {
        puzzleId: 'pyraminx' as const,
        state: DEFAULT_PYRAMINX_SOLVED,
        highlightMove: 'U',
        width: 1440,
        height: 900,
        filename: 'net_dialog_pyraminx_1440x900.png',
      },
      {
        puzzleId: 'pyraminx' as const,
        state: DEFAULT_PYRAMINX_SOLVED,
        highlightMove: 'U',
        width: 360,
        height: 640,
        filename: 'net_dialog_pyraminx_360x640.png',
      },
    ];

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
      padding: ${t.width <= 480 ? '8px' : '24px'};
    }
    .dialog-card {
      background: #0F172A;
      border: 1px solid rgba(34, 211, 238, 0.35);
      border-radius: 14px;
      padding: ${t.width <= 480 ? '10px' : '16px 20px'};
      width: ${t.width <= 480 ? '96%' : 'min(920px, 88%)'};
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .dialog-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dialog-title {
      font-size: ${t.width <= 480 ? '11px' : '14px'};
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: 0.2px;
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

      expect(fs.existsSync(outPath)).toBe(true);
      const stat = fs.statSync(outPath);
      expect(stat.size).toBeGreaterThan(1000);
    }

    await browser.close();
  });
});


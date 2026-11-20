import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();

  // 1. Composite Setup Side-by-Side (4 x 360 = 1440 width, 680 height)
  await page.setViewportSize({ width: 1440, height: 700 });
  const setupHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; background: #0B1120; font-family: sans-serif; display: flex; flex-direction: column; }
        .title { color: #F8FAFC; font-size: 20px; font-weight: 800; padding: 12px 16px; border-bottom: 1px solid #1E293B; }
        .row { display: flex; flex-direction: row; }
        .col { width: 360px; height: 640px; border-right: 1px solid #1E293B; position: relative; }
        .label { position: absolute; top: 10px; left: 10px; background: rgba(15,23,42,0.85); color: #22D3EE; font-weight: 800; font-size: 13px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(34,211,238,0.3); z-index: 100; }
        img { width: 360px; height: 640px; display: block; }
      </style>
    </head>
    <body>
      <div class="title">Part 1 Verification: Setup Screen Framing Across All 4 Puzzles (Calibrated to 3x3 Apparent Size)</div>
      <div class="row">
        <div class="col"><div class="label">3x3 Cube (Reference)</div><img src="file:///${path.join(ARTIFACTS_DIR, 'part1_setup_3x3_360x640.png').replace(/\\/g, '/')}" /></div>
        <div class="col"><div class="label">2x2 Pocket Cube</div><img src="file:///${path.join(ARTIFACTS_DIR, 'part1_setup_2x2_360x640.png').replace(/\\/g, '/')}" /></div>
        <div class="col"><div class="label">4x4 Revenge Cube (Calibrated)</div><img src="file:///${path.join(ARTIFACTS_DIR, 'part1_setup_4x4_360x640.png').replace(/\\/g, '/')}" /></div>
        <div class="col"><div class="label">Pyraminx</div><img src="file:///${path.join(ARTIFACTS_DIR, 'part1_setup_pyraminx_360x640.png').replace(/\\/g, '/')}" /></div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(setupHtml);
  await page.waitForTimeout(500);
  const setupCompPath = path.join(ARTIFACTS_DIR, 'part1_setup_side_by_side.png');
  await page.screenshot({ path: setupCompPath });
  console.log(`Saved composite setup: ${setupCompPath}`);

  // 2. Composite Player Side-by-Side (4 x 360 = 1440 width, 680 height)
  const playerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; background: #0B1120; font-family: sans-serif; display: flex; flex-direction: column; }
        .title { color: #F8FAFC; font-size: 20px; font-weight: 800; padding: 12px 16px; border-bottom: 1px solid #1E293B; }
        .row { display: flex; flex-direction: row; }
        .col { width: 360px; height: 640px; border-right: 1px solid #1E293B; position: relative; }
        .label { position: absolute; top: 10px; left: 10px; background: rgba(15,23,42,0.85); color: #22D3EE; font-weight: 800; font-size: 13px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(34,211,238,0.3); z-index: 100; }
        img { width: 360px; height: 640px; display: block; }
      </style>
    </head>
    <body>
      <div class="title">Part 1 Verification: Solution Player Framing & Arrows Across All 4 Puzzles (58% Stage Fill, ≥12px Margins)</div>
      <div class="row">
        <div class="col"><div class="label">3x3 Cube (Reference)</div><img src="file:///${path.join(ARTIFACTS_DIR, 'part1_player_3x3_360x640.png').replace(/\\/g, '/')}" /></div>
        <div class="col"><div class="label">2x2 Pocket Cube</div><img src="file:///${path.join(ARTIFACTS_DIR, 'part1_player_2x2_360x640.png').replace(/\\/g, '/')}" /></div>
        <div class="col"><div class="label">4x4 Revenge Cube (Calibrated)</div><img src="file:///${path.join(ARTIFACTS_DIR, 'part1_player_4x4_360x640.png').replace(/\\/g, '/')}" /></div>
        <div class="col"><div class="label">Pyraminx</div><img src="file:///${path.join(ARTIFACTS_DIR, 'part1_player_pyraminx_360x640.png').replace(/\\/g, '/')}" /></div>
      </div>
    </body>
    </html>
  `;
  await page.setContent(playerHtml);
  await page.waitForTimeout(500);
  const playerCompPath = path.join(ARTIFACTS_DIR, 'part1_player_side_by_side.png');
  await page.screenshot({ path: playerCompPath });
  console.log(`Saved composite player: ${playerCompPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

async function main() {
  console.log('Capturing Part 1 Setup and Player screenshots across all 4 puzzles...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 360, height: 640 });

  const puzzles = ['3x3', '2x2', '4x4', 'pyraminx'];

  for (const p of puzzles) {
    // 1. Setup screen
    console.log(`Navigating to setup for ${p}...`);
    await page.goto(`http://localhost:8081/input?puzzle=${p}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500); // Wait for WebGL context to render
    const setupFile = path.join(ARTIFACTS_DIR, `part1_setup_${p}_360x640.png`);
    await page.screenshot({ path: setupFile });
    console.log(`Saved ${setupFile}`);

    // 2. Player screen
    console.log(`Navigating to player for ${p}...`);
    await page.goto(`http://localhost:8081/player?puzzle=${p}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const playerFile = path.join(ARTIFACTS_DIR, `part1_player_${p}_360x640.png`);
    await page.screenshot({ path: playerFile });
    console.log(`Saved ${playerFile}`);
  }

  await browser.close();
  console.log('Finished capturing all Part 1 screenshots!');
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});


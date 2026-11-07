const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const outDir = path.resolve(__dirname, '../.screenshots_verification');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Arrow gallery
  console.log('Navigating to arrow gallery...');
  await page.goto('http://localhost:8081/arrow-gallery', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'arrow_gallery_3x3.png') });
  console.log('Captured arrow_gallery_3x3.png');

  // Click 4x4 tab
  const tab4x4 = page.locator('text=4x4 Cube');
  if (await tab4x4.isVisible()) {
    await tab4x4.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'arrow_gallery_4x4.png') });
    console.log('Captured arrow_gallery_4x4.png');
  }

  // Click Pyraminx tab
  const tabPyraminx = page.locator('text=Pyraminx');
  if (await tabPyraminx.isVisible()) {
    await tabPyraminx.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'arrow_gallery_pyraminx.png') });
    console.log('Captured arrow_gallery_pyraminx.png');
  }

  // 2. 4x4 Player Screen with wide and slice moves
  console.log('Navigating to 4x4 player screen...');
  await page.goto('http://localhost:8081/player?debug=1');
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    if (window.__solvaStore) {
      window.__solvaStore.setState({
        activePuzzleId: '4x4',
        solutionMoves: [
          { notation: 'Rw', description: 'Turn the two RIGHT layers CLOCKWISE', stage: 'Stage 1 of 4: Build the Centres' },
          { notation: 'r', description: 'Turn inner right slice', stage: 'Stage 1 of 4: Build the Centres' },
          { notation: 'Uw', description: 'Turn the two TOP layers CLOCKWISE', stage: 'Stage 2 of 4: Pair all 12 Edges' },
        ],
        currentMoveIndex: 0,
        isPlaying: false,
        showSolvedCelebration: false,
      });
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'player_4x4_wide_move.png') });
  console.log('Captured player_4x4_wide_move.png');

  // 3. Pyraminx Player Screen with hovering cap (0.08 lift) and orbit arrow
  console.log('Navigating to Pyraminx player screen...');
  await page.evaluate(() => {
    if (window.__solvaStore) {
      window.__solvaStore.setState({
        activePuzzleId: 'pyraminx',
        solutionMoves: [
          { notation: 'U', description: 'Turn Top corner CLOCKWISE', stage: 'Stage 1: Solve Tips' },
        ],
        currentMoveIndex: 0,
        isPlaying: false,
        showSolvedCelebration: false,
      });
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'player_pyraminx_hovering_cap.png') });
  console.log('Captured player_pyraminx_hovering_cap.png');

  await browser.close();
  console.log('Verification screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});

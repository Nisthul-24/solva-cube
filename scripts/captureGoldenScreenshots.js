const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNAPSHOT_DIR = path.join(__dirname, '..', '__tests__', 'golden_snapshots');
const IMAGES_DIR = path.join(SNAPSHOT_DIR, 'images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

const MOVES_3X3 = [
  'R', "R'", 'R2',
  'L', "L'", 'L2',
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

const MOVES_2X2 = [
  'R', "R'", 'R2',
  'U', "U'", 'U2',
  'F', "F'", 'F2',
];

function sanitizeMoveName(m) {
  return m.replace("'", 'prime');
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Capturing 3x3 and 2x2 Golden Playwright Snapshots ===');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const manifest = {};

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Capturing for Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      // 1. 3x3 Input Screen
      await page.goto('http://localhost:8081/input');
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        if (window.__solvaStore) {
          window.__solvaStore.getState().setActivePuzzle('3x3');
        }
      });
      await page.waitForTimeout(1000);
      const imgPathInput3x3 = path.join(IMAGES_DIR, `input_3x3_${vp.name}.png`);
      await page.screenshot({ path: imgPathInput3x3 });
      console.log(`Saved: input_3x3_${vp.name}.png`);

      // 2. 2x2 Input Screen
      await page.evaluate(() => {
        if (window.__solvaStore) {
          window.__solvaStore.getState().setActivePuzzle('2x2');
        }
      });
      await page.waitForTimeout(1000);
      const imgPathInput2x2 = path.join(IMAGES_DIR, `input_2x2_${vp.name}.png`);
      await page.screenshot({ path: imgPathInput2x2 });
      console.log(`Saved: input_2x2_${vp.name}.png`);

      // 3. 3x3 Player Waiting State
      await page.goto('http://localhost:8081/player?debug=1');
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        if (window.__solvaStore) {
          const puzzle = '3x3';
          window.__solvaStore.setState({
            activePuzzleId: puzzle,
            solutionMoves: [],
            currentMoveIndex: 0,
            isPlaying: false,
            showSolvedCelebration: false,
          });
        }
      });
      await page.waitForTimeout(1200);
      const imgPathPlayer3x3Wait = path.join(IMAGES_DIR, `player_3x3_waiting_${vp.name}.png`);
      await page.screenshot({ path: imgPathPlayer3x3Wait });
      console.log(`Saved: player_3x3_waiting_${vp.name}.png`);

      // 4. 3x3 Player 18 Moves
      await page.evaluate((moves) => {
        if (window.__solvaStore) {
          window.__solvaStore.setState({
            activePuzzleId: '3x3',
            solutionMoves: moves.map((m) => ({ notation: m, description: `Move ${m}` })),
            currentMoveIndex: 0,
            isPlaying: false,
            showSolvedCelebration: false,
          });
        }
      }, MOVES_3X3);

      for (let i = 0; i < MOVES_3X3.length; i++) {
        const m = MOVES_3X3[i];
        await page.evaluate((idx) => {
          if (window.__solvaStore) {
            window.__solvaStore.setState({ currentMoveIndex: idx, isPlaying: false });
          }
        }, i);
        await page.waitForTimeout(800); // allow camera / arrow render
        const moveFileName = `player_3x3_move_${sanitizeMoveName(m)}_${vp.name}.png`;
        const imgPath = path.join(IMAGES_DIR, moveFileName);
        await page.screenshot({ path: imgPath });
        console.log(`Saved: ${moveFileName}`);
      }

      // 5. 2x2 Player Waiting State
      await page.evaluate(() => {
        if (window.__solvaStore) {
          window.__solvaStore.setState({
            activePuzzleId: '2x2',
            solutionMoves: [],
            currentMoveIndex: 0,
            isPlaying: false,
            showSolvedCelebration: false,
          });
        }
      });
      await page.waitForTimeout(1200);
      const imgPathPlayer2x2Wait = path.join(IMAGES_DIR, `player_2x2_waiting_${vp.name}.png`);
      await page.screenshot({ path: imgPathPlayer2x2Wait });
      console.log(`Saved: player_2x2_waiting_${vp.name}.png`);

      // 6. 2x2 Player 9 Moves
      await page.evaluate((moves) => {
        if (window.__solvaStore) {
          window.__solvaStore.setState({
            activePuzzleId: '2x2',
            solutionMoves: moves.map((m) => ({ notation: m, description: `Move ${m}` })),
            currentMoveIndex: 0,
            isPlaying: false,
            showSolvedCelebration: false,
          });
        }
      }, MOVES_2X2);

      for (let i = 0; i < MOVES_2X2.length; i++) {
        const m = MOVES_2X2[i];
        await page.evaluate((idx) => {
          if (window.__solvaStore) {
            window.__solvaStore.setState({ currentMoveIndex: idx, isPlaying: false });
          }
        }, i);
        await page.waitForTimeout(800);
        const moveFileName = `player_2x2_move_${sanitizeMoveName(m)}_${vp.name}.png`;
        const imgPath = path.join(IMAGES_DIR, moveFileName);
        await page.screenshot({ path: imgPath });
        console.log(`Saved: ${moveFileName}`);
      }

      await context.close();
    }

    // Compute manifest checksums
    console.log('\n--- Computing Manifest SHA256 Checksums ---');
    const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith('.png')).sort();
    for (const f of files) {
      const data = fs.readFileSync(path.join(IMAGES_DIR, f));
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      manifest[f] = hash;
    }

    fs.writeFileSync(
      path.join(SNAPSHOT_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
    console.log(`Saved manifest.json with ${Object.keys(manifest).length} screenshot hashes.`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Snapshot capture failed:', err);
  process.exit(1);
});


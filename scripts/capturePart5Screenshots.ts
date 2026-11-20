import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

async function main() {
  console.log('Capturing Part 5 screenshots...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 360, height: 640 });

  // 1. Player screen with "I made a mistake" button
  await page.goto('http://localhost:8081/player', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // If no active moves in store, set a sample scramble and solve via window.__solvaStore
  await page.evaluate(() => {
    const store = (window as any).__solvaStore;
    if (store) {
      store.getState().fillSampleScramble();
      store.getState().solveCurrentState();
    }
  });
  await page.waitForTimeout(1000);

  const playerFile = path.join(ARTIFACTS_DIR, 'part5_player_mistake_btn_360x640.png');
  await page.screenshot({ path: playerFile });
  console.log(`Saved ${playerFile}`);

  // 2. Home screen with "Continue your solve" card
  // Populate AsyncStorage with an in-progress solve session
  await page.evaluate(() => {
    const session = {
      puzzleId: '3x3',
      state: (window as any).__solvaStore?.getState()?.currentState,
      solutionMoves: (window as any).__solvaStore?.getState()?.solutionMoves || [
        { notation: 'R', axis: 'x', layer: 2, angle: -1.57, description: 'Right turn' },
        { notation: 'U', axis: 'y', layer: 2, angle: -1.57, description: 'Up turn' },
      ],
      currentMoveIndex: 1,
      totalMoves: 18,
      timestamp: Date.now(),
    };
    localStorage.setItem('@solvacube_resume_solve', JSON.stringify(session));
  });

  await page.goto('http://localhost:8081/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const homeFile = path.join(ARTIFACTS_DIR, 'part5_home_continue_card_360x640.png');
  await page.screenshot({ path: homeFile });
  console.log(`Saved ${homeFile}`);

  await browser.close();
  console.log('Finished capturing Part 5 screenshots!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


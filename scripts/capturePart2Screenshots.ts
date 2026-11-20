import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

async function main() {
  console.log('Capturing Part 2 Learn 4x4 Tab screenshots...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();

  // 1. Mobile 360x640
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('http://localhost:8081/learn?puzzle=4x4', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const mobileFile = path.join(ARTIFACTS_DIR, 'part2_learn_4x4_360x640.png');
  await page.screenshot({ path: mobileFile });
  console.log(`Saved ${mobileFile}`);

  // 2. Desktop 1440x900
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8081/learn?puzzle=4x4', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  const desktopFile = path.join(ARTIFACTS_DIR, 'part2_learn_4x4_1440x900.png');
  await page.screenshot({ path: desktopFile });
  console.log(`Saved ${desktopFile}`);

  await browser.close();
  console.log('Finished capturing Part 2 screenshots!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


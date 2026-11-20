import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

async function main() {
  console.log('Capturing Part 3 Camera scan screenshots...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 360, height: 640 });

  // 1. Camera test dev screen (/camera-test)
  await page.goto('http://localhost:8081/camera-test', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  // Click synthetic sample button to populate results
  const syntheticBtn = await page.$('text=Generate Synthetic Test Face');
  if (syntheticBtn) {
    await syntheticBtn.click();
    await page.waitForTimeout(600);
  }
  const testFile = path.join(ARTIFACTS_DIR, 'part3_camera_test_360x640.png');
  await page.screenshot({ path: testFile });
  console.log(`Saved ${testFile}`);

  // 2. Setup screen with Scan button
  await page.goto('http://localhost:8081/input?puzzle=4x4', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const inputFile = path.join(ARTIFACTS_DIR, 'part3_input_with_scan_btn_360x640.png');
  await page.screenshot({ path: inputFile });
  console.log(`Saved ${inputFile}`);

  await browser.close();
  console.log('Finished capturing Part 3 screenshots!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


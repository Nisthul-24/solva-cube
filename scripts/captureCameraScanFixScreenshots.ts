import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\nisth\\.gemini\\antigravity\\brain\\8a2cebb8-361f-4969-93bd-dc26ce6ac9b4';

async function main() {
  console.log('Capturing Camera Scan fix screenshots...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 360, height: 640 });

  // 1. Setup screen showing untruncated Scan button
  await page.goto('http://localhost:8081/input?puzzle=3x3', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const toolsFile = path.join(ARTIFACTS_DIR, 'setup_tools_row_untruncated_360x640.png');
  await page.screenshot({ path: toolsFile });
  console.log(`Saved ${toolsFile}`);

  // 2. Open Camera Scan modal
  const scanBtn = await page.$('text=Scan');
  if (scanBtn) {
    await scanBtn.click();
    await page.waitForTimeout(1500);
  }

  const liveFile = path.join(ARTIFACTS_DIR, 'camera_scan_live_dots_360x640.png');
  await page.screenshot({ path: liveFile });
  console.log(`Saved ${liveFile}`);

  // 3. Click the Snap button to open the Confirm Face Colors dialog
  // Snap button has accessibilityLabel="Take snapshot" or class snapBtn
  const snapBtn = await page.$('[aria-label="Take snapshot"]');
  if (snapBtn) {
    await snapBtn.click();
    await page.waitForTimeout(1500);
  } else {
    // Try clicking by selector
    const snapBtn2 = await page.$('div[style*="border-radius: 34px"]');
    if (snapBtn2) {
      await snapBtn2.click();
      await page.waitForTimeout(1500);
    }
  }

  const confirmFile = path.join(ARTIFACTS_DIR, 'camera_scan_confirm_dialog_360x640.png');
  await page.screenshot({ path: confirmFile });
  console.log(`Saved ${confirmFile}`);

  await browser.close();
  console.log('Finished capturing Camera Scan fix screenshots!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


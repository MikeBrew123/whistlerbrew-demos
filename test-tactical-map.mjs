import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';

const screenshotDir = '/tmp/whistlerbrew-debug';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

console.log('\n🔍 Testing Tactical Map Feature...\n');

// Login
await page.goto('https://whistlerbrew.com', { waitUntil: 'networkidle' });
await page.locator('button:has-text("Enter Projects")').click();
await page.waitForTimeout(500);
await page.locator('input[type="password"]').fill('Wildfire2026');
await page.locator('button:has-text("Enter")').last().click();
await page.waitForTimeout(2000);

// Go to SPS Briefing
await page.locator('a[href*="sps-briefing"]').click();
await page.waitForTimeout(2000);

console.log('📝 Filling out form for Pemberton...');

// Fill form
const inputs = await page.locator('input[type="text"]').all();
await page.locator('select').selectOption('Whistler');
await inputs[0].fill('Whistler Fire Rescue');
await inputs[1].fill('Pemberton');

// Submit
console.log('🚀 Generating briefing...');
await page.locator('button:has-text("Generate Briefing")').click();
await page.waitForTimeout(15000);

// Check if Tactical Map button exists
const tacticalMapButton = page.locator('button:has-text("Tactical Map")');
const buttonExists = await tacticalMapButton.isVisible();

console.log(`📡 Tactical Map button visible: ${buttonExists}`);

if (buttonExists) {
  console.log('🗺️ Clicking Tactical Map button...');

  // Set up download listener
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

  await tacticalMapButton.click();

  try {
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    const path = `/tmp/${filename}`;

    await download.saveAs(path);

    console.log(`✅ Downloaded: ${filename}`);
    console.log(`   Saved to: ${path}`);

    // Read KML content to verify
    const kmlContent = await import('fs').then(fs => fs.promises.readFile(path, 'utf-8'));

    // Check for expected content
    const hasRoads = kmlContent.includes('Roads') || kmlContent.includes('highway');
    const hasWater = kmlContent.includes('Water') || kmlContent.includes('waterway');
    const hasRadioLink = kmlContent.includes('Radio Channel') || kmlContent.includes('seatosky_road_channels');
    const hasDescription = kmlContent.includes('Tactical Road and Water Map');

    console.log('\n📊 KML Content Verification:');
    console.log(`   Roads layer: ${hasRoads ? '✅' : '❌'}`);
    console.log(`   Water features: ${hasWater ? '✅' : '❌'}`);
    console.log(`   Radio channel link: ${hasRadioLink ? '✅' : '❌'}`);
    console.log(`   Description: ${hasDescription ? '✅' : '❌'}`);
    console.log(`   File size: ${(kmlContent.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.log(`❌ Download failed: ${error.message}`);
  }
} else {
  console.log('❌ Tactical Map button not found');
}

await page.screenshot({ path: `${screenshotDir}/tactical-map-test.png`, fullPage: true });
console.log(`\n📸 Screenshot saved to ${screenshotDir}/tactical-map-test.png`);

await browser.close();

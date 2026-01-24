import { chromium } from 'playwright';

const screenshotDir = '/tmp/whistlerbrew-debug';
await import('fs').then(fs => fs.promises.mkdir(screenshotDir, { recursive: true }));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// Enable console logging to see errors
page.on('console', msg => console.log('BROWSER:', msg.text()));
page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

console.log('\n🔍 Testing SPS Briefing generation...');
await page.goto('https://whistlerbrew.com', { waitUntil: 'networkidle' });

// Login
await page.locator('button:has-text("Enter Projects")').click();
await page.waitForTimeout(500);
await page.locator('input[type="password"]').fill('Wildfire2026');
await page.locator('button:has-text("Enter")').last().click();
await page.waitForTimeout(2000);

// Go to SPS Briefing
await page.locator('a[href*="sps-briefing"]').click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${screenshotDir}/briefing-form.png`, fullPage: true });

console.log('📝 Filling out form...');

// Select start location
await page.locator('select').selectOption('Whistler');
await page.waitForTimeout(500);

// Fill Report TO (second text input)
const inputs = await page.locator('input[type="text"]').all();
await inputs[0].fill('Whistler Fire Rescue');
await page.waitForTimeout(500);

// Fill Community to Protect (third text input)
await inputs[1].fill('Pemberton');
await page.waitForTimeout(500);

await page.screenshot({ path: `${screenshotDir}/form-filled.png`, fullPage: true });

console.log('🚀 Submitting form...');

// Click Generate Briefing
await page.locator('button:has-text("Generate Briefing")').click();
await page.waitForTimeout(10000); // Wait for API calls

await page.screenshot({ path: `${screenshotDir}/after-submit.png`, fullPage: true });

// Check for errors
const errorText = await page.locator('text=/error|fail/i').allTextContents();
if (errorText.length > 0) {
  console.log('❌ Errors found:', errorText);
}

// Check if results loaded
const resultsVisible = await page.locator('text=/briefing|route|community/i').count();
console.log(`📊 Results sections found: ${resultsVisible}`);

console.log(`\n✅ Screenshots saved to ${screenshotDir}`);
await browser.close();

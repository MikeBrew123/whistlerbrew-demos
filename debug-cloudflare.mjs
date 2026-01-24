import { chromium } from 'playwright';

const screenshotDir = '/tmp/whistlerbrew-debug';
await import('fs').then(fs => fs.promises.mkdir(screenshotDir, { recursive: true }));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// Test new deployment
console.log('\n🔍 Testing latest Cloudflare deployment...');
await page.goto('https://e1c6cd8e.whistlerbrew-demos.pages.dev', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${screenshotDir}/01-homepage.png`, fullPage: true });

// Check if logo loaded
const logoImg = page.locator('img[alt="WhistlerBrew.com"]');
const logoVisible = await logoImg.isVisible().catch(() => false);
console.log(`Logo visible: ${logoVisible}`);

if (logoVisible) {
  const logoSrc = await logoImg.getAttribute('src');
  console.log(`Logo src: ${logoSrc}`);

  // Check natural dimensions
  const dimensions = await logoImg.evaluate(img => ({
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    displayWidth: img.width,
    displayHeight: img.height
  }));
  console.log(`Logo dimensions:`, dimensions);
}

// Click Enter Projects
console.log('\n🔍 Clicking "Enter Projects"...');
await page.locator('button:has-text("Enter Projects")').click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${screenshotDir}/02-modal.png` });

// Enter password
console.log('🔍 Entering password...');
await page.locator('input[type="password"]').fill('Wildfire2026');
await page.locator('button:has-text("Enter")').last().click();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${screenshotDir}/03-projects-page.png`, fullPage: true });

// Navigate to SPS Briefing (the geocoding page)
console.log('\n🔍 Going to SPS Briefing page...');
const spsBriefingLink = page.locator('text=SPS Briefing').or(page.locator('a[href*="sps-briefing"]'));
const linkExists = await spsBriefingLink.count();

if (linkExists > 0) {
  await spsBriefingLink.first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${screenshotDir}/04-sps-briefing.png`, fullPage: true });

  // Try to search for a city
  console.log('🔍 Testing geocoding...');
  const searchInput = page.locator('input').first();
  await searchInput.fill('Whistler');
  await page.waitForTimeout(500);

  // Look for search button or enter key
  await searchInput.press('Enter');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${screenshotDir}/05-search-error.png`, fullPage: true });

  // Check for error message
  const errorText = await page.locator('text=/failed.*geocode/i').textContent().catch(() => null);
  if (errorText) {
    console.log(`❌ Error found: ${errorText}`);
  }
}

console.log(`\n✅ Screenshots saved to ${screenshotDir}`);
await browser.close();

import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

console.log('🔍 Testing briefing sections in browser...\n');

// Login
await page.goto('https://whistlerbrew.com');
await page.locator('button:has-text("Enter Projects")').click();
await page.waitForTimeout(500);
await page.locator('input[type="password"]').fill('Wildfire2026');
await page.locator('button:has-text("Enter")').last().click();
await page.waitForTimeout(2000);

// Go to SPS Briefing
await page.locator('a[href*="sps-briefing"]').click();
await page.waitForTimeout(2000);

// Fill form for Burns Lake
const inputs = await page.locator('input[type="text"]').all();
await inputs[0].fill('Burns Lake Fire Department');
await inputs[1].fill('Burns Lake');

// Select district
const select = page.locator('select');
await select.click();
await page.waitForTimeout(500);
await select.selectOption({ index: 1 });

console.log('🚀 Generating briefing for Burns Lake...');
await page.locator('button:has-text("Generate Briefing")').click();

// Wait for loading to finish
await page.waitForSelector('text=Generate Another Briefing', { timeout: 30000 });
console.log('✅ Briefing loaded\n');

// Get the actual HTML from the page
const briefingHTML = await page.evaluate(() => {
  const element = document.querySelector('.prose');
  return element ? element.innerHTML : null;
});

if (!briefingHTML) {
  console.log('❌ No .prose element found');
  await browser.close();
  process.exit(1);
}

// Count sections
const sections = briefingHTML.match(/<h2[^>]*>([^<]+)<\/h2>/g) || [];
console.log('📊 Sections found in rendered HTML:');
sections.forEach((section, i) => {
  const title = section.match(/>([^<]+)</)[1];
  console.log(`   ${i + 1}. ${title}`);
});

console.log(`\n   Total sections: ${sections.length}`);

// Check for specific sections
console.log('\n🔍 Key sections:');
console.log(`   First Nations: ${briefingHTML.includes('Local First Nations') ? '✅' : '❌'}`);
console.log(`   Major Employers: ${briefingHTML.includes('Major Employers') ? '✅' : '❌'}`);
console.log(`   Water Sources: ${briefingHTML.includes('Water Sources') ? '✅' : '❌'}`);
console.log(`   Weather: ${briefingHTML.includes('Weather Forecast') ? '✅' : '❌'}`);
console.log(`   Road Conditions: ${briefingHTML.includes('Road Conditions') ? '✅' : '❌'}`);

// Check byte size
console.log(`\n   HTML size: ${(briefingHTML.length / 1024).toFixed(2)} KB`);

// Take screenshot
await page.screenshot({ path: '/tmp/briefing-screenshot.png', fullPage: true });
console.log('\n📸 Screenshot saved to /tmp/briefing-screenshot.png');

await page.waitForTimeout(3000);
await browser.close();

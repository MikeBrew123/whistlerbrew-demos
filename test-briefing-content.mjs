import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log('🔍 Testing briefing content...\n');

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

// Fill form
await page.locator('select').selectOption('Whistler');
const inputs = await page.locator('input[type="text"]').all();
await inputs[0].fill('Whistler Fire Rescue');
await inputs[1].fill('Whistler');

// Generate
console.log('🚀 Generating briefing...');
await page.locator('button:has-text("Generate Briefing")').click();

// Wait for either results or error
try {
  await page.waitForSelector('.prose', { timeout: 25000 });
  console.log('✅ Briefing loaded\n');
} catch (e) {
  const errorText = await page.textContent('body');
  console.log('❌ Briefing failed to load');
  console.log('Page content:', errorText.substring(0, 500));
  await browser.close();
  process.exit(1);
}

// Check for sections
const html = await page.locator('.prose').first().innerHTML();

console.log('\n📊 Section Check:');
console.log(`   First Nations: ${html.includes('Local First Nations') ? '✅' : '❌'}`);
console.log(`   Employers: ${html.includes('Major Employers') ? '✅' : '❌'}`);
console.log(`   Weather: ${html.includes('Weather Forecast') ? '✅' : '❌'}`);
console.log(`   Fires: ${html.includes('Active Fires') ? '✅' : '❌'}`);

// Count sections
const sections = html.match(/<h2/g);
console.log(`\n   Total sections: ${sections ? sections.length : 0}`);

await browser.close();

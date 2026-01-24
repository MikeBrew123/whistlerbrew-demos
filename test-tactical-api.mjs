// Test tactical map API directly

const BASE_URL = 'https://whistlerbrew.com';

console.log('🔍 Testing Tactical Map API...\n');

try {
  const response = await fetch(`${BASE_URL}/api/tactical-map/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      community: 'Pemberton',
      latitude: 50.3197,
      longitude: -122.8014,
      radiusKm: 30
    })
  });

  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log(`Content-Type: ${response.headers.get('content-type')}`);

  if (response.ok) {
    const kmlData = await response.text();
    console.log(`\n✅ KML Generated!`);
    console.log(`   Size: ${(kmlData.length / 1024).toFixed(2)} KB`);

    // Check content
    const hasRoads = kmlData.includes('Roads') || kmlData.includes('highway');
    const hasWater = kmlData.includes('Water') || kmlData.includes('waterway');
    const hasRadioLink = kmlData.includes('Radio Channel') || kmlData.includes('.pdf');
    const hasSeaToSky = kmlData.includes('Sea to Sky');

    console.log(`\n📊 Content Check:`);
    console.log(`   Roads: ${hasRoads ? '✅' : '❌'}`);
    console.log(`   Water: ${hasWater ? '✅' : '❌'}`);
    console.log(`   Radio link: ${hasRadioLink ? '✅' : '❌'}`);
    console.log(`   Sea to Sky region: ${hasSeaToSky ? '✅' : '❌'}`);

    // Show first 500 chars
    console.log(`\n📄 KML Preview:`);
    console.log(kmlData.substring(0, 500) + '...');
  } else {
    const error = await response.text();
    console.log(`\n❌ Error: ${error}`);
  }
} catch (error) {
  console.log(`\n❌ Request failed: ${error.message}`);
}

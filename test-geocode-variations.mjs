// Test different search terms for Whistler

const BASE_URL = 'https://whistlerbrew.com';

const searches = [
  'Whistler',
  'Whistler, BC',
  'Whistler Village',
  'Whistler Village, BC',
  '4010 Whistler Way, Whistler, BC' // Whistler Fire Rescue address
];

for (const address of searches) {
  const response = await fetch(`${BASE_URL}/api/geocode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });

  const data = await response.json();

  console.log(`\n📍 "${address}"`);
  console.log(`   ${data.formattedAddress}`);
  console.log(`   ${data.latitude}, ${data.longitude}`);
  console.log(`   Score: ${data.score}`);
}

console.log('\n\n✅ For reference:');
console.log('Whistler Village Center: 50.1163, -122.9574');
console.log('Whistler Fire Rescue: 50.1322, -122.9482');
console.log('Nita Lake: 50.1084, -122.9562');

// Test Whistler geocoding

const BASE_URL = 'https://whistlerbrew.com';

console.log('Testing Whistler geocoding...\n');

const response = await fetch(`${BASE_URL}/api/geocode`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: 'Whistler' })
});

const data = await response.json();

console.log('Geocode Result:');
console.log(`Address: ${data.formattedAddress}`);
console.log(`Latitude: ${data.latitude}`);
console.log(`Longitude: ${data.longitude}`);
console.log(`Score: ${data.score}`);

console.log('\n✅ Expected Whistler Village coordinates:');
console.log('Latitude: ~50.1163');
console.log('Longitude: ~-122.9574');

console.log('\n📍 Actual difference:');
console.log(`Lat diff: ${Math.abs(data.latitude - 50.1163).toFixed(4)}`);
console.log(`Lng diff: ${Math.abs(data.longitude - (-122.9574)).toFixed(4)}`);

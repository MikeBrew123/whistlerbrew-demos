// Test what data the APIs actually return

const BASE_URL = 'https://whistlerbrew.com';

async function testAPI(name, url, body) {
  console.log(`\n🔍 ${name}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

await testAPI(
  'Route Calculation',
  `${BASE_URL}/api/route-calculate`,
  {
    origin: 'Whistler',
    destination: 'Pemberton',
    originLat: 50.1163,
    originLng: -122.9574,
    destLat: 50.3197,
    destLng: -122.8014
  }
);

await testAPI(
  'Weather API',
  `${BASE_URL}/api/weather`,
  {
    latitude: 50.3197,
    longitude: -122.8014,
    location: 'Pemberton'
  }
);

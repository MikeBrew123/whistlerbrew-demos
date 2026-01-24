// Test all API endpoints used by SPS Briefing

const BASE_URL = 'https://whistlerbrew.com';

async function testEndpoint(name, url, method = 'POST', body = {}) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(body) : undefined
    });

    const status = response.status;
    const statusText = response.statusText;

    if (response.ok) {
      const data = await response.json().catch(() => response.text());
      console.log(`   ✅ ${status} ${statusText}`);
      return { success: true, status, data };
    } else {
      const error = await response.text();
      console.log(`   ❌ ${status} ${statusText}`);
      console.log(`   Error: ${error.substring(0, 200)}`);
      return { success: false, status, error };
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run tests
console.log('🚀 Testing SPS Briefing API Endpoints\n');

await testEndpoint(
  'Geocode API',
  `${BASE_URL}/api/geocode`,
  'POST',
  { address: 'Whistler, BC' }
);

await testEndpoint(
  'Route Calculation',
  `${BASE_URL}/api/route-calculate`,
  'POST',
  {
    origin: 'Whistler',
    destination: 'Pemberton',
    originLat: 50.1163,
    originLng: -122.9574,
    destLat: 50.3197,
    destLng: -122.8014
  }
);

await testEndpoint(
  'Route Brief Generation',
  `${BASE_URL}/api/route-brief/generate`,
  'POST',
  {
    origin: 'Whistler',
    destination: 'Pemberton',
    originLat: 50.1163,
    originLng: -122.9574,
    destLat: 50.3197,
    destLng: -122.8014
  }
);

await testEndpoint(
  'Weather API',
  `${BASE_URL}/api/weather`,
  'POST',
  {
    latitude: 50.3197,
    longitude: -122.8014,
    location: 'Pemberton'
  }
);

await testEndpoint(
  'Fires Nearby',
  `${BASE_URL}/api/fires/nearby`,
  'POST',
  {
    latitude: 50.3197,
    longitude: -122.8014,
    radiusKm: 100
  }
);

console.log('\n✅ API endpoint tests complete');

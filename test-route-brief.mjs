// Test route brief generation

const BASE_URL = 'https://whistlerbrew.com';

const response = await fetch(`${BASE_URL}/api/route-brief/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: 'Whistler',
    destination: 'Pemberton',
    originLat: 50.1163,
    originLng: -122.9574,
    destLat: 50.3197,
    destLng: -122.8014,
    departureDate: '2026-01-25',
    departureTime: '08:00'
  })
});

const data = await response.json();
console.log('Route Brief Response:');
console.log(JSON.stringify(data, null, 2));

export const runtime = 'edge';

// Proxy for FireSmart display images.
// Fetches Google Drive / external images server-side so Chrome ORB never fires.
// Usage: /api/firesmart-img?id=DRIVE_FILE_ID
//        /api/firesmart-img?src=https://any-image-url

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id  = searchParams.get('id');
  const src = searchParams.get('src');

  let targetUrl: string;
  if (id) {
    targetUrl = `https://drive.google.com/uc?export=view&id=${id}`;
  } else if (src) {
    // Basic allowlist: only proxy http/https image URLs
    if (!src.startsWith('http://') && !src.startsWith('https://')) {
      return new Response('Invalid src', { status: 400 });
    }
    targetUrl = src;
  } else {
    return new Response('Missing id or src', { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FireSmart-Display/1.0)' },
      redirect: 'follow',
    });

    if (!res.ok) return new Response('Image unavailable', { status: res.status });

    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return new Response('Not an image', { status: 415 });
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Fetch failed', { status: 502 });
  }
}

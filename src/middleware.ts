import { NextRequest, NextResponse } from "next/server";

// mylittleshadow.com is served by this same Pages project: its front page is the
// My Little Shadow home page (public/shadow/), and www goes to the bare domain.
// On whistlerbrew.com, the Bridge and the home page moved to mylittleshadow.com; the
// query string is kept so a Stripe checkout started on the old address still lands.
const MOVED: Record<string, string> = {
  "/bridge/index.html": "/bridge",
  "/shadow/index.html": "/",
  "/shadow/": "/",
  "/shadow/tell.html": "/tell",
  "/shadow/privacy.html": "/privacy",
  "/shadow/terms.html": "/terms",
  "/shadow/contact.html": "/contact",
  "/shadow/articles/what-would-my-dog-say.html": "/what-would-my-dog-say",
  "/shadow/articles/what-is-my-cat-thinking.html": "/what-is-my-cat-thinking",
  "/shadow/articles/questions-to-ask-your-dog.html": "/questions-to-ask-your-dog",
};

// Clean addresses on mylittleshadow.com for pages that live under public/shadow/.
const PAGES: Record<string, string> = {
  "/": "/shadow/index.html",
  "/privacy": "/shadow/privacy.html",
  "/terms": "/shadow/terms.html",
  "/contact": "/shadow/contact.html",
  "/tell": "/shadow/tell.html",
  // Search guides (built from Hazel's drafts by scripts/mls-article.py).
  "/what-would-my-dog-say": "/shadow/articles/what-would-my-dog-say.html",
  "/what-is-my-cat-thinking": "/shadow/articles/what-is-my-cat-thinking.html",
  "/questions-to-ask-your-dog": "/shadow/articles/questions-to-ask-your-dog.html",
  "/bridge": "/bridge/index.html",
  // The site's own robots, sitemap and icons (whistlerbrew.com keeps its own).
  "/robots.txt": "/shadow/robots.txt",
  "/sitemap.xml": "/shadow/sitemap.xml",
  "/favicon.ico": "/shadow/favicon.ico",
  "/favicon.svg": "/shadow/favicon.svg",
  "/apple-touch-icon.png": "/shadow/apple-touch-icon.png",
};

const OWN_PREFIXES = ["/shadow/", "/bridge/", "/api/bridge", "/_next/"];
const SEARCH_CONSOLE_FILE = "/google6e9e7a1290118832.html";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const url = req.nextUrl.clone();

  if (!host.endsWith("mylittleshadow.com")) {
    const to = MOVED[url.pathname];
    if (!to || !host.endsWith("whistlerbrew.com")) return NextResponse.next();
    return NextResponse.redirect(`https://mylittleshadow.com${to}${url.search}`, 308);
  }

  if (host.startsWith("www.")) {
    url.host = "mylittleshadow.com";
    url.port = "";
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }
  // Old file addresses on this domain go to their clean address (query kept for Stripe returns).
  const clean = MOVED[url.pathname];
  if (clean) return NextResponse.redirect(`https://mylittleshadow.com${clean}${url.search}`, 308);
  const page = PAGES[url.pathname];
  if (!page) {
    // Only My Little Shadow's own files live on this domain; the rest of whistlerbrew.com is not served here.
    const own = OWN_PREFIXES.some((p) => url.pathname.startsWith(p)) || url.pathname === SEARCH_CONSOLE_FILE;
    return own ? NextResponse.next() : new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  }
  url.pathname = page;
  return NextResponse.rewrite(url);
}

// Every path except Next build assets, so the brand domain can refuse whistlerbrew.com pages.
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };

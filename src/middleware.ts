import { NextRequest, NextResponse } from "next/server";

// mylittleshadow.com is served by this same Pages project: its front page is the
// My Little Shadow home page (public/shadow/), and www goes to the bare domain.
// On whistlerbrew.com, the Bridge and the home page moved to mylittleshadow.com; the
// query string is kept so a Stripe checkout started on the old address still lands.
const MOVED: Record<string, string> = {
  "/bridge/index.html": "/bridge",
  "/shadow/index.html": "/",
  "/shadow/": "/",
};

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
  if (url.pathname !== "/") return NextResponse.next();
  url.pathname = "/shadow/index.html";
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/", "/bridge/index.html", "/shadow/index.html", "/shadow/"] };

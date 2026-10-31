import { NextRequest, NextResponse } from "next/server";

// mylittleshadow.com is served by this same Pages project: its front page is the
// My Little Shadow home page (public/shadow/), and www goes to the bare domain.
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (!host.endsWith("mylittleshadow.com")) return NextResponse.next();
  const url = req.nextUrl.clone();
  if (host.startsWith("www.")) {
    url.host = "mylittleshadow.com";
    url.port = "";
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }
  url.pathname = "/shadow/index.html";
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/"] };

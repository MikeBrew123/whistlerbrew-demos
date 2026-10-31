import { NextRequest, NextResponse } from "next/server";

// mylittleshadow.com is served by this same Pages project. Until it has its own home page,
// its front door is The Rainbow Bridge; www goes to the bare domain.
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (!host.endsWith("mylittleshadow.com")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.host = "mylittleshadow.com";
  url.port = "";
  url.protocol = "https";
  url.pathname = "/bridge/index.html";
  return NextResponse.redirect(url, 307);
}

export const config = { matcher: ["/"] };

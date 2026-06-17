import { NextRequest, NextResponse } from "next/server";

// When Shopify loads our App URL (the site root) inside the admin iframe, it
// always appends embed params (embedded=1, host, shop). In that case, route to
// the embedded app instead of showing the public marketing homepage.
// Normal visitors (no embed params) are unaffected.
export function middleware(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const isEmbedded =
    sp.get("embedded") === "1" || (!!sp.get("host") && !!sp.get("shop"));

  if (isEmbedded) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/shopify/app";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Only run on the site root.
export const config = { matcher: "/" };

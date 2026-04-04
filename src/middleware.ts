import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return NextResponse.next();

  // Health endpoint is always public (Docker healthchecks)
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  // Check for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");
    const cookieToken = request.cookies.get("snapshotr-token")?.value;

    if (authHeader === `Bearer ${apiKey}` || cookieToken === apiKey) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check for dashboard pages (except login)
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  const cookieToken = request.cookies.get("snapshotr-token")?.value;
  if (cookieToken === apiKey) {
    return NextResponse.next();
  }

  // Redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

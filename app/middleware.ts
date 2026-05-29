import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has session cookie
  const sessionCookie = request.cookies.get("factory-session");
  const hasSession = !!sessionCookie?.value;

  // If user is on login page and has session, redirect to home
  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is trying to access a protected route without session, redirect to login
  // Protected routes are everything except /login and /api
  const isPublicRoute = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api");

  if (!isPublicRoute && !isApiRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};

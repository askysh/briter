import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

const OPEN_PREFIXES = [
  "/setup",
  "/api/setup",
  "/api/health",
  "/api/login",
  "/api/logout",
  "/posts",
  "/feed.xml",
  "/uploads",
  "/login",
  "/docs",
];

const OPEN_EXACT = ["/", "/favicon.ico"];

function isOpenPath(pathname: string): boolean {
  if (OPEN_EXACT.includes(pathname)) return true;
  return OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isOpenPath(pathname)) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg).*)"],
};

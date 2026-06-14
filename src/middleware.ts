import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "wc_session";

const PUBLIC_PATHS = ["/login", "/register"];

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and Next internals are excluded via matcher below.
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const token = req.cookies.get(COOKIE_NAME)?.value;
  let payload: { userId?: string; role?: string } | null = null;
  if (token) {
    try {
      const { payload: p } = await jwtVerify(token, getSecret());
      payload = p as { userId?: string; role?: string };
    } catch {
      payload = null;
    }
  }

  // Logged-in users hitting /login, /register or / go to their home.
  if (payload && (pathname === "/login" || pathname === "/register" || pathname === "/")) {
    const url = req.nextUrl.clone();
    url.pathname = payload.role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  if (isPublic) return NextResponse.next();

  // Everything else requires auth.
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Admin area requires ADMIN role.
  if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

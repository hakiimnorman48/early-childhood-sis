import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth(function proxy(req: NextRequest & { auth: any }) {
  const { nextUrl } = req;
  const session = (req as any).auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role as string | undefined;

  const isLoginPage = nextUrl.pathname === "/login";
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isStatic = nextUrl.pathname.startsWith("/_next");

  if (isStatic || isApiRoute) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL(`/${role}`, req.url));
  }

  if (isLoggedIn && nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL(`/${role}`, req.url));
  }

  if (nextUrl.pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(`/${role}`, req.url));
  }
  if (
    nextUrl.pathname.startsWith("/teacher") &&
    role !== "teacher" &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL(`/${role}`, req.url));
  }
  if (nextUrl.pathname.startsWith("/parent") && role !== "parent") {
    return NextResponse.redirect(new URL(`/${role}`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

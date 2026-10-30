import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Signed-in users skip the login page — except a deactivated user, who is sent here to be signed out
  if (pathname === "/login") {
    if (req.nextUrl.searchParams.get("reason") === "deactivated") return NextResponse.next();
    return token ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/login"],
};

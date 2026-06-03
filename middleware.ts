import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production" || req.headers.get("x-forwarded-proto") === "https";
  
  // 1. Try default next-auth token resolution
  let token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isProd,
  });

  // 2. Try explicit Auth.js v5 cookie name lookup (authjs.session-token)
  if (!token) {
    const v5CookieName = isProd ? "__Secure-authjs.session-token" : "authjs.session-token";
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: v5CookieName,
      secureCookie: isProd,
    });
  }

  // 3. Try insecure Auth.js v5 name as fallback (in case proxy SSL termination hides secure protocol)
  if (!token && isProd) {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: "authjs.session-token",
      secureCookie: false,
    });
  }
  
  const isLoggedIn = !!token;
  const role = token?.role;
  const verificationStatus = token?.verificationStatus;

  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isSellerRoute = pathname.startsWith("/seller");
  const isBuyerRoute = pathname.startsWith("/buyer");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // Case 1: Unauthenticated access
  if (!isLoggedIn) {
    if (isAdminRoute || isSellerRoute || isBuyerRoute) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Case 2: Authenticated user attempting to view Login or Register
  if (isAuthRoute) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    } else if (role === "seller") {
      return NextResponse.redirect(new URL("/seller/dashboard", req.url));
    } else {
      return NextResponse.redirect(new URL("/buyer/dashboard", req.url));
    }
  }

  // Case 3: Role-based route guard enforcement
  if (isAdminRoute && role !== "admin") {
    const fallback = role === "seller" ? "/seller/dashboard" : "/buyer/dashboard";
    return NextResponse.redirect(new URL(fallback, req.url));
  }

  if (isSellerRoute) {
    if (role !== "seller") {
      const fallback = role === "admin" ? "/admin/dashboard" : "/buyer/dashboard";
      return NextResponse.redirect(new URL(fallback, req.url));
    }
    
    // Block unapproved/suspended sellers from managing listings/orders/quotes
    if (verificationStatus !== "approved" && pathname !== "/seller/dashboard") {
      return NextResponse.redirect(new URL("/seller/dashboard", req.url));
    }
  }

  if (isBuyerRoute && role !== "buyer") {
    const fallback = role === "admin" ? "/admin/dashboard" : "/seller/dashboard";
    return NextResponse.redirect(new URL(fallback, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/seller/:path*",
    "/buyer/:path*",
    "/login",
    "/register",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // Retrieve token from request cookies. 
  // Under production (https), Vercel/NextAuth prefixes cookie with __Secure-
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    // Add raw cookie name lookup fallback if next-auth fails to auto-resolve cookie name
  });
  
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

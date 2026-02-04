import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes - Landing page and login are accessible without authentication
  const publicRoutes = ["/", "/login", "/api/auth"];
  const isPublicRoute = publicRoutes.some((route) => 
    pathname === route || pathname.startsWith("/api/auth")
  );

  // Allow static files (images, etc.)
  const isStaticFile = pathname.startsWith("/images/") || 
                       pathname.includes(".jpg") || 
                       pathname.includes(".png") ||
                       pathname.includes(".svg");

  if (isPublicRoute || isStaticFile) {
    // If logged in and trying to access login, redirect to dashboard
    if (isLoggedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/resumen", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)"],
};

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // Validar que la sesión sea válida (debe tener email y user válido)
  const session = req.auth;
  const isValidSession = !!(
    session?.user?.email && 
    session?.user?.id &&
    (session?.user as any)?.role
  );

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
    if (isValidSession && pathname === "/login") {
      return NextResponse.redirect(new URL("/resumen", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not authenticated or session is invalid
  if (!isValidSession) {
    // Limpiar cookies de sesión inválidas
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    
    const response = NextResponse.redirect(loginUrl);
    
    // Eliminar cookies de sesión inválidas
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)"],
};

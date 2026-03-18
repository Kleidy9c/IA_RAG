import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protegemos toda la aplicación por defecto. 
// Si alguien entra y no está logueado, Clerk lo enviará a su pantalla de login.
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Ignora archivos estáticos de Next.js, pero protege rutas y APIs
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAllowedEmailAddress } from "@/lib/auth";

// Create route matcher for public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/unauthorized',
  '/api/webhooks/(.*)', // Allow webhooks to pass through
]);

// Protect all routes and enforce email restrictions
export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();

  if (!userId && !isPublicRoute(req)) {
    return redirectToSignIn();
  }

  if (userId && !isPublicRoute(req)) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const primaryEmail = user.primaryEmailAddress?.emailAddress;

      if (primaryEmail && !isAllowedEmailAddress(primaryEmail)) {
        const url = req.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error("Error checking user email authorization:", error);
      const url = req.nextUrl.clone();
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

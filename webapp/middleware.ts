import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { ALLOWED_EMAIL_ADDRESSES } from "./app/users";

// Create route matcher for public routes that don't require email verification
const isPublicRoute = createRouteMatcher([
  '/unauthorized',
  '/api/webhooks/(.*)', // Allow webhooks to pass through
]);

// Protect all routes and enforce email restrictions
export default clerkMiddleware(async (auth, req) => {
  // Get the pathname from the request
  const pathname = req.nextUrl.pathname;

  // Check if user is authenticated
  const { userId } = await auth();

  // If user is authenticated, check if their email is allowed
  if (userId && !isPublicRoute(req)) {
    try {
      // Use clerkClient to get user information in middleware context
      const client = await clerkClient();
      const user = await client.users.getUser(userId);

      if (user) {
        // Get the user's primary email address
        const primaryEmail = user.primaryEmailAddress?.emailAddress;

        if (primaryEmail && !ALLOWED_EMAIL_ADDRESSES.includes(primaryEmail)) {
          // User's email is not in the allowed list, redirect to unauthorized page
          console.log(`Access denied for email: ${primaryEmail}`);

          const url = req.nextUrl.clone();
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }
      }
    } catch (error) {
      console.error('Error checking user email authorization:', error);
      // On error, redirect to unauthorized page for security
      const url = req.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
  }

  // Create a response object to modify
  const response = NextResponse.next();

  // Add the pathname to the response headers to be used in layouts
  response.headers.set("x-pathname", pathname);

  return response;
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
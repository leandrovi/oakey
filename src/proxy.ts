import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublic = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password(.*)",
  "/brand(.*)",
]);

const isAuthEntry = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/forgot-password(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  if (userId && isAuthEntry(request)) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }
  if (!isPublic(request)) {
    await auth.protect({ unauthenticatedUrl: new URL("/sign-in", request.url).toString() });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

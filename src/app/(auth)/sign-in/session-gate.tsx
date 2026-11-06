"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Hides the sign-in form until Clerk says there is no client session. */
export function SignInSessionGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const signedIn = isLoaded && Boolean(userId);

  useEffect(() => {
    if (signedIn) router.replace("/overview");
  }, [signedIn, router]);

  if (!isLoaded || signedIn) return null;
  return children;
}

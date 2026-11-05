"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_PASSWORD, sendSignInCode, signInWithPassword } from "../../_lib/fake-auth";
import { signInPasswordSchema } from "../../_lib/schemas";

export function SignInPasswordView() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signInPasswordSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter your password.");
      return;
    }
    setSubmitting(true);
    const result = await signInWithPassword(email, password);
    setSubmitting(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    router.push("/overview");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Enter your password</h1>
        <p className="text-sm text-muted-foreground">
          Signing in as <span className="font-medium text-foreground">{email}</span>.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">Demo password: {DEMO_PASSWORD}</p>
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={async () => {
            await sendSignInCode(email);
            router.push(`/sign-in/verify?email=${encodeURIComponent(email)}`);
          }}
        >
          Use a code instead
        </button>
        <Link href="/forgot-password" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}

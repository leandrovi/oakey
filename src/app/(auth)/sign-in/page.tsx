"use client";

import { ArrowRight, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { identify, sendSignInCode } from "../_lib/fake-auth";
import { emailSchema } from "../_lib/schemas";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "choose">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }
    setSubmitting(true);
    const result = await identify(parsed.data);
    setSubmitting(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setEmail(parsed.data);
    setError(null);
    setStep("choose");
  }

  async function useEmailCode() {
    setSubmitting(true);
    await sendSignInCode(email);
    setSubmitting(false);
    router.push(`/sign-in/verify?email=${encodeURIComponent(email)}`);
  }

  function usePassword() {
    router.push(`/sign-in/password?email=${encodeURIComponent(email)}`);
  }

  if (step === "choose") {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-medium tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Signing in as <span className="font-medium text-foreground">{email}</span>.{" "}
            <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setStep("email")}>
              Not you?
            </button>
          </p>
        </div>
        <div className="space-y-2">
          <Button className="w-full justify-between" variant="outline" disabled={submitting} onClick={useEmailCode}>
            <span className="inline-flex items-center gap-2">
              <Mail className="size-4" /> Email me a code
            </span>
            <ArrowRight className="size-4" />
          </Button>
          <Button className="w-full justify-between" variant="outline" onClick={usePassword}>
            <span className="inline-flex items-center gap-2">
              <KeyRound className="size-4" /> Use password
            </span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Sign in to Oakey</h1>
        <p className="text-sm text-muted-foreground">Enter your email to continue.</p>
      </div>
      <form className="space-y-4" onSubmit={handleIdentify}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Continuing…" : "Continue"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </div>
  );
}

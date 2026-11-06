"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpStep } from "../_components/otp-step";
import { useOakeyAuth } from "../_lib/use-oakey-auth";
import { emailSchema, newPasswordSchema } from "../_lib/schemas";

type Step = "email" | "code" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset, resendCode, resetPassword, verifyPasswordResetCode } = useOakeyAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }
    setSubmitting(true);
    const result = await requestPasswordReset(parsed.data);
    setSubmitting(false);
    if (result.status === "error") {
      setEmailError(result.message);
      return;
    }
    setEmail(parsed.data);
    setStep("code");
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const next: { password?: string; confirmPassword?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "password" | "confirmPassword";
        if (!next[key]) next[key] = issue.message;
      }
      setPasswordErrors(next);
      return;
    }
    setSubmitting(true);
    const result = await resetPassword(email, parsed.data.password);
    setSubmitting(false);
    if (result.status === "error") {
      setPasswordErrors({ password: result.message });
      return;
    }
    setStep("done");
  }

  if (step === "code") {
    return (
      <OtpStep
        email={email}
        title="Check your inbox"
        description={
          <>
            Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span> to reset your password.
          </>
        }
        onVerify={async (code) => {
          const result = await verifyPasswordResetCode(email, code);
          if (result.status === "error") return { ok: false, message: result.message };
          setStep("password");
          return { ok: true };
        }}
        onResend={async () => {
          await resendCode(email);
        }}
        footer={
          <button type="button" className="text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => setStep("email")}>
            Use a different email
          </button>
        }
      />
    );
  }

  if (step === "password") {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-medium tracking-tight">Set a new password</h1>
          <p className="text-sm text-muted-foreground">Make it one you haven&apos;t used on Oakey before.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSetPassword}>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordErrors((er) => ({ ...er, password: undefined }));
              }}
              aria-invalid={passwordErrors.password ? true : undefined}
            />
            {passwordErrors.password && <p className="text-sm text-destructive">{passwordErrors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordErrors((er) => ({ ...er, confirmPassword: undefined }));
              }}
              aria-invalid={passwordErrors.confirmPassword ? true : undefined}
            />
            {passwordErrors.confirmPassword && <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Save new password"}
          </Button>
        </form>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-medium tracking-tight">Password updated</h1>
          <p className="text-sm text-muted-foreground">Sign in with your new password.</p>
        </div>
        <Button className="w-full" onClick={() => router.push(`/sign-in/password?email=${encodeURIComponent(email)}`)}>
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll send a 6-digit code to your email.</p>
      </div>
      <form className="space-y-4" onSubmit={handleRequestReset}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            aria-invalid={emailError ? true : undefined}
          />
          {emailError && <p className="text-sm text-destructive">{emailError}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Sending…" : "Send code"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

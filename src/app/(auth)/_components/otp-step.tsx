"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { otpSchema } from "../_lib/schemas";

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpStep({
  email,
  title,
  description,
  onVerify,
  onResend,
  footer,
}: {
  email: string;
  title: string;
  description?: React.ReactNode;
  onVerify: (code: string) => Promise<{ ok: boolean; message?: string }>;
  onResend: () => Promise<void>;
  footer?: React.ReactNode;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function submit(value: string) {
    const parsed = otpSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter all 6 digits.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onVerify(parsed.data);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "That code didn't work.");
      setCode("");
    }
  }

  async function resend() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setError(null);
    await onResend();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-medium tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {description ?? (
            <>
              Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
            </>
          )}
        </p>
      </div>
      <div className="space-y-2">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
            if (value.length === 6) void submit(value);
          }}
          disabled={submitting}
          aria-label="6-digit verification code"
          aria-invalid={error ? true : undefined}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">Demo code: 424242</p>
      </div>
      <Button className="w-full" disabled={submitting || code.length !== 6} onClick={() => submit(code)}>
        {submitting ? "Verifying…" : "Verify"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          disabled={cooldown > 0}
          onClick={resend}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Button>
        {footer}
      </div>
    </div>
  );
}

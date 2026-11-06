"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { requestEmailChange, verifyEmailChangeCode } from "@/app/(auth)/_lib/fake-auth";
import { emailSchema, otpSchema } from "@/app/(auth)/_lib/schemas";

export function ChangeEmailDialog({ currentEmail, onChanged }: { currentEmail: string; onChanged: (email: string) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep("email");
    setNewEmail("");
    setCode("");
    setError(null);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(newEmail);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }
    if (parsed.data === currentEmail) {
      setError("That's already your email.");
      return;
    }
    setSubmitting(true);
    await requestEmailChange(parsed.data);
    setSubmitting(false);
    setNewEmail(parsed.data);
    setError(null);
    setStep("code");
  }

  async function verify(value: string) {
    const parsed = otpSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter all 6 digits.");
      return;
    }
    setSubmitting(true);
    const result = await verifyEmailChangeCode(newEmail, parsed.data);
    setSubmitting(false);
    if (result.status === "error") {
      setError(result.message);
      setCode("");
      return;
    }
    onChanged(newEmail);
    toast.success("Email updated", { description: newEmail });
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Change email
        </Button>
      </DialogTrigger>
      <DialogContent>
        {step === "email" ? (
          <>
            <DialogHeader>
              <DialogTitle>Change your email</DialogTitle>
              <DialogDescription>We&apos;ll send a code to confirm the new address.</DialogDescription>
            </DialogHeader>
            <form className="space-y-3" onSubmit={sendCode}>
              <div className="space-y-1.5">
                <Label htmlFor="new-email">New email</Label>
                <Input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter className="-mx-0 -mb-0 border-t-0 bg-transparent p-0">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending…" : "Send code"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Enter the code</DialogTitle>
              <DialogDescription>
                Sent to <span className="font-medium text-foreground">{newEmail}</span>. Demo code: 424242.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setError(null);
                  if (value.length === 6) void verify(value);
                }}
                disabled={submitting}
                aria-label="6-digit verification code"
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }, (_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter className="-mx-0 -mb-0 border-t-0 bg-transparent p-0">
              <Button variant="outline" onClick={() => setStep("email")}>
                Back
              </Button>
              <Button disabled={submitting || code.length !== 6} onClick={() => verify(code)}>
                Confirm
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Laptop, ShieldCheck } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { toast } from "sonner";
import { useOakeyAuth } from "@/app/(auth)/_lib/use-oakey-auth";
import { newPasswordSchema } from "@/app/(auth)/_lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SecurityTab() {
  const clerk = useClerk();
  const { changePassword } = useOakeyAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ current?: string; password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      setErrors({ current: "Enter your current password." });
      return;
    }
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "password" | "confirmPassword";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setSubmitting(true);
    const result = await changePassword(currentPassword, parsed.data.password);
    setSubmitting(false);
    if (result.status === "error") {
      setErrors({ password: result.message });
      return;
    }
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    toast.success("Password updated");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Choose a password you don&apos;t use anywhere else.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="max-w-sm space-y-3" onSubmit={submitPassword}>
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrors((er) => ({ ...er, current: undefined }));
                }}
                aria-invalid={errors.current ? true : undefined}
              />
              {errors.current && <p className="text-sm text-destructive">{errors.current}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((er) => ({ ...er, password: undefined }));
                }}
                aria-invalid={errors.password ? true : undefined}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((er) => ({ ...er, confirmPassword: undefined }));
                }}
                aria-invalid={errors.confirmPassword ? true : undefined}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
          <div className="flex items-start gap-3 rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <p>Two-step verification isn&apos;t set up yet. Connect an authenticator app for a second layer on sign-in.</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Where you&apos;re currently signed in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <Laptop className="size-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">
                  This browser
                  <span className="ml-2 text-xs text-success">This device</span>
                </p>
                <p className="text-muted-foreground">Active now</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => clerk.signOut({ redirectUrl: "/" })}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

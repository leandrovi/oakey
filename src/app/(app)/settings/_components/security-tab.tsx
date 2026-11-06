"use client";

import { Laptop, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { resetPassword, DEMO_EMAIL } from "@/app/(auth)/_lib/fake-auth";
import { newPasswordSchema } from "@/app/(auth)/_lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Session {
  id: string;
  device: string;
  icon: "laptop" | "phone";
  location: string;
  lastActive: string;
  current?: boolean;
}

const INITIAL_SESSIONS: Session[] = [
  { id: "sess_01", device: "MacBook Pro · Chrome", icon: "laptop", location: "Boston, MA", lastActive: "Active now", current: true },
  { id: "sess_02", device: "iPhone 16 · Oakey app", icon: "phone", location: "Boston, MA", lastActive: "2 hours ago" },
  { id: "sess_03", device: "Windows · Edge", icon: "laptop", location: "New York, NY", lastActive: "3 days ago" },
];

export function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ current?: string; password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);

  async function changePassword(e: React.FormEvent) {
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
    await resetPassword(DEMO_EMAIL, parsed.data.password);
    setSubmitting(false);
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    toast.success("Password updated");
  }

  function signOutSession(id: string) {
    setSessions((xs) => xs.filter((s) => s.id !== id));
    toast("Signed out of that device");
  }

  function signOutOthers() {
    setSessions((xs) => xs.filter((s) => s.current));
    toast("Signed out of all other sessions");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Choose a password you don&apos;t use anywhere else.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="max-w-sm space-y-3" onSubmit={changePassword}>
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
          <CardAction>
            <Button variant="outline" size="sm" onClick={signOutOthers} disabled={sessions.length <= 1}>
              Sign out of all other sessions
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((session) => {
            const Icon = session.icon === "laptop" ? Laptop : Smartphone;
            return (
              <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Icon className="size-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {session.device}
                      {session.current && <span className="ml-2 text-xs text-success">This device</span>}
                    </p>
                    <p className="text-muted-foreground">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="sm" onClick={() => signOutSession(session.id)}>
                    Sign out
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

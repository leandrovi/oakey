"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signUp } from "../_lib/fake-auth";
import { passwordStrengthIssues, signUpSchema } from "../_lib/schemas";

const PASSWORD_HINTS = ["At least 8 characters.", "At least one lowercase letter.", "At least one uppercase letter.", "At least one number."];

interface FormState {
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const EMPTY: FormState = { businessName: "", firstName: "", lastName: "", email: "", password: "" };

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  const outstanding = new Set(passwordStrengthIssues(form.password));

  function field(key: keyof FormState) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((er) => ({ ...er, [key]: undefined }));
      },
      "aria-invalid": errors[key] ? (true as const) : undefined,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setSubmitting(true);
    const result = await signUp(parsed.data);
    setSubmitting(false);
    if (result.status === "error") {
      setErrors({ email: result.message });
      return;
    }
    router.push(`/sign-up/verify?email=${encodeURIComponent(parsed.data.email)}`);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Open your Oakey account</h1>
        <p className="text-sm text-muted-foreground">Takes about two minutes.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" autoComplete="organization" {...field("businessName")} />
          {errors.businessName && <p className="text-sm text-destructive">{errors.businessName}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" autoComplete="given-name" {...field("firstName")} />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" autoComplete="family-name" {...field("lastName")} />
            {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...field("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...field("password")}
            onFocus={() => setShowPasswordHints(true)}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          {showPasswordHints && (
            <ul className="grid gap-1 pt-1 text-xs">
              {PASSWORD_HINTS.map((hint) => {
                const met = form.password.length > 0 && !outstanding.has(hint);
                return (
                  <li key={hint} className={cn("flex items-center gap-1.5", met ? "text-success" : "text-muted-foreground")}>
                    {met ? <Check className="size-3" /> : <X className="size-3" />}
                    {hint}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}

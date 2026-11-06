"use client";

import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import type { SignUpInput } from "./schemas";

export type AuthStrategy = "email_code" | "password";

export type AuthResult<T> = { status: "ok"; data: T } | { status: "error"; message: string };

function clerkMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error && "code" in error) {
    const first = error as { longMessage?: string; message?: string; code?: string };
    if (first.code === "form_identifier_not_found") return "No Oakey account uses that email.";
    if (first.code === "form_code_incorrect" || first.code === "form_code_invalid") return "That code didn't work. Check the 6 digits and try again.";
    if (first.code === "form_password_incorrect" || first.code === "form_password_pwned") return first.longMessage || "That password doesn't match this account.";
    return first.longMessage || first.message || fallback;
  }
  if (typeof error === "object" && error && "errors" in error) {
    const first = (error as { errors?: { longMessage?: string; message?: string; code?: string }[] }).errors?.[0];
    if (first) return clerkMessage(first, fallback);
  }
  return fallback;
}

/** Custom Clerk flow. Screens call these hooks; they never render Clerk's prebuilt components. */
export function useOakeyAuth() {
  const { signIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const userApi = useUser();

  async function call(run: () => Promise<{ error: { code?: string; longMessage?: string; message?: string } | null }>, fallback: string): Promise<AuthResult<{ email: string }>> {
    try {
      const result = await run();
      if (result.error) return { status: "error", message: clerkMessage(result.error, fallback) };
      return { status: "ok", data: { email: "" } };
    } catch (error) {
      return { status: "error", message: clerkMessage(error, fallback) };
    }
  }

  async function finishSignIn(fallback: string): Promise<AuthResult<{ email: string }>> {
    if (signIn.status !== "complete") return { status: "error", message: fallback };
    return call(() => signIn.finalize(), fallback);
  }

  async function identify(email: string): Promise<AuthResult<{ email: string; strategies: AuthStrategy[] }>> {
    const created = await call(() => signIn.create({ identifier: email }), "We couldn't look up that email.");
    if (created.status === "error") return created;
    const strategies: AuthStrategy[] = [];
    if (signIn.supportedFirstFactors.some((factor) => factor.strategy === "email_code")) strategies.push("email_code");
    if (signIn.supportedFirstFactors.some((factor) => factor.strategy === "password")) strategies.push("password");
    return { status: "ok", data: { email, strategies: strategies.length > 0 ? strategies : ["email_code"] } };
  }

  async function sendSignInCode(email: string): Promise<AuthResult<{ email: string }>> {
    const sent = await call(() => signIn.emailCode.sendCode({ emailAddress: email }), "Couldn't send the code. Try again.");
    return sent.status === "error" ? sent : { status: "ok", data: { email } };
  }

  async function verifySignInCode(email: string, code: string): Promise<AuthResult<{ email: string }>> {
    const verified = await call(() => signIn.emailCode.verifyCode({ code }), "That code didn't work. Check the 6 digits and try again.");
    if (verified.status === "error") return verified;
    const finished = await finishSignIn("That code didn't finish signing you in.");
    return finished.status === "error" ? finished : { status: "ok", data: { email } };
  }

  async function signInWithPassword(email: string, password: string): Promise<AuthResult<{ email: string }>> {
    const signed = await call(() => signIn.password({ identifier: email, password }), "That password doesn't match this account.");
    if (signed.status === "error") return signed;
    const finished = await finishSignIn("That password didn't finish signing you in.");
    return finished.status === "error" ? finished : { status: "ok", data: { email } };
  }

  async function signUp(input: SignUpInput): Promise<AuthResult<{ email: string }>> {
    const created = await call(
      () => clerkSignUp.create({
        emailAddress: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        unsafeMetadata: { businessName: input.businessName },
      }),
      "Couldn't open that account.",
    );
    if (created.status === "error") return created;
    const sent = await call(() => clerkSignUp.verifications.sendEmailCode(), "Couldn't send the code. Try again.");
    return sent.status === "error" ? sent : { status: "ok", data: { email: input.email } };
  }

  async function verifySignUpCode(email: string, code: string): Promise<AuthResult<{ email: string }>> {
    const verified = await call(() => clerkSignUp.verifications.verifyEmailCode({ code }), "That code didn't work. Check the 6 digits and try again.");
    if (verified.status === "error") return verified;
    if (clerkSignUp.status !== "complete") return { status: "error", message: "That code didn't finish opening the account." };
    const finished = await call(() => clerkSignUp.finalize(), "That code didn't finish opening the account.");
    return finished.status === "error" ? finished : { status: "ok", data: { email } };
  }

  async function requestPasswordReset(email: string): Promise<AuthResult<{ email: string }>> {
    const created = await call(() => signIn.create({ identifier: email }), "Couldn't send a reset code.");
    if (created.status === "error") return created;
    const sent = await call(() => signIn.resetPasswordEmailCode.sendCode(), "Couldn't send a reset code.");
    return sent.status === "error" ? sent : { status: "ok", data: { email } };
  }

  async function verifyPasswordResetCode(email: string, code: string): Promise<AuthResult<{ email: string }>> {
    const verified = await call(() => signIn.resetPasswordEmailCode.verifyCode({ code }), "That code didn't work. Check the 6 digits and try again.");
    if (verified.status === "error") return verified;
    if (signIn.status !== "needs_new_password") return { status: "error", message: "That code didn't work. Check the 6 digits and try again." };
    return { status: "ok", data: { email } };
  }

  async function resetPassword(email: string, newPassword: string): Promise<AuthResult<{ email: string }>> {
    const submitted = await call(() => signIn.resetPasswordEmailCode.submitPassword({ password: newPassword }), "Couldn't set that password.");
    if (submitted.status === "error") return submitted;
    if (signIn.status === "complete") {
      const finished = await call(() => signIn.finalize(), "Couldn't set that password.");
      if (finished.status === "error") return finished;
    }
    return { status: "ok", data: { email } };
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<AuthResult<{ email: string }>> {
    if (!userApi.isLoaded || !userApi.user) return { status: "error", message: "Still loading. Try again." };
    try {
      await userApi.user.updatePassword({ currentPassword, newPassword });
      return { status: "ok", data: { email: userApi.user.primaryEmailAddress?.emailAddress ?? "" } };
    } catch (error) {
      return { status: "error", message: clerkMessage(error, "Couldn't update that password.") };
    }
  }

  async function requestEmailChange(newEmail: string): Promise<AuthResult<{ email: string }>> {
    if (!userApi.isLoaded || !userApi.user) return { status: "error", message: "Still loading. Try again." };
    try {
      const created = await userApi.user.createEmailAddress({ email: newEmail });
      await created.prepareVerification({ strategy: "email_code" });
      sessionStorage.setItem("oakey-email-id", created.id);
      return { status: "ok", data: { email: newEmail } };
    } catch (error) {
      return { status: "error", message: clerkMessage(error, "Couldn't send a code to that email.") };
    }
  }

  async function verifyEmailChangeCode(newEmail: string, code: string): Promise<AuthResult<{ email: string }>> {
    if (!userApi.isLoaded || !userApi.user) return { status: "error", message: "Still loading. Try again." };
    try {
      const stored = sessionStorage.getItem("oakey-email-id");
      const address = userApi.user.emailAddresses.find((item) => item.id === stored || item.emailAddress === newEmail);
      if (!address) return { status: "error", message: "Start the email change again." };
      await address.attemptVerification({ code });
      await userApi.user.update({ primaryEmailAddressId: address.id });
      sessionStorage.removeItem("oakey-email-id");
      return { status: "ok", data: { email: newEmail } };
    } catch (error) {
      return { status: "error", message: clerkMessage(error, "That code didn't work. Check the 6 digits and try again.") };
    }
  }

  async function resendCode(email: string): Promise<AuthResult<{ email: string }>> {
    if (clerkSignUp.status === "missing_requirements") {
      const sent = await call(() => clerkSignUp.verifications.sendEmailCode(), "Couldn't send another code.");
      return sent.status === "error" ? sent : { status: "ok", data: { email } };
    }
    if (signIn.firstFactorVerification.strategy === "reset_password_email_code") return requestPasswordReset(email);
    return sendSignInCode(email);
  }

  return {
    identify,
    sendSignInCode,
    verifySignInCode,
    signInWithPassword,
    signUp,
    verifySignUpCode,
    requestPasswordReset,
    verifyPasswordResetCode,
    resetPassword,
    changePassword,
    requestEmailChange,
    verifyEmailChangeCode,
    resendCode,
  };
}

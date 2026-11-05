/**
 * Prototype stand-in for Clerk's custom-flow hooks (`useSignIn`, `useSignUp`).
 * Shaped the same way on purpose: each step returns a discriminated status so the
 * real Clerk wiring later is a swap of this module, not a rewrite of the screens.
 */

export const DEMO_EMAIL = "alex@northwindstudio.co";
export const DEMO_PASSWORD = "Oakey#2026";
const DEMO_CODE = "424242";

function delay(ms = 550) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AuthStrategy = "email_code" | "password";

export type AuthResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

interface IdentifyData {
  email: string;
  strategies: AuthStrategy[];
}

/** Step 1 of sign-in: look up the email and offer the strategies it supports. */
export async function identify(email: string): Promise<AuthResult<IdentifyData>> {
  await delay(400);
  return { status: "ok", data: { email, strategies: ["email_code", "password"] } };
}

export async function sendSignInCode(email: string): Promise<AuthResult<{ email: string }>> {
  await delay();
  return { status: "ok", data: { email } };
}

/** Resends whatever code was last requested; shared by every verify step. */
export async function resendCode(email: string): Promise<AuthResult<{ email: string }>> {
  await delay(400);
  return { status: "ok", data: { email } };
}

export async function verifySignInCode(email: string, code: string): Promise<AuthResult<{ email: string }>> {
  await delay(500);
  if (code !== DEMO_CODE) return { status: "error", message: "That code didn't work. Check the 6 digits and try again." };
  return { status: "ok", data: { email } };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult<{ email: string }>> {
  await delay(500);
  if (password !== DEMO_PASSWORD) return { status: "error", message: "That password doesn't match this account." };
  return { status: "ok", data: { email } };
}

export interface SignUpInput {
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function signUp(input: SignUpInput): Promise<AuthResult<{ email: string }>> {
  await delay(600);
  return { status: "ok", data: { email: input.email } };
}

export async function verifySignUpCode(email: string, code: string): Promise<AuthResult<{ email: string }>> {
  await delay(500);
  if (code !== DEMO_CODE) return { status: "error", message: "That code didn't work. Check the 6 digits and try again." };
  return { status: "ok", data: { email } };
}

export async function requestPasswordReset(email: string): Promise<AuthResult<{ email: string }>> {
  await delay(500);
  return { status: "ok", data: { email } };
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<AuthResult<{ email: string }>> {
  await delay(500);
  if (code !== DEMO_CODE) return { status: "error", message: "That code didn't work. Check the 6 digits and try again." };
  return { status: "ok", data: { email } };
}

export async function resetPassword(email: string, newPassword: string): Promise<AuthResult<{ email: string }>> {
  void newPassword;
  await delay(600);
  return { status: "ok", data: { email } };
}

/** Settings' "change email" flow: send a code to the new address, then confirm it. */
export async function requestEmailChange(newEmail: string): Promise<AuthResult<{ email: string }>> {
  await delay(500);
  return { status: "ok", data: { email: newEmail } };
}

export async function verifyEmailChangeCode(newEmail: string, code: string): Promise<AuthResult<{ email: string }>> {
  await delay(500);
  if (code !== DEMO_CODE) return { status: "error", message: "That code didn't work. Check the 6 digits and try again." };
  return { status: "ok", data: { email: newEmail } };
}

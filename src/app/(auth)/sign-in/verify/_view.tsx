"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OtpStep } from "../../_components/otp-step";
import { resendCode, verifySignInCode } from "../../_lib/fake-auth";

export function SignInVerifyView() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";

  return (
    <OtpStep
      email={email}
      title="Check your inbox"
      onVerify={async (code) => {
        const result = await verifySignInCode(email, code);
        if (result.status === "error") return { ok: false, message: result.message };
        router.push("/overview");
        return { ok: true };
      }}
      onResend={async () => {
        await resendCode(email);
      }}
      footer={
        <Link href="/sign-in" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Use a different email
        </Link>
      }
    />
  );
}

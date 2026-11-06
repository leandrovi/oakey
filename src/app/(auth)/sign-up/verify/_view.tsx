"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { OtpStep } from "../../_components/otp-step";
import { useOakeyAuth } from "../../_lib/use-oakey-auth";

export function SignUpVerifyView() {
  const router = useRouter();
  const { resendCode, verifySignUpCode } = useOakeyAuth();
  const email = useSearchParams().get("email") ?? "";

  return (
    <OtpStep
      email={email}
      title="Verify your email"
      onVerify={async (code) => {
        const result = await verifySignUpCode(email, code);
        if (result.status === "error") return { ok: false, message: result.message };
        router.push("/overview");
        return { ok: true };
      }}
      onResend={async () => {
        await resendCode(email);
      }}
    />
  );
}

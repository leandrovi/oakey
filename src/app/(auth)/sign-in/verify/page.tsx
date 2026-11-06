import { Suspense } from "react";
import { SignInVerifyView } from "./_view";

export default function SignInVerifyPage() {
  return (
    <Suspense>
      <SignInVerifyView />
    </Suspense>
  );
}

import { Suspense } from "react";
import { SignInPasswordView } from "./_view";

export default function SignInPasswordPage() {
  return (
    <Suspense>
      <SignInPasswordView />
    </Suspense>
  );
}

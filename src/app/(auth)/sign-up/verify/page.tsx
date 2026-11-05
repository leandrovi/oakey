import { Suspense } from "react";
import { SignUpVerifyView } from "./_view";

export default function SignUpVerifyPage() {
  return (
    <Suspense>
      <SignUpVerifyView />
    </Suspense>
  );
}

import { SignInSessionGate } from "./session-gate";

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <SignInSessionGate>{children}</SignInSessionGate>;
}

import { LoansProvider } from "./_lib/store";

export default function LoansLayout({ children }: { children: React.ReactNode }) {
  return <LoansProvider>{children}</LoansProvider>;
}

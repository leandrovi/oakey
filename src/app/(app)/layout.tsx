import { BankProvider } from "@/components/bank/provider";
import { AppShell } from "@/components/shell/app-shell";
import { requireBook } from "@/server/book";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const book = await requireBook();
  return (
    <BankProvider book={book}>
      <AppShell>{children}</AppShell>
    </BankProvider>
  );
}

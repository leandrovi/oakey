import { formatCents } from "@/lib/domain/money";
import type { Cents, TransactionDirection } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Renders a cent amount with tabular digits. Pass `direction` to show a signed, colored amount. */
export function Money({ amount, direction, whole, compact, className }: {
  amount: Cents; direction?: TransactionDirection; whole?: boolean; compact?: boolean; className?: string;
}) {
  const text = formatCents(amount, { whole, compact });
  return (
    <span className={cn("tabular", direction === "credit" && "text-success", className)}>
      {direction === "credit" ? `+${text}` : direction === "debit" ? `−${text}` : text}
    </span>
  );
}

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TransactionFilters } from "../_lib/filters";
import { PERIOD_OPTIONS, typeLabel, type AccountOption } from "../_lib/options";

interface Chip {
  key: string;
  label: string;
  clear: () => void;
}

export function ActiveFilterChips({
  filters,
  onChange,
  accounts,
}: {
  filters: TransactionFilters;
  onChange: (patch: Partial<TransactionFilters>) => void;
  accounts: AccountOption[];
}) {
  const chips: Chip[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `"${filters.q.trim()}"`, clear: () => onChange({ q: "" }) });
  for (const id of filters.accountIds) {
    const account = accounts.find((a) => a.id === id);
    chips.push({ key: `acc-${id}`, label: account?.label ?? String(id), clear: () => onChange({ accountIds: filters.accountIds.filter((a) => a !== id) }) });
  }
  if (filters.category !== "all") chips.push({ key: "category", label: filters.category, clear: () => onChange({ category: "all" }) });
  if (filters.type !== "all") chips.push({ key: "type", label: typeLabel(filters.type), clear: () => onChange({ type: "all" }) });
  if (filters.status !== "all") chips.push({ key: "status", label: filters.status, clear: () => onChange({ status: "all" }) });
  if (filters.period !== "all") {
    const label = PERIOD_OPTIONS.find((p) => p.value === filters.period)?.label ?? filters.period;
    chips.push({ key: "period", label, clear: () => onChange({ period: "all", from: null, to: null }) });
  }
  if (filters.amountMin != null) chips.push({ key: "min", label: `Min $${filters.amountMin}`, clear: () => onChange({ amountMin: null }) });
  if (filters.amountMax != null) chips.push({ key: "max", label: `Max $${filters.amountMax}`, clear: () => onChange({ amountMax: null }) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button type="button" onClick={chip.clear} aria-label={`Clear filter: ${chip.label}`} className="rounded-full p-0.5 hover:bg-foreground/10">
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <button type="button" onClick={() => onChange({ q: "", accountIds: [], category: "all", type: "all", status: "all", period: "all", from: null, to: null, amountMin: null, amountMax: null })} className="text-xs font-medium text-muted-foreground hover:text-foreground">
        Clear all
      </button>
    </div>
  );
}

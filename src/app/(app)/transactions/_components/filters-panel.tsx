"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { TransactionFilters } from "../_lib/filters";
import { CATEGORY_OPTIONS, PERIOD_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS, typeLabel, type AccountOption } from "../_lib/options";

export function FiltersPanel({
  filters,
  onChange,
  accounts,
}: {
  filters: TransactionFilters;
  onChange: (patch: Partial<TransactionFilters>) => void;
  accounts: AccountOption[];
}) {
  function toggleAccount(id: AccountOption["id"]) {
    const next = filters.accountIds.includes(id) ? filters.accountIds.filter((a) => a !== id) : [...filters.accountIds, id];
    onChange({ accountIds: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="filter-period">Period</Label>
        <Select value={filters.period} onValueChange={(v) => onChange({ period: v as TransactionFilters["period"] })}>
          <SelectTrigger id="filter-period" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filters.period === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="filter-from">From</Label>
            <Input id="filter-from" type="date" value={filters.from ?? ""} onChange={(e) => onChange({ from: e.target.value || null })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filter-to">To</Label>
            <Input id="filter-to" type="date" value={filters.to ?? ""} onChange={(e) => onChange({ to: e.target.value || null })} />
          </div>
        </div>
      )}

      <Separator />

      <div className="grid gap-1.5">
        <Label htmlFor="filter-category">Category</Label>
        <Select value={filters.category} onValueChange={(v) => onChange({ category: v as TransactionFilters["category"] })}>
          <SelectTrigger id="filter-category" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="filter-type">Type</Label>
          <Select value={filters.type} onValueChange={(v) => onChange({ type: v as TransactionFilters["type"] })}>
            <SelectTrigger id="filter-type" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filter-status">Status</Label>
          <Select value={filters.status} onValueChange={(v) => onChange({ status: v as TransactionFilters["status"] })}>
            <SelectTrigger id="filter-status" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="grid gap-1.5">
        <Label>Amount</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" inputMode="decimal" min={0} placeholder="Min" aria-label="Minimum amount" value={filters.amountMin ?? ""} onChange={(e) => onChange({ amountMin: e.target.value === "" ? null : Number(e.target.value) })} />
          <Input type="number" inputMode="decimal" min={0} placeholder="Max" aria-label="Maximum amount" value={filters.amountMax ?? ""} onChange={(e) => onChange({ amountMax: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
      </div>

      <Separator />

      <div className="grid gap-2">
        <Label>Accounts</Label>
        <div className="grid max-h-48 gap-2 overflow-y-auto">
          {accounts.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={filters.accountIds.includes(a.id)} onCheckedChange={() => toggleAccount(a.id)} />
              {a.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

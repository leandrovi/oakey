"use client";

import { format } from "date-fns";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import type { AccountId, CardId, Transaction } from "@/lib/domain/types";
import { groupByDay } from "../_lib/filters";
import { typeLabel } from "../_lib/options";

function dayLabel(day: string): string {
  return format(new Date(`${day}T12:00:00Z`), "EEEE, MMMM d");
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  if (status === "pending") return <Badge variant="secondary">Pending</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return null;
}

export function TransactionsList({
  transactions,
  accountNames,
  onSelect,
}: {
  transactions: Transaction[];
  accountNames: Map<AccountId | CardId, string>;
  onSelect: (t: Transaction) => void;
}) {
  if (transactions.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No transactions match these filters.</p>;
  }

  const groups = groupByDay(transactions);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <Fragment key={group.day}>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="bg-muted/40 py-1.5 text-xs font-medium text-muted-foreground">{dayLabel(group.day)}</TableCell>
                </TableRow>
                {group.items.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => onSelect(t)}>
                    <TableCell>
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.counterparty}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{accountNames.get(t.accountId) ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.category}</TableCell>
                    <TableCell className="text-muted-foreground">{typeLabel(t.type)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StatusBadge status={t.status} />
                        <Money amount={t.amount} direction={t.direction} className="font-medium" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked list */}
      <div className="divide-y md:hidden">
        {groups.map((group) => (
          <div key={group.day}>
            <p className="bg-muted/40 px-1 py-1.5 text-xs font-medium text-muted-foreground">{dayLabel(group.day)}</p>
            {group.items.map((t) => (
              <button key={t.id} type="button" onClick={() => onSelect(t)} className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="truncate text-xs text-muted-foreground">{accountNames.get(t.accountId) ?? "—"} · {t.category}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Money amount={t.amount} direction={t.direction} className="text-sm font-medium" />
                  <StatusBadge status={t.status} />
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

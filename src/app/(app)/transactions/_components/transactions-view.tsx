"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { useBank } from "@/components/bank/provider";
import type { Transaction } from "@/lib/domain/types";
import { filterTransactions, filtersFromSearchParams, filtersToSearchParams, paginate, sortByPostedAtDesc, type TransactionFilters } from "../_lib/filters";
import { transactionsToCsv } from "../_lib/csv";
import { accountNameMap, accountOptions } from "../_lib/options";
import { ActiveFilterChips } from "./active-filter-chips";
import { FilterBar } from "./filter-bar";
import { PaginationBar } from "./pagination-bar";
import { TransactionDetailSheet } from "./transaction-detail-sheet";
import { TransactionsList } from "./transactions-list";

const PAGE_SIZE = 25;

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function TransactionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accounts, cards, transactions, now } = useBank();
  const NOW = useMemo(() => new Date(now), [now]);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const accountOpts = useMemo(() => accountOptions(accounts, cards), []);
  const accountNames = useMemo(() => accountNameMap(accounts, cards), []);

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const handleFiltersChange = useCallback(
    (patch: Partial<TransactionFilters>) => {
      pushParams(filtersToSearchParams({ ...filters, ...patch }));
    },
    [filters, pushParams],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const params = filtersToSearchParams(filters);
      if (nextPage > 1) params.set("page", String(nextPage));
      pushParams(params);
    },
    [filters, pushParams],
  );

  const filtered = useMemo(() => sortByPostedAtDesc(filterTransactions(transactions, filters, NOW)), [transactions, filters, NOW]);
  const paged = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);

  function handleExport() {
    const csv = transactionsToCsv(filtered, accountNames);
    downloadCsv(`oakey-transactions-${NOW.toISOString().slice(0, 10)}.csv`, csv);
    toast("CSV exported", { description: `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}` });
  }

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onChange={handleFiltersChange} accounts={accountOpts} onExport={handleExport} />
      <ActiveFilterChips filters={filters} onChange={handleFiltersChange} accounts={accountOpts} />

      <Card className="py-0">
        <TransactionsList transactions={paged.items} accountNames={accountNames} onSelect={setSelected} />
        <div className="px-4 pb-4">
          <PaginationBar page={paged} onPageChange={handlePageChange} />
        </div>
      </Card>

      <TransactionDetailSheet
        transaction={selected}
        accountLabel={selected ? accountNames.get(selected.accountId) ?? "—" : ""}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

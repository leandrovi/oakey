"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatCents } from "@/lib/domain/money";
import { useBank } from "@/components/bank/provider";
import { cn } from "@/lib/utils";
import { AccountCards } from "./_components/account-cards";
import { BurnRunway } from "./_components/burn-runway";
import { CashFlowChart, CashSplit } from "./_components/cash-flow-chart";
import { RecentTransactions } from "./_components/recent-transactions";
import { TopCategories } from "./_components/top-categories";
import {
  averageMonthlyNetBurn,
  averageMonthlySpend,
  cashDelta,
  monthlyCashFlow,
  recentTransactions,
  runway,
  topCategoriesThisMonth,
  totalCashCents,
} from "./_lib/metrics";
import { readLocalClock, serverLocalClock, subscribeToLocalClock } from "./_lib/local-clock";

export default function OverviewPage() {
  const { accounts, creditCard, transactions, user, now } = useBank();
  const NOW = new Date(now);
  const clock = useSyncExternalStore(subscribeToLocalClock, readLocalClock, serverLocalClock);
  const cash = totalCashCents(accounts);
  const delta = cashDelta(accounts, transactions, NOW);
  const flow = monthlyCashFlow(accounts, transactions, NOW, 12);
  const avgSpend = averageMonthlySpend(accounts, transactions, NOW, 3);
  const netBurn = averageMonthlyNetBurn(accounts, transactions, NOW, 3);
  const runwayResult = runway(cash, netBurn);
  const topCategories = topCategoriesThisMonth(transactions, NOW, 5);
  const recent = recentTransactions(transactions, 5);
  const deltaUp = delta >= 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={clock.greeting ? `${clock.greeting}, ${user.firstName}` : user.firstName}
        description={clock.when ? `${user.businessName} · ${clock.when}` : user.businessName}
      />

      <div>
        <p className="text-sm font-medium text-muted-foreground">Total cash</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <NumberTicker locale="en-US"
            value={cash / 100}
            format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
            className="font-heading text-4xl font-medium tracking-tight md:text-5xl"
          />
          <span className={cn("flex items-center gap-1 text-sm font-medium", deltaUp ? "text-success" : "text-destructive")}>
            {deltaUp ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            {formatCents(delta, { whole: true, signed: true })} vs last month
          </span>
        </div>
      </div>

      <AccountCards accounts={accounts} creditCard={creditCard} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashFlowChart flow={flow} />
        </div>
        <CashSplit flow={flow} />
      </div>

      <BurnRunway avgSpend={avgSpend} runwayResult={runwayResult} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopCategories categories={topCategories} />
        <RecentTransactions transactions={recent} />
      </div>
    </div>
  );
}

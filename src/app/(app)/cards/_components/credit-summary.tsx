"use client";

import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import { formatBps } from "@/lib/domain/money";
import type { Cents } from "@/lib/domain/types";
import { useCardsStore } from "../_lib/store";
import { PayCardDialog } from "./pay-card-dialog";

export function CreditSummary() {
  const { state } = useCardsStore();
  const { creditCard } = state;
  const available = (creditCard.limit - creditCard.balance) as Cents;
  const utilization = creditCard.limit > 0 ? Math.round((creditCard.balance / creditCard.limit) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle className="text-sm text-muted-foreground">Oakey Business Card</CardTitle>
          <p className="mt-1 font-heading text-3xl tabular md:text-4xl">
            <Money amount={creditCard.balance} whole />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            of <Money amount={creditCard.limit} whole className="text-foreground" /> limit · {utilization}% used ·{" "}
            {formatBps(creditCard.apr)} APR
          </p>
        </div>
        <PayCardDialog />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Available credit" value={<Money amount={available} whole />} />
        <Stat label="Statement balance" value={<Money amount={creditCard.statementBalance} whole />} />
        <Stat label="Minimum due" value={<Money amount={creditCard.minimumDue} whole />} />
        <Stat label="Due date" value={format(new Date(creditCard.dueDate), "MMM d, yyyy")} />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular">{value}</p>
    </div>
  );
}

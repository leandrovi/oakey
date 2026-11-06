import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import type { Transaction } from "@/lib/domain/types";

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap gap-3 items-center justify-between">
        <CardTitle>Recent transactions</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/transactions">View all<ArrowRight className="size-3.5" /></Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="divide-y">
        {transactions.map((t) => (
          <Link
            key={t.id}
            href="/transactions"
            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:text-primary"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t.description}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(t.postedAt), "MMM d")}{t.status === "pending" && " · Pending"}</p>
            </div>
            <Money amount={t.amount} direction={t.direction} className="shrink-0 text-sm font-medium" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

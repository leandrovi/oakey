import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { transactions } from "@/lib/mock/seed";
import type { Card as CardType } from "@/lib/domain/types";

export function CardTransactions({ card }: { card: CardType }) {
  const rows = transactions.filter((t) => t.accountId === card.id).slice(0, 12);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">No transactions on this card yet.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(t.postedAt), "MMM d, yyyy")}
                    {t.status === "pending" && (
                      <Badge variant="outline" className="ml-2">
                        Pending
                      </Badge>
                    )}
                  </p>
                </div>
                <Money amount={t.amount} direction={t.direction} className="shrink-0 text-sm font-medium" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import type { CategorySpend } from "../_lib/metrics";

export function TopCategories({ categories }: { categories: CategorySpend[] }) {
  const max = Math.max(1, ...categories.map((c) => c.amount));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top spending this month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.length === 0 && <p className="text-sm text-muted-foreground">No spending recorded yet this month.</p>}
        {categories.map((c) => (
          <div key={c.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{c.category}</span>
              <Money amount={c.amount} whole className="text-muted-foreground" />
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((c.amount / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import type { Cents } from "@/lib/domain/types";
import type { Runway } from "../_lib/metrics";

export function BurnRunway({ avgSpend, runwayResult }: { avgSpend: Cents; runwayResult: Runway }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Burn rate & runway</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Avg. monthly spend, last 3 months</p>
          <p className="mt-1 font-heading text-xl font-medium"><Money amount={avgSpend} whole /></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Runway</p>
          {runwayResult.status === "positive" ? (
            <p className="mt-1 font-heading text-xl font-medium text-success">Cash-flow positive</p>
          ) : (
            <p className="mt-1 font-heading text-xl font-medium">{Math.max(0, Math.round(runwayResult.months))} months</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

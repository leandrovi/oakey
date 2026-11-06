import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreditFactor } from "@/lib/domain/types";

const RATING_VARIANT: Record<CreditFactor["rating"], "default" | "secondary" | "outline" | "destructive"> = {
  excellent: "default",
  good: "secondary",
  fair: "outline",
  poor: "destructive",
};

const TIPS: Record<CreditFactor["rating"], string> = {
  excellent: "Keep doing what you're doing here.",
  good: "Small, steady improvements will push this higher.",
  fair: "This is holding your score back the most. Focus here first.",
  poor: "This is hurting your score. Address it soon.",
};

export function FactorsList({ factors }: { factors: CreditFactor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Factors in your score</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {factors.map((factor) => (
          <div key={factor.name} className="flex items-start justify-between gap-3 border-b pb-4 last:border-0 last:pb-0">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{factor.name}</p>
                <Badge variant="outline" className="capitalize">
                  {factor.impact} impact
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{factor.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tip: {TIPS[factor.rating]}</p>
            </div>
            <Badge variant={RATING_VARIANT[factor.rating]} className="shrink-0 capitalize">
              {factor.rating}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

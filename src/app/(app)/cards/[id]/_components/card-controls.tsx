"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Globe, ShoppingBag, Snowflake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { formatCents, parseDollars } from "@/lib/domain/money";
import type { Card as CardType, CardId } from "@/lib/domain/types";
import { useCardsStore } from "../../_lib/store";

export function CardControls({ card }: { card: CardType }) {
  const { dispatch } = useCardsStore();
  const editable = card.status === "active" || card.status === "frozen";
  const [monthlyLimit, setMonthlyLimit] = useState(formatCents(card.controls.monthlyLimit, { whole: true }));
  const [perTxLimit, setPerTxLimit] = useState(formatCents(card.controls.perTransactionLimit, { whole: true }));

  function commitMonthlyLimit() {
    const parsed = parseDollars(monthlyLimit);
    if (parsed == null) {
      setMonthlyLimit(formatCents(card.controls.monthlyLimit, { whole: true }));
      return;
    }
    dispatch({ type: "setMonthlyLimit", id: card.id as CardId, limit: parsed });
    toast.success("Monthly limit updated");
  }

  function commitPerTxLimit() {
    const parsed = parseDollars(perTxLimit);
    if (parsed == null) {
      setPerTxLimit(formatCents(card.controls.perTransactionLimit, { whole: true }));
      return;
    }
    dispatch({ type: "setPerTransactionLimit", id: card.id as CardId, limit: parsed });
    toast.success("Per-transaction limit updated");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="freeze-switch" className="flex items-center gap-2 font-normal">
            <Snowflake className="size-4 text-muted-foreground" />
            Freeze card
          </Label>
          <Switch
            id="freeze-switch"
            disabled={!editable}
            checked={card.status === "frozen"}
            onCheckedChange={(checked) => {
              dispatch({ type: checked ? "freeze" : "unfreeze", id: card.id as CardId });
              toast(checked ? "Card frozen" : "Card unfrozen");
            }}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="online-switch" className="flex items-center gap-2 font-normal">
            <ShoppingBag className="size-4 text-muted-foreground" />
            Online purchases
          </Label>
          <Switch
            id="online-switch"
            disabled={!editable}
            checked={card.controls.onlinePurchases}
            onCheckedChange={() => dispatch({ type: "toggleOnline", id: card.id as CardId })}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="intl-switch" className="flex items-center gap-2 font-normal">
            <Globe className="size-4 text-muted-foreground" />
            International purchases
          </Label>
          <Switch
            id="intl-switch"
            disabled={!editable}
            checked={card.controls.internationalPurchases}
            onCheckedChange={() => dispatch({ type: "toggleInternational", id: card.id as CardId })}
          />
        </div>
        <Separator />
        <div className="grid gap-1.5">
          <Label htmlFor="monthly-limit">Monthly limit</Label>
          <Input
            id="monthly-limit"
            disabled={!editable}
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            onBlur={commitMonthlyLimit}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="per-tx-limit">Per-transaction limit</Label>
          <Input
            id="per-tx-limit"
            disabled={!editable}
            value={perTxLimit}
            onChange={(e) => setPerTxLimit(e.target.value)}
            onBlur={commitPerTxLimit}
          />
        </div>
      </CardContent>
    </Card>
  );
}

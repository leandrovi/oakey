"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { formatBps } from "@/lib/domain/money";
import type { LoanOffer } from "@/lib/domain/types";
import { SimulatorDialog } from "./simulator-dialog";

export function OfferCard({ offer }: { offer: LoanOffer }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{offer.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Up to</p>
          <p className="font-heading text-2xl tabular">
            <Money amount={offer.maxAmount} whole />
          </p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rate</span>
          <span className="font-medium tabular">{formatBps(offer.apr)} APR</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Term</span>
          <span className="font-medium">
            {offer.minTermMonths}–{offer.maxTermMonths} months
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Based on your credit score and recent cash flow.</p>
        <Button onClick={() => setOpen(true)}>Simulate</Button>
      </CardContent>
      <SimulatorDialog offer={offer} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

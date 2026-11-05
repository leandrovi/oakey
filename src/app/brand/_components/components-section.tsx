"use client";

import type { Cents } from "@/lib/domain/types";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberTicker } from "@/components/ui/number-ticker";

export function ComponentsSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-medium tracking-tight">Core components</h2>
        <p className="mt-1 text-sm text-muted-foreground">Rounded-xl, subtle borders, no heavy shadows.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Operating</CardTitle>
            <CardDescription>Checking · ···· 4410</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-medium tabular">
              <NumberTicker locale="en-US" value={184500.32} format={{ style: "currency", currency: "USD" }} />
            </p>
            <div className="mt-3 flex gap-2">
              <Badge>Active</Badge>
              <Badge variant="secondary">No holds</Badge>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/60 p-4">
            <Button>Move money</Button>
            <Button variant="outline">View statement</Button>
            <Button variant="secondary">Export</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="destructive">Freeze card</Button>
            <Button variant="link">Learn more</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/60 p-4">
            <Badge>Posted</Badge>
            <Badge variant="secondary">Pending</Badge>
            <Badge variant="outline">Scheduled</Badge>
            <Badge variant="destructive">Failed</Badge>
          </div>
          <div className="space-y-1.5 rounded-2xl bg-muted/60 p-4">
            <Label htmlFor="brand-demo-amount">Amount</Label>
            <Input id="brand-demo-amount" placeholder="$0.00" className="bg-background" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-muted/60 p-4">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Signed amounts</p>
        <div className="flex flex-wrap gap-6 text-lg">
          <Money amount={420000 as Cents} direction="credit" />
          <Money amount={128500 as Cents} direction="debit" />
        </div>
      </div>
    </section>
  );
}

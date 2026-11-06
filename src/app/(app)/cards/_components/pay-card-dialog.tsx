"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Money } from "@/components/money";
import { formatCents, parseDollars } from "@/lib/domain/money";
import type { Cents } from "@/lib/domain/types";
import { useBank } from "@/components/bank/provider";
import { useCardsStore } from "../_lib/store";

type Option = "minimum" | "statement" | "full" | "custom";

export function PayCardDialog() {
  const { state, dispatch } = useCardsStore();
  const { accounts } = useBank();
  const { creditCard } = state;
  const checking = accounts.find((account) => account.kind === "checking");
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState<Option>("statement");
  const [custom, setCustom] = useState("");

  const amounts: Record<Exclude<Option, "custom">, Cents> = {
    minimum: creditCard.minimumDue,
    statement: creditCard.statementBalance,
    full: creditCard.balance,
  };
  const customCents = parseDollars(custom);
  const amount = option === "custom" ? customCents : amounts[option];
  const valid = amount != null && amount > 0 && amount <= creditCard.balance;

  function submit() {
    if (!valid || amount == null) return;
    dispatch({ type: "payCreditCard", amount });
    toast.success(`Payment of ${formatCents(amount)} submitted`, {
      description: checking ? `From ${checking.name} •••• ${checking.mask}` : undefined,
    });
    setOpen(false);
    setCustom("");
    setOption("statement");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={creditCard.balance <= 0}>Pay card</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay your Oakey card</DialogTitle>
          <DialogDescription>
            {checking ? `Paid from ${checking.name} •••• ${checking.mask}.` : "Paid from checking."}
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={option} onValueChange={(v) => setOption(v as Option)} className="gap-3">
          <AmountRow id="minimum" label="Minimum due" amount={amounts.minimum} onSelect={setOption} />
          <AmountRow id="statement" label="Statement balance" amount={amounts.statement} onSelect={setOption} />
          <AmountRow id="full" label="Full balance" amount={amounts.full} onSelect={setOption} />
          <div className="flex items-center gap-2">
            <RadioGroupItem value="custom" id="pay-custom" />
            <Label htmlFor="pay-custom" className="flex-1 font-normal">
              Custom amount
            </Label>
            <Input
              aria-label="Custom amount"
              inputMode="decimal"
              placeholder="$0.00"
              className="w-28"
              value={custom}
              onFocus={() => setOption("custom")}
              onChange={(e) => {
                setOption("custom");
                setCustom(e.target.value);
              }}
            />
          </div>
        </RadioGroup>
        {option === "custom" && custom !== "" && !valid && (
          <p className="text-sm text-destructive">Enter an amount up to {formatCents(creditCard.balance)}.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid}>
            Pay {valid && amount != null ? formatCents(amount) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AmountRow({
  id, label, amount, onSelect,
}: { id: Option; label: string; amount: Cents; onSelect: (o: Option) => void }) {
  return (
    <label
      htmlFor={`pay-${id}`}
      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
    >
      <span className="flex items-center gap-2">
        <RadioGroupItem value={id} id={`pay-${id}`} onClick={() => onSelect(id)} />
        {label}
      </span>
      <Money amount={amount} className="font-medium" />
    </label>
  );
}

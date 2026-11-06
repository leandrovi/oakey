"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useBank } from "@/components/bank/provider";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { parseDollars } from "@/lib/domain/money";
import type { Cents } from "@/lib/domain/types";
import { transferAction } from "@/server/actions";
import { moveMoneySchema } from "../_lib/wire-form";

export function MoveMoneyDialog() {
  const router = useRouter();
  const { accounts } = useBank();
  const [open, setOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toAccountId = useMemo(() => accounts.find((a) => a.id !== fromAccountId)?.id ?? "", [accounts, fromAccountId]);
  const parsedAmount = parseDollars(amount);
  const balanceByAccountId = useMemo(() => Object.fromEntries(accounts.map((account) => [account.id, account.balance])), [accounts]);
  const schema = useMemo(() => moveMoneySchema(balanceByAccountId), [balanceByAccountId]);
  const isValid = schema.safeParse({ fromAccountId, toAccountId, amount }).success;

  function accountLabel(id: string) {
    const account = accounts.find((item) => item.id === id);
    return account ? `${account.name} (••${account.mask})` : id;
  }

  function reset() {
    setAmount("");
    setError(null);
    setFromAccountId(accounts[0]?.id ?? "");
  }

  async function handleConfirm() {
    const result = schema.safeParse({ fromAccountId, toAccountId, amount });
    if (!result.success || parsedAmount == null) {
      setError(result.success ? "Check the amount and try again." : result.error.issues[0]?.message ?? "Check the amount and try again.");
      return;
    }
    setSubmitting(true);
    const moved = await transferAction({
      idempotencyKey: crypto.randomUUID(),
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
    });
    setSubmitting(false);
    if (!moved.ok) {
      setError(moved.message);
      return;
    }
    toast.success(`Moved ${(parsedAmount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} to ${accountLabel(toAccountId)}`);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Move between accounts</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move between accounts</DialogTitle>
          <DialogDescription>Transfers between your Oakey accounts post instantly.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="move-from">From</Label>
            <RadioGroup id="move-from" value={fromAccountId} onValueChange={setFromAccountId} className="gap-2">
              {accounts.map((account) => (
                <label
                  key={account.id}
                  htmlFor={`move-from-${account.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                >
                  <span className="flex items-center gap-2.5">
                    <RadioGroupItem id={`move-from-${account.id}`} value={account.id} />
                    <span>
                      {account.name} <span className="text-muted-foreground">••{account.mask}</span>
                    </span>
                  </span>
                  <Money amount={account.balance} className="font-medium" />
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowRight className="size-4" aria-hidden />
            <span>To {accountLabel(toAccountId)}</span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="move-amount">Amount</Label>
            <InputGroup>
              <InputGroupAddon>$</InputGroupAddon>
              <InputGroupInput
                id="move-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                aria-invalid={error ? true : undefined}
              />
            </InputGroup>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {isValid && (
            <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">
              Move <Money amount={parsedAmount as Cents} className="font-medium" /> from {accountLabel(fromAccountId)} to{" "}
              {accountLabel(toAccountId)}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || submitting}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

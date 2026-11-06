"use client";

import { useId, useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { ChevronDown, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { amortizationSchedule, monthlyPayment, totalInterest } from "@/lib/domain/amortization";
import { addCents, formatBps, formatCents, parseDollars } from "@/lib/domain/money";
import { NOW } from "@/lib/mock/seed";
import type { Cents, IsoDate, IsoDateTime, Loan, LoanId, LoanOffer } from "@/lib/domain/types";
import { useLoansStore } from "../_lib/store";

type Step = "simulate" | "review" | "submitted";

export function SimulatorDialog({
  offer, open, onOpenChange,
}: { offer: LoanOffer; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { dispatch } = useLoansStore();
  const [step, setStep] = useState<Step>("simulate");
  const [amount, setAmount] = useState<Cents>(offer.maxAmount);
  const [amountInput, setAmountInput] = useState(formatCents(offer.maxAmount, { whole: true }));
  const [term, setTerm] = useState(offer.maxTermMonths);
  const [showSchedule, setShowSchedule] = useState(false);
  const amountId = useId();

  const firstDueDate = format(addMonths(NOW, 1), "yyyy-MM-dd") as IsoDate;
  const schedule = useMemo(
    () => amortizationSchedule(amount, offer.apr, term, firstDueDate),
    [amount, offer.apr, term, firstDueDate],
  );
  const payment = monthlyPayment(amount, offer.apr, term);
  const interest = totalInterest(schedule);
  const totalCost = addCents(amount, interest);

  function reset() {
    setStep("simulate");
    setAmount(offer.maxAmount);
    setAmountInput(formatCents(offer.maxAmount, { whole: true }));
    setTerm(offer.maxTermMonths);
    setShowSchedule(false);
  }

  function setAmountFromSlider(value: number) {
    setAmount(value as Cents);
    setAmountInput(formatCents(value as Cents, { whole: true }));
  }

  function commitAmountInput() {
    const parsed = parseDollars(amountInput);
    if (parsed == null || parsed <= 0) {
      setAmountInput(formatCents(amount, { whole: true }));
      return;
    }
    const clamped = Math.min(parsed, offer.maxAmount) as Cents;
    setAmount(clamped);
    setAmountInput(formatCents(clamped, { whole: true }));
  }

  function submit() {
    const loan: Loan = {
      id: `loan_${crypto.randomUUID().slice(0, 8)}` as LoanId,
      offerId: offer.id,
      name: offer.name,
      principal: amount,
      apr: offer.apr,
      termMonths: term,
      monthlyPayment: payment,
      status: "pending",
      requestedAt: NOW.toISOString() as IsoDateTime,
      schedule,
    };
    dispatch({ type: "request", loan });
    setStep("submitted");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === "simulate" && (
          <>
            <DialogHeader>
              <DialogTitle>{offer.name}</DialogTitle>
              <DialogDescription>
                Up to <Money amount={offer.maxAmount} whole /> at {formatBps(offer.apr)} APR.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={amountId}>Amount</Label>
                  <Input
                    id={amountId}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    onBlur={commitAmountInput}
                    className="w-32 text-right"
                  />
                </div>
                <Slider
                  value={[amount]}
                  min={10_000}
                  max={offer.maxAmount}
                  step={10_000}
                  onValueChange={([v]) => setAmountFromSlider(v)}
                  aria-label="Loan amount"
                />
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <Label>Term</Label>
                  <span className="font-medium">{term} months</span>
                </div>
                <Slider
                  value={[term]}
                  min={offer.minTermMonths}
                  max={offer.maxTermMonths}
                  step={6}
                  onValueChange={([v]) => setTerm(v)}
                  aria-label="Loan term"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/60 p-3 text-center">
                <SimStat label="Monthly" value={<Money amount={payment} whole />} />
                <SimStat label="Total interest" value={<Money amount={interest} whole />} />
                <SimStat label="Total cost" value={<Money amount={totalCost} whole />} />
              </div>
              <button
                type="button"
                onClick={() => setShowSchedule((s) => !s)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={`size-4 transition-transform ${showSchedule ? "rotate-180" : ""}`} />
                {showSchedule ? "Hide" : "Preview"} payment schedule
              </button>
              {showSchedule && (
                <div className="max-h-48 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Payment</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((row) => (
                        <TableRow key={row.number}>
                          <TableCell>{row.number}</TableCell>
                          <TableCell>{row.dueDate}</TableCell>
                          <TableCell className="text-right"><Money amount={row.payment} whole /></TableCell>
                          <TableCell className="text-right"><Money amount={row.interest} whole /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setStep("review")}>Request loan</Button>
            </DialogFooter>
          </>
        )}

        {step === "review" && (
          <>
            <DialogHeader>
              <DialogTitle>Review your request</DialogTitle>
              <DialogDescription>Confirm the details before submitting.</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Offer</dt>
              <dd className="text-right font-medium">{offer.name}</dd>
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium"><Money amount={amount} whole /></dd>
              <dt className="text-muted-foreground">Term</dt>
              <dd className="text-right font-medium">{term} months</dd>
              <dt className="text-muted-foreground">APR</dt>
              <dd className="text-right font-medium">{formatBps(offer.apr)}</dd>
              <dt className="text-muted-foreground">Monthly payment</dt>
              <dd className="text-right font-medium"><Money amount={payment} whole /></dd>
              <dt className="text-muted-foreground">Total interest</dt>
              <dd className="text-right font-medium"><Money amount={interest} whole /></dd>
            </dl>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("simulate")}>
                Back
              </Button>
              <Button onClick={submit}>Submit request</Button>
            </DialogFooter>
          </>
        )}

        {step === "submitted" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleCheck className="size-5 text-success" />
                Request submitted
              </DialogTitle>
              <DialogDescription>
                We&rsquo;re reviewing your request for <Money amount={amount} whole />. It now shows as a pending application below.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  toast.success("Loan request submitted");
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SimStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium tabular">{value}</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useBank } from "@/components/bank/provider";
import { formatCents, parseDollars } from "@/lib/domain/money";
import { WIRE_FEE, wireSettlementDate } from "@/lib/domain/fedwire";
import { submitWireAction } from "@/server/actions";
import type { Address, Cents, Recipient, RecipientId, RoutingNumber } from "@/lib/domain/types";
import { newRecipientSchema, WIRE_PURPOSES, wireAmountSchema, type NewRecipientInput, type WirePurpose } from "../../_lib/wire-form";

const STEPS = ["From", "To", "Amount", "Review", "Confirm"] as const;

const EMPTY_RECIPIENT: NewRecipientInput = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  bankName: "",
  routingNumber: "",
  accountNumber: "",
  confirmAccountNumber: "",
};

function StepShell({
  stepIndex,
  title,
  description,
  onBack,
  onNext,
  nextLabel = "Next",
  children,
}: {
  stepIndex: number;
  title: string;
  description?: string;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {STEPS.length}
          </span>
          <span>{STEPS[stepIndex]}</span>
        </div>
        <Progress value={((stepIndex + 1) / STEPS.length) * 100} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onNext();
        }}
        className="flex flex-col gap-6"
      >
        <div>
          <h1 className="font-heading text-2xl font-medium tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
        </div>

        {children}

        <div className="flex justify-between gap-2">
          {onBack ? (
            <Button type="button" variant="ghost" onClick={onBack}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" asChild>
              <Link href="/transfers">Cancel</Link>
            </Button>
          )}
          <Button type="submit">{nextLabel}</Button>
        </div>
      </form>
    </div>
  );
}

export function WireFlow() {
  const router = useRouter();
  const { accounts, recipients } = useBank();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [fromAccountId, setFromAccountId] = useState<string>(accounts[0]?.id ?? "");

  const [localRecipients, setLocalRecipients] = useState<Recipient[]>(recipients);
  const [recipientMode, setRecipientMode] = useState<"saved" | "new">(recipients.length > 0 ? "saved" : "new");
  const [recipientId, setRecipientId] = useState<string>(recipients[0]?.id ?? "");
  const [newRecipientForm, setNewRecipientForm] = useState<NewRecipientInput>(EMPTY_RECIPIENT);
  const [newRecipientErrors, setNewRecipientErrors] = useState<Record<string, string>>({});

  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [purpose, setPurpose] = useState<WirePurpose | "">("");
  const [amountError, setAmountError] = useState<string | null>(null);


  // lazy useState initializer, not a ref: this project's lint forbids reading ref.current during render
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const fromAccount = accounts.find((a) => a.id === fromAccountId) ?? accounts[0];
  const recipient = localRecipients.find((r) => r.id === recipientId);
  const settlement = wireSettlementDate(new Date());

  function field<K extends keyof NewRecipientInput>(key: K) {
    return {
      value: newRecipientForm[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewRecipientForm((f) => ({ ...f, [key]: e.target.value }));
        setNewRecipientErrors((er) => ({ ...er, [key]: "" }));
      },
    };
  }

  function handleToNext() {
    if (recipientMode === "saved") {
      if (!recipientId) return;
      setStep(2);
      return;
    }
    const result = newRecipientSchema.safeParse(newRecipientForm);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
      setNewRecipientErrors(next);
      return;
    }
    const address: Address = {
      line1: result.data.addressLine1,
      line2: result.data.addressLine2 || undefined,
      city: result.data.city,
      state: result.data.state.toUpperCase(),
      postalCode: result.data.postalCode,
    };
    const created: Recipient = {
      id: `rcp_${crypto.randomUUID().slice(0, 8)}` as RecipientId,
      name: result.data.name,
      address,
      bankName: result.data.bankName,
      routingNumber: result.data.routingNumber as RoutingNumber,
      accountNumber: result.data.accountNumber,
      lastPaidAt: null,
    };
    setLocalRecipients((rs) => [created, ...rs]);
    setRecipientId(created.id);
    setRecipientMode("saved");
    setStep(2);
  }

  function handleAmountNext() {
    if (!fromAccount) return;
    const schema = wireAmountSchema(fromAccount.balance);
    const result = schema.safeParse({ amount, memo, purpose });
    if (!result.success) {
      setAmountError(result.error.issues[0]?.message ?? "Check the amount and try again.");
      return;
    }
    if (!purpose) {
      setAmountError("Choose a purpose.");
      return;
    }
    setAmountError(null);
    setStep(3);
  }

  async function handleConfirm() {
    if (submitting || !purpose) return;
    const centsAmount = parseDollars(amount);
    const chosen = localRecipients.find((item) => item.id === recipientId);
    if (centsAmount == null || !chosen) return;
    const saved = recipients.some((item) => item.id === chosen.id);
    setSubmitting(true);
    const result = await submitWireAction({
      idempotencyKey,
      fromAccountId,
      amount: centsAmount,
      memo,
      purpose,
      recipientId: saved ? recipientId : undefined,
      newRecipient: saved ? undefined : {
        name: chosen.name,
        addressLine1: chosen.address.line1,
        addressLine2: chosen.address.line2 ?? "",
        city: chosen.address.city,
        state: chosen.address.state,
        postalCode: chosen.address.postalCode,
        bankName: chosen.bankName,
        routingNumber: chosen.routingNumber,
        accountNumber: chosen.accountNumber,
        confirmAccountNumber: chosen.accountNumber,
      },
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Wire submitted");
    router.refresh();
    setStep(4);
  }

  function sendAnother() {
    setStep(0);
    setAmount("");
    setMemo("");
    setPurpose("");
    setAmountError(null);
    setIdempotencyKey(crypto.randomUUID());
  }

  const parsedAmountCents = (() => {
    const schema = wireAmountSchema((fromAccount?.balance ?? 0) as Cents);
    const result = schema.safeParse({ amount, memo, purpose: purpose || "Other" });
    if (!result.success) return null;
    return Math.round(parseFloat(amount) * 100) as Cents;
  })();

  if (step === 0) {
    return (
      <StepShell stepIndex={0} title="Send a wire" description="Which account is this wire coming from?" onNext={() => setStep(1)}>
        <RadioGroup value={fromAccountId} onValueChange={setFromAccountId} className="gap-2">
          {accounts.map((account) => (
            <label
              key={account.id}
              htmlFor={`from-${account.id}`}
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
            >
              <span className="flex items-center gap-3">
                <RadioGroupItem id={`from-${account.id}`} value={account.id} />
                <span>
                  <span className="block font-medium capitalize">{account.name}</span>
                  <span className="text-muted-foreground">••{account.mask}</span>
                </span>
              </span>
              <Money amount={account.balance} className="font-medium" />
            </label>
          ))}
        </RadioGroup>
      </StepShell>
    );
  }

  if (step === 1) {
    return (
      <StepShell stepIndex={1} title="Who are you sending to?" onBack={() => setStep(0)} onNext={handleToNext}>
        <div className="flex gap-2">
          <Button type="button" variant={recipientMode === "saved" ? "default" : "outline"} onClick={() => setRecipientMode("saved")}>
            Saved recipient
          </Button>
          <Button type="button" variant={recipientMode === "new" ? "default" : "outline"} onClick={() => setRecipientMode("new")}>
            Add new recipient
          </Button>
        </div>

        {recipientMode === "saved" ? (
          localRecipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved recipients yet. Add a new one to continue.</p>
          ) : (
            <RadioGroup value={recipientId} onValueChange={setRecipientId} className="gap-2">
              {localRecipients.map((r) => (
                <label
                  key={r.id}
                  htmlFor={`rcp-${r.id}`}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                >
                  <span className="flex items-center gap-3">
                    <RadioGroupItem id={`rcp-${r.id}`} value={r.id} />
                    <span>
                      <span className="block font-medium">{r.name}</span>
                      <span className="text-muted-foreground">
                        {r.bankName} · ••{r.accountNumber.slice(-4)}
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          )
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="new-name">Recipient name</Label>
              <Input id="new-name" {...field("name")} aria-invalid={!!newRecipientErrors.name} />
              {newRecipientErrors.name && <p className="text-sm text-destructive">{newRecipientErrors.name}</p>}
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="new-line1">Address</Label>
              <Input id="new-line1" placeholder="Street address" {...field("addressLine1")} aria-invalid={!!newRecipientErrors.addressLine1} />
              {newRecipientErrors.addressLine1 && <p className="text-sm text-destructive">{newRecipientErrors.addressLine1}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-city">City</Label>
              <Input id="new-city" {...field("city")} aria-invalid={!!newRecipientErrors.city} />
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-state">State</Label>
                <Input id="new-state" maxLength={2} className="w-16 uppercase" {...field("state")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-zip">ZIP</Label>
                <Input id="new-zip" {...field("postalCode")} />
              </div>
            </div>
            {(newRecipientErrors.city || newRecipientErrors.state || newRecipientErrors.postalCode) && (
              <p className="col-span-2 text-sm text-destructive">
                {newRecipientErrors.city || newRecipientErrors.state || newRecipientErrors.postalCode}
              </p>
            )}
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="new-bank">Bank name</Label>
              <Input id="new-bank" {...field("bankName")} aria-invalid={!!newRecipientErrors.bankName} />
              {newRecipientErrors.bankName && <p className="text-sm text-destructive">{newRecipientErrors.bankName}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-routing">Routing number (ABA)</Label>
              <Input id="new-routing" inputMode="numeric" maxLength={9} {...field("routingNumber")} aria-invalid={!!newRecipientErrors.routingNumber} />
              {newRecipientErrors.routingNumber && <p className="text-sm text-destructive">{newRecipientErrors.routingNumber}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-account">Account number</Label>
              <Input id="new-account" {...field("accountNumber")} aria-invalid={!!newRecipientErrors.accountNumber} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="new-account-confirm">Confirm account number</Label>
              <Input id="new-account-confirm" {...field("confirmAccountNumber")} aria-invalid={!!newRecipientErrors.confirmAccountNumber} />
              {newRecipientErrors.confirmAccountNumber && <p className="text-sm text-destructive">{newRecipientErrors.confirmAccountNumber}</p>}
            </div>
          </div>
        )}
      </StepShell>
    );
  }

  if (step === 2) {
    return (
      <StepShell stepIndex={2} title="How much, and why?" onBack={() => setStep(1)} onNext={handleAmountNext}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="wire-amount">Amount</Label>
          <InputGroup>
            <InputGroupAddon>$</InputGroupAddon>
            <InputGroupInput
              id="wire-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountError(null);
              }}
              aria-invalid={!!amountError}
            />
          </InputGroup>
          {fromAccount && (
            <p className="text-xs text-muted-foreground">
              Up to {formatCents(Math.max(0, fromAccount.balance - WIRE_FEE) as Cents)} available, after the {formatCents(WIRE_FEE)} wire fee.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wire-purpose">Purpose</Label>
          <Select value={purpose} onValueChange={(v) => setPurpose(v as WirePurpose)}>
            <SelectTrigger id="wire-purpose" className="w-full">
              <SelectValue placeholder="Choose a purpose" />
            </SelectTrigger>
            <SelectContent>
              {WIRE_PURPOSES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wire-memo">Memo (optional)</Label>
          <Textarea id="wire-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="What's this for?" maxLength={140} />
        </div>

        {amountError && <p className="text-sm text-destructive">{amountError}</p>}
      </StepShell>
    );
  }

  if (step === 3) {
    return (
      <StepShell stepIndex={3} title="Review your wire" onBack={() => setStep(2)} onNext={handleConfirm} nextLabel={submitting ? "Sending…" : "Confirm & send"}>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          <ReviewRow label="From" value={fromAccount ? `${fromAccount.name} ••${fromAccount.mask}` : "—"} onEdit={() => setStep(0)} />
          <ReviewRow label="To" value={recipient?.name ?? "—"} detail={recipient ? `${recipient.bankName} · ••${recipient.accountNumber.slice(-4)}` : undefined} onEdit={() => setStep(1)} />
          <ReviewRow
            label="Amount"
            value={parsedAmountCents !== null ? formatCents(parsedAmountCents) : "—"}
            detail={purpose ? `${purpose}${memo ? ` · ${memo}` : ""}` : undefined}
            onEdit={() => setStep(2)}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wire fee</span>
            <span className="font-medium">{formatCents(WIRE_FEE)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total debit</span>
            <span className="font-medium">{parsedAmountCents !== null ? formatCents((parsedAmountCents + WIRE_FEE) as Cents) : "—"}</span>
          </div>
        </div>

        <Separator />

        <div className="rounded-xl bg-muted px-4 py-3 text-sm">
          <p className="font-medium">{settlement.sameDay ? "Arrives today" : `Arrives ${settlement.date}`}</p>
          <p className="mt-1 text-muted-foreground">Wires submitted after 6:00pm ET, or on a weekend or federal holiday, settle the next business day.</p>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-xs">{idempotencyKey}</span>
        </div>
      </StepShell>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
      <CheckCircle2 className="size-12 text-success" aria-hidden />
      <div>
        <h1 className="font-heading text-2xl font-medium">Wire submitted</h1>
        <p className="mt-1.5 text-muted-foreground">
          {parsedAmountCents !== null ? formatCents(parsedAmountCents) : ""} to {recipient?.name}, status Pending.
        </p>
      </div>
      <div className="w-full rounded-xl border border-border px-4 py-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-xs">{idempotencyKey}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={sendAnother}>
          Send another
        </Button>
        <Button
          onClick={() => {
            router.push("/transfers");
          }}
        >
          View transfers
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, detail, onEdit }: { label: string; value: string; detail?: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <div>
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <Button type="button" variant="link" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}

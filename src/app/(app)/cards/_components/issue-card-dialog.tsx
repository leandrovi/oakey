"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cents, parseDollars } from "@/lib/domain/money";
import { NOW } from "@/lib/mock/seed";
import type { Card, CardId, CardKind, Cents } from "@/lib/domain/types";
import { useCardsStore } from "../_lib/store";

function randomLast4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function IssueCardDialog() {
  const { dispatch } = useCardsStore();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "shipping">("details");
  const [kind, setKind] = useState<CardKind>("virtual");
  const [nickname, setNickname] = useState("");
  const [cardholder, setCardholder] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("1,000");
  const [address, setAddress] = useState({ line1: "", city: "", state: "", postalCode: "" });
  const nicknameId = useId();
  const cardholderId = useId();
  const limitId = useId();

  const limitCents = parseLimit(monthlyLimit);
  const detailsValid = nickname.trim().length > 0 && cardholder.trim().length > 0 && limitCents != null;
  const shippingValid = address.line1.trim() && address.city.trim() && address.state.trim() && address.postalCode.trim();

  function reset() {
    setStep("details");
    setKind("virtual");
    setNickname("");
    setCardholder("");
    setMonthlyLimit("1,000");
    setAddress({ line1: "", city: "", state: "", postalCode: "" });
  }

  function issue() {
    if (!detailsValid || limitCents == null) return;
    const exp = new Date(NOW);
    exp.setFullYear(exp.getFullYear() + 4);
    const card: Card = {
      id: `card_${crypto.randomUUID().slice(0, 8)}` as CardId,
      kind,
      nickname: nickname.trim(),
      cardholder: cardholder.trim(),
      last4: randomLast4(),
      expMonth: exp.getMonth() + 1,
      expYear: exp.getFullYear(),
      status: "active",
      controls: {
        onlinePurchases: true,
        internationalPurchases: false,
        monthlyLimit: limitCents,
        perTransactionLimit: cents(Math.min(limitCents, 500_00)),
      },
      spentThisMonth: cents(0),
    };
    dispatch({ type: "issue", card });
    toast.success(`${card.nickname} issued`, {
      description: kind === "physical" ? "Shipping in 5-7 business days." : "Ready to use now.",
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" />
          Issue card
        </Button>
      </DialogTrigger>
      <DialogContent>
        {step === "details" ? (
          <>
            <DialogHeader>
              <DialogTitle>Issue a new card</DialogTitle>
              <DialogDescription>Virtual cards are ready instantly. Physical cards ship to an address.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <RadioGroup value={kind} onValueChange={(v) => setKind(v as CardKind)} className="grid grid-cols-2 gap-2">
                {(["virtual", "physical"] as const).map((k) => (
                  <label
                    key={k}
                    htmlFor={`kind-${k}`}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <RadioGroupItem value={k} id={`kind-${k}`} />
                    {k}
                  </label>
                ))}
              </RadioGroup>
              <div className="grid gap-1.5">
                <Label htmlFor={nicknameId}>Nickname</Label>
                <Input id={nicknameId} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Marketing card" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={cardholderId}>Cardholder</Label>
                <Input id={cardholderId} value={cardholder} onChange={(e) => setCardholder(e.target.value)} placeholder="Full name" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={limitId}>Monthly limit</Label>
                <Input id={limitId} inputMode="decimal" value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} placeholder="$1,000" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {kind === "physical" ? (
                <Button disabled={!detailsValid} onClick={() => setStep("shipping")}>
                  Continue
                </Button>
              ) : (
                <Button disabled={!detailsValid} onClick={issue}>
                  Issue card
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Shipping address</DialogTitle>
              <DialogDescription>Where should we send {cardholder || "this"}&rsquo;s card?</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ship-line1">Street address</Label>
                <Input id="ship-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="ship-city">City</Label>
                  <Input id="ship-city" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ship-state">State</Label>
                  <Input id="ship-state" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ship-zip">ZIP code</Label>
                <Input id="ship-zip" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <Button disabled={!shippingValid} onClick={issue}>
                Issue card
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function parseLimit(input: string): Cents | null {
  return parseDollars(input);
}

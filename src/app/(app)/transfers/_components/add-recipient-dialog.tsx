"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Address, Recipient, RecipientId, RoutingNumber } from "@/lib/domain/types";
import { newRecipientSchema, type NewRecipientInput } from "../_lib/wire-form";

const EMPTY: NewRecipientInput = {
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

export function AddRecipientDialog({ onAdd }: { onAdd: (recipient: Recipient) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewRecipientInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function field<K extends keyof NewRecipientInput>(key: K) {
    return {
      value: form[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((er) => ({ ...er, [key]: "" }));
      },
    };
  }

  function handleSubmit() {
    const result = newRecipientSchema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    const address: Address = {
      line1: result.data.addressLine1,
      line2: result.data.addressLine2 || undefined,
      city: result.data.city,
      state: result.data.state.toUpperCase(),
      postalCode: result.data.postalCode,
    };
    const recipient: Recipient = {
      id: `rcp_${crypto.randomUUID().slice(0, 8)}` as RecipientId,
      name: result.data.name,
      address,
      bankName: result.data.bankName,
      routingNumber: result.data.routingNumber as RoutingNumber,
      accountNumber: result.data.accountNumber,
      lastPaidAt: null,
    };
    onAdd(recipient);
    toast.success(`${recipient.name} added to saved recipients`);
    setForm(EMPTY);
    setErrors({});
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setForm(EMPTY);
          setErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Add recipient</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a recipient</DialogTitle>
          <DialogDescription>Save their details for future wires.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="rcp-name">Recipient name</Label>
            <Input id="rcp-name" {...field("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="rcp-line1">Address</Label>
            <Input id="rcp-line1" placeholder="Street address" {...field("addressLine1")} aria-invalid={!!errors.addressLine1} />
            {errors.addressLine1 && <p className="text-sm text-destructive">{errors.addressLine1}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rcp-city">City</Label>
            <Input id="rcp-city" {...field("city")} aria-invalid={!!errors.city} />
            {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rcp-state">State</Label>
              <Input id="rcp-state" maxLength={2} className="w-16 uppercase" {...field("state")} aria-invalid={!!errors.state} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rcp-zip">ZIP</Label>
              <Input id="rcp-zip" {...field("postalCode")} aria-invalid={!!errors.postalCode} />
            </div>
          </div>
          {(errors.state || errors.postalCode) && (
            <p className="col-span-2 text-sm text-destructive">{errors.state || errors.postalCode}</p>
          )}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="rcp-bank">Bank name</Label>
            <Input id="rcp-bank" {...field("bankName")} aria-invalid={!!errors.bankName} />
            {errors.bankName && <p className="text-sm text-destructive">{errors.bankName}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rcp-routing">Routing number (ABA)</Label>
            <Input id="rcp-routing" inputMode="numeric" maxLength={9} {...field("routingNumber")} aria-invalid={!!errors.routingNumber} />
            {errors.routingNumber && <p className="text-sm text-destructive">{errors.routingNumber}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rcp-account">Account number</Label>
            <Input id="rcp-account" {...field("accountNumber")} aria-invalid={!!errors.accountNumber} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="rcp-account-confirm">Confirm account number</Label>
            <Input id="rcp-account-confirm" {...field("confirmAccountNumber")} aria-invalid={!!errors.confirmAccountNumber} />
            {errors.confirmAccountNumber && <p className="text-sm text-destructive">{errors.confirmAccountNumber}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save recipient</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

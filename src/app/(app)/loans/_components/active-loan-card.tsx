"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/money";
import { addCents, formatBps } from "@/lib/domain/money";
import type { Cents, Loan } from "@/lib/domain/types";
import { useLoansStore } from "../_lib/store";
import { payoffAmount } from "../_lib/reducer";

export function ActiveLoanCard({ loan }: { loan: Loan }) {
  const { dispatch } = useLoansStore();
  const [showSchedule, setShowSchedule] = useState(false);

  const paidCents = addCents(...loan.schedule.filter((i) => i.paid).map((i) => i.payment)) as Cents;
  const remaining = payoffAmount(loan);
  const nextInstallment = loan.schedule.find((i) => !i.paid);
  const paidCount = loan.schedule.filter((i) => i.paid).length;
  const pct = Math.round((paidCount / loan.schedule.length) * 100);
  const paidOff = loan.status === "paid_off";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap gap-3 items-start justify-between">
        <div>
          <CardTitle>{loan.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            <Money amount={loan.principal} whole /> · {formatBps(loan.apr)} APR · {loan.termMonths} months
          </p>
        </div>
        <Badge variant={paidOff ? "secondary" : "default"} className="capitalize">
          {paidOff ? "Paid off" : loan.status}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="tabular"><Money amount={paidCents} whole /> paid</span>
            <span className="text-muted-foreground tabular">
              <Money amount={remaining} whole /> remaining
            </span>
          </div>
          <Progress value={pct} className="mt-1.5" />
        </div>
        {!paidOff && nextInstallment && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Next payment, due {nextInstallment.dueDate}</p>
              <p className="text-sm font-medium tabular"><Money amount={nextInstallment.payment} whole /></p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  dispatch({ type: "payInstallment", id: loan.id });
                  toast.success("Payment made");
                }}
              >
                Make payment
              </Button>
              <PayOffDialog loan={loan} amount={remaining} />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowSchedule((s) => !s)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`size-4 transition-transform ${showSchedule ? "rotate-180" : ""}`} />
          {showSchedule ? "Hide" : "Show"} full schedule
        </button>
        {showSchedule && (
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.schedule.map((row) => (
                  <TableRow key={row.number}>
                    <TableCell>{row.number}</TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell className="text-right"><Money amount={row.payment} whole /></TableCell>
                    <TableCell className="text-right"><Money amount={row.remaining} whole /></TableCell>
                    <TableCell className="text-right">
                      {row.paid ? <Badge variant="secondary">Paid</Badge> : <Badge variant="outline">Due</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayOffDialog({ loan, amount }: { loan: Loan; amount: Cents }) {
  const { dispatch } = useLoansStore();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm">Pay off</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pay off {loan.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This pays the remaining balance of <Money amount={amount} whole /> in full and closes the loan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              dispatch({ type: "payOff", id: loan.id });
              toast.success("Loan paid off");
            }}
          >
            Pay off loan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

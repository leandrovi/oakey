"use client";

import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import { formatBps } from "@/lib/domain/money";
import type { Loan } from "@/lib/domain/types";
import { useLoansStore } from "../_lib/store";

export function PendingApplicationCard({ loan }: { loan: Loan }) {
  const { dispatch } = useLoansStore();
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap gap-3 items-start justify-between">
        <div>
          <CardTitle>{loan.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            <Money amount={loan.principal} whole /> · {formatBps(loan.apr)} APR · {loan.termMonths} months ·{" "}
            <Money amount={loan.monthlyPayment} whole />/mo
          </p>
        </div>
        <Badge variant="outline">Pending review</Badge>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              Cancel application
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this application?</AlertDialogTitle>
              <AlertDialogDescription>
                We&rsquo;ll stop reviewing your request for <Money amount={loan.principal} whole />.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  dispatch({ type: "cancel", id: loan.id });
                  toast("Application canceled");
                }}
              >
                Cancel application
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

import { Landmark, PiggyBank } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Money } from "@/components/money";
import { formatBps } from "@/lib/domain/money";
import type { CreditCardAccount, DepositAccount } from "@/lib/domain/types";

function DepositAccountCard({ account, icon: Icon }: { account: DepositAccount; icon: typeof Landmark }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap gap-3 items-start justify-between">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{account.name} {account.kind === "checking" ? "checking" : "savings"}</CardTitle>
          <p className="text-xs text-muted-foreground">••••{account.mask}</p>
        </div>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <p className="font-heading text-2xl font-medium"><Money amount={account.balance} whole /></p>
        {account.apy != null && <p className="shrink-0 text-xs text-muted-foreground">{formatBps(account.apy)} APY</p>}
      </CardContent>
    </Card>
  );
}

function CardAccountCard({ creditCard }: { creditCard: CreditCardAccount }) {
  const utilization = creditCard.limit > 0 ? Math.min(100, Math.round((creditCard.balance / creditCard.limit) * 100)) : 0;
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap gap-3 items-start justify-between">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">Oakey card</CardTitle>
          <p className="text-xs text-muted-foreground">Balance of limit</p>
        </div>
        <Link href="/cards" className="text-xs font-medium text-primary hover:underline">Manage</Link>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-medium"><Money amount={creditCard.balance} whole /> <span className="text-sm font-normal text-muted-foreground">of <Money amount={creditCard.limit} whole /></span></p>
        <Progress value={utilization} className="mt-3" aria-label="Credit utilization" />
        <p className="mt-1.5 text-xs text-muted-foreground">{utilization}% utilized</p>
      </CardContent>
    </Card>
  );
}

export function AccountCards({ accounts, creditCard }: { accounts: DepositAccount[]; creditCard: CreditCardAccount }) {
  const checking = accounts.find((a) => a.kind === "checking");
  const savings = accounts.find((a) => a.kind === "savings");
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {checking && <DepositAccountCard account={checking} icon={Landmark} />}
      {savings && <DepositAccountCard account={savings} icon={PiggyBank} />}
      <CardAccountCard creditCard={creditCard} />
    </div>
  );
}

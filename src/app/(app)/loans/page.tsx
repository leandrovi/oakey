"use client";

import { PageHeader } from "@/components/shell/page-header";
import { useBank } from "@/components/bank/provider";
import { useLoansStore } from "./_lib/store";
import { OfferCard } from "./_components/offer-card";
import { ActiveLoanCard } from "./_components/active-loan-card";
import { PendingApplicationCard } from "./_components/pending-application-card";

export default function LoansPage() {
  const { offers: loanOffers } = useBank();
  const { loans } = useLoansStore();
  const active = loans.filter((l) => l.status === "active" || l.status === "paid_off");
  const pending = loans.filter((l) => l.status === "pending");

  return (
    <div>
      <PageHeader title="Loans" description="Pre-approved offers, a payment calculator and your active loans." />

      <section>
        <h2 className="mb-3 font-heading text-lg">Pre-approved offers</h2>
        {loanOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pre-approved offers right now. Check back after your next statement.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loanOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-heading text-lg">Pending applications</h2>
          <div className="grid gap-4">
            {pending.map((loan) => (
              <PendingApplicationCard key={loan.id} loan={loan} />
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-heading text-lg">Your loans</h2>
          <div className="grid gap-4">
            {active.map((loan) => (
              <ActiveLoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

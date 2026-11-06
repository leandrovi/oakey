# Oakey

A business banking dashboard, built as the case study for Post Oak Group.

The live app is [oakey.vercel.app](https://oakey.vercel.app). The source is [github.com/leandrovi/oakey](https://github.com/leandrovi/oakey).

## Look around

Sign in with `oakey+clerk_test@example.com` and the code `424242`.

That code works for any email that contains `+clerk_test`. The account opens on a year of history: checking, savings, a card, wires, a loan, and a credit score. The name on the account is Leandro Vieira.

## What it does

- Overview of cash, the operating account, savings, and the card, with cash flow for the year.
- Transactions with search, filters, detail, and a CSV export.
- Domestic wires and transfers between checking and savings. A wire shows the path it took: ledger lock, ABA check, Fedwire.
- Cards you can issue, freeze, and limit.
- Loans with a payment calculator, and a credit score with the factors behind it.
- Light and dark.

Balances are not stored. They are the sum of the ledger, and money is integer cents.

## Stack

Next.js 16, React 19, and TypeScript. Tailwind CSS 4. Clerk for sign-in, with the screens built in the app rather than Clerk's hosted components. Neon Postgres and Drizzle. Zod on every server action. Vitest. Deployed on Vercel.

Charts, the card tilt, and the wire path use [AffectUI](https://www.affectui.com). The type is Fraunces for figures and Libre Franklin for the interface.

## AI tools

I used Grok and Claude while building Oakey, mostly to move faster through the interface, the ledger, and review. I kept the product decisions, and I checked the flows in the deployed app.

## Run it locally

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` with `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`. Do not commit that file.

```bash
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
```

A new sign-up receives its own 12-month book. The shape is deterministic for a given user.

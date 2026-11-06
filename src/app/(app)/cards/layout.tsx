import { CardsProvider } from "./_lib/store";

export default function CardsLayout({ children }: { children: React.ReactNode }) {
  return <CardsProvider>{children}</CardsProvider>;
}

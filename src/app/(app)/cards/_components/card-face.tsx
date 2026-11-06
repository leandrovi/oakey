import { Snowflake } from "lucide-react";
import type { Card } from "@/lib/domain/types";
import { OakeyMark } from "@/components/brand/logo";
import { TiltCard } from "@/components/ui/tilt-card";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<Card["kind"], string> = { virtual: "Virtual", physical: "Physical" };

/** A business card rendered as a card: dark oak gradient, brass mark, masked number. */
export function CardFace({ card, className }: { card: Card; className?: string }) {
  const frozen = card.status === "frozen";
  const inactive = card.status === "lost" || card.status === "canceled";
  return (
    <TiltCard maxTilt={8} className="block w-full">
    <div
      className={cn(
        "relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl p-5 text-[oklch(0.96_0.01_85)] shadow-sm",
        "bg-[linear-gradient(135deg,var(--oak-900),var(--oak-700)_60%,var(--oak-500))]",
        inactive && "grayscale",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(115deg,white_0,white_1px,transparent_1px,transparent_10px)]"
        aria-hidden
      />
      <div className="absolute inset-5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <OakeyMark className="size-7 text-brass-500" />
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            {KIND_LABEL[card.kind]}
          </span>
        </div>
        <div>
          <p className="font-mono text-lg tracking-[0.2em] tabular">•••• •••• •••• {card.last4}</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="truncate text-sm font-medium">{card.nickname}</p>
              <p className="text-xs text-white/70">{card.cardholder}</p>
            </div>
            <p className="text-xs text-white/70 tabular">
              {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
            </p>
          </div>
        </div>
      </div>
      {frozen && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 backdrop-blur-[1px]">
          <Snowflake className="size-5" />
          <span className="text-xs font-medium tracking-wide uppercase">Frozen</span>
        </div>
      )}
      {card.status === "lost" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <span className="text-xs font-medium tracking-wide uppercase">Reported lost</span>
        </div>
      )}
      {card.status === "canceled" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65">
          <span className="text-xs font-medium tracking-wide uppercase">Canceled</span>
        </div>
      )}
    </div>
    </TiltCard>
  );
}

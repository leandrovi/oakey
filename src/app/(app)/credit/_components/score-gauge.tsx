import { scoreBand } from "@/lib/domain/offers";

const MIN = 300;
const MAX = 850;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Arc path along the top-facing semicircle, from 180° (left) sweeping through 270° (top) to 360° (right). */
function arcPath(cx: number, cy: number, r: number, fraction: number) {
  const start = polar(cx, cy, r, 180);
  const endAngle = 180 + 180 * Math.max(0, Math.min(1, fraction));
  const end = polar(cx, cy, r, endAngle);
  const largeArc = fraction > 0.5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function ScoreGauge({ score }: { score: number }) {
  const fraction = Math.max(0, Math.min(1, (score - MIN) / (MAX - MIN)));
  const cx = 100;
  const cy = 100;
  const r = 82;
  const band = scoreBand(score);
  const bandColor: Record<typeof band, string> = {
    Excellent: "var(--color-success)",
    "Very good": "var(--color-success)",
    Good: "var(--color-brass)",
    Fair: "var(--color-warning)",
    Poor: "var(--color-destructive)",
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 112" className="w-full max-w-xs">
        <path d={arcPath(cx, cy, r, 1)} fill="none" stroke="var(--color-muted)" strokeWidth={14} strokeLinecap="round" />
        <path
          d={arcPath(cx, cy, r, fraction)}
          fill="none"
          stroke={bandColor[band]}
          strokeWidth={14}
          strokeLinecap="round"
        />
      </svg>
      <div className="-mt-10 text-center">
        <p className="font-heading text-5xl tabular">{score}</p>
        <p className="text-sm font-medium" style={{ color: bandColor[band] }}>
          {band}
        </p>
      </div>
      <div className="mt-2 flex w-full max-w-xs justify-between text-xs text-muted-foreground">
        <span>{MIN}</span>
        <span>{MAX}</span>
      </div>
    </div>
  );
}

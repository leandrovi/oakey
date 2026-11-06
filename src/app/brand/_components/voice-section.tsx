const LINES = [
  "Plain words over jargon.",
  "Numbers first, adjectives never.",
  "Calm, even when money is not.",
  "Say what happens next.",
  "Warm, never cute.",
];

export function VoiceSection() {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-xl font-medium tracking-tight">Voice and tone</h2>
      <ol className="space-y-2 rounded-2xl bg-muted/60 p-6">
        {LINES.map((line, i) => (
          <li key={line} className="flex gap-3 text-sm">
            <span className="tabular text-muted-foreground">{i + 1}.</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

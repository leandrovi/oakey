export type LocalClock = { greeting: string; when: string };

/** Stable value for the server render. The visitor's clock is filled in after mount. */
export const SERVER_LOCAL_CLOCK: LocalClock = { greeting: "", when: "" };

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Weekday, date, and time in the runtime's own time zone. */
export function formatLocalWhen(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

let cachedKey = "";
let cached = SERVER_LOCAL_CLOCK;

export function readLocalClock(): LocalClock {
  const date = new Date();
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  if (key !== cachedKey) {
    cachedKey = key;
    cached = { greeting: greetingFor(date), when: formatLocalWhen(date) };
  }
  return cached;
}

export function subscribeToLocalClock(onChange: () => void): () => void {
  const id = window.setInterval(() => {
    const previous = cachedKey;
    readLocalClock();
    if (cachedKey !== previous) onChange();
  }, 15_000);
  return () => window.clearInterval(id);
}

export function serverLocalClock(): LocalClock {
  return SERVER_LOCAL_CLOCK;
}

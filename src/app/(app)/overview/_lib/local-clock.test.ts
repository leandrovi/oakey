import { describe, expect, it } from "vitest";
import { formatLocalWhen, greetingFor } from "./local-clock";

describe("local clock", () => {
  it("greets from the local hour", () => {
    expect(greetingFor(new Date(2026, 10, 6, 0, 0))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 10, 6, 11, 59))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 10, 6, 12, 0))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 10, 6, 17, 59))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 10, 6, 18, 0))).toBe("Good evening");
  });

  it("prints the weekday, the date, and the time in the local zone", () => {
    const date = new Date(2026, 10, 6, 6, 2);
    const formatted = formatLocalWhen(date);
    expect(formatted).toBe(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date),
    );
    expect(formatted).toContain("Friday");
    expect(formatted).toContain("November");
    expect(formatted).toContain("6");
    expect(formatted).toMatch(/6:02/);
    expect(formatted).not.toContain("November 5");
  });
});

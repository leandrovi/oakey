import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreGauge } from "./score-gauge";

function pathData(score: number) {
  const { container } = render(<ScoreGauge score={score} />);
  return [...container.querySelectorAll("path")].map((path) => path.getAttribute("d") ?? "");
}

function arcFlags(d: string) {
  const match = d.match(/A [\d.]+ [\d.]+ 0 (\d) (\d) /);
  return match ? { large: match[1], sweep: match[2] } : null;
}

describe("ScoreGauge", () => {
  it("draws a score above 575 on the short upper arc", () => {
    for (const d of pathData(720)) {
      expect(arcFlags(d)).toEqual({ large: "0", sweep: "1" });
    }
  });

  it("stops a full semicircle a hair before the right-hand point", () => {
    const [track] = pathData(850);
    const end = track?.match(/1 ([\d.]+) ([\d.]+)$/);
    expect(end).not.toBeNull();
    const y = Number(end?.[2]);
    expect(y).toBeLessThan(100);
    expect(y).toBeGreaterThan(99);
  });
});

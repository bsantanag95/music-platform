import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const { parseAwardPeriod } = await import("./collection-context");

describe("parseAwardPeriod", () => {
  it("separa el premio y el año del período", () => {
    expect(parseAwardPeriod("grammy-2025")).toEqual({ awardSlug: "grammy", year: 2025 });
    expect(parseAwardPeriod("latin-grammy-2024")).toEqual({ awardSlug: "latin-grammy", year: 2024 });
  });

  it("un período que no es de premios no se interpreta", () => {
    expect(parseAwardPeriod("evergreen")).toBeNull();
    expect(parseAwardPeriod("2026-10")).toBeNull();
    expect(parseAwardPeriod("grammy-25")).toBeNull();
  });
});

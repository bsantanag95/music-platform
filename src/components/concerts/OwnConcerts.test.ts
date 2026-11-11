import { describe, expect, it, vi } from "vitest";
import type { ConcertEntryDto } from "@/lib/api/schemas";

// "Compartir este concierto" (openspec: add-shared-concerts-phase2): solo un recuerdo sin enlazar, con el día exacto,
// ciudad y país.

vi.mock("@/i18n/navigation", () => ({ Link: () => null, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/api/concerts", () => ({}));

const { isShareableEntry } = await import("./OwnConcerts");

const entry = (over: Partial<ConcertEntryDto> = {}): ConcertEntryDto => ({
  id: "00000000-0000-4000-8000-0000000000e1",
  artist: { id: "00000000-0000-4000-8000-0000000000a1", name: "Kuervos del Sur" },
  eventDate: "2019-03-30",
  country: "CL",
  city: "Curicó",
  venue: null,
  tour: null,
  setlistfmUrl: null,
  note: null,
  audience: "followers",
  concertId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("isShareableEntry", () => {
  it("día exacto, ciudad y país sin enlazar: sí", () => {
    expect(isShareableEntry(entry())).toBe(true);
  });

  it.each([
    ["solo el año", { eventDate: "2019" }],
    ["año y mes", { eventDate: "2019-03" }],
    ["sin ciudad", { city: null }],
    ["sin país", { country: null }],
    ["ya enlazado", { concertId: "00000000-0000-4000-8000-0000000000c1" }],
  ] as [string, Partial<ConcertEntryDto>][])("%s: no", (_label, over) => {
    expect(isShareableEntry(entry(over))).toBe(false);
  });
});

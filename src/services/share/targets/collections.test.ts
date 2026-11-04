// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ceremony: vi.fn() }));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/awards/read", () => ({ getCeremonyPage: mocks.ceremony }));

import { loadCeremonyTarget, loadIndexTarget, parseCeremonyRef } from "./collections";

function album(id: string, url: string | null = `https://coverartarchive.org/${id}`) {
  return { id, title: `Disco ${id}`, artistName: "Artista", cover: { releaseGroupId: id, coverThumbUrl: url, coverResolved: true } };
}

function nomination(won: boolean, id: string) {
  return { id: `n-${id}`, won, text: id, credit: null, subject: { kind: "release_group", album: album(id) } };
}

const page = {
  awardSlug: "grammy",
  kind: "competition",
  ceremony: { year: 2025, edition: 67, heldOn: "2025-02-02" },
  categories: [
    { key: "a", nominations: [nomination(true, "r1"), nomination(false, "r2")] },
    { key: "b", nominations: [nomination(true, "r1"), nomination(true, "r3")] },
    {
      key: "c",
      nominations: [
        { id: "n-rec", won: true, text: "x", credit: null, subject: { kind: "recording", id: "rec", title: "T", artistName: null, anchor: album("r4") } },
        nomination(true, "r5"),
        nomination(true, "r6"),
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ceremony.mockResolvedValue(page);
});

describe("objetivos de ceremonia y clase", () => {
  it("parsea `<slug>:<año>` y rechaza otras formas", () => {
    expect(parseCeremonyRef("grammy-hall-of-fame:2026")).toEqual({ slug: "grammy-hall-of-fame", year: 2026 });
    expect(parseCeremonyRef("grammy")).toBeNull();
    expect(parseCeremonyRef("Grammy:25")).toBeNull();
  });

  it("mosaico de hasta 4 ganadores con disco, sin repetir y sin perdedores", async () => {
    const target = await loadCeremonyTarget("grammy:2025", "es", "competition");
    expect(target?.card.media).toMatchObject({ type: "mosaic" });
    const covers = target?.card.media.type === "mosaic" ? target.card.media.covers : [];
    expect(covers.map((c) => c.fallbackTitle)).toEqual(["Disco r1", "Disco r3", "Disco r4", "Disco r5"]);
    expect(target?.title).toBe("Premios Grammy 2025");
    expect(target?.canonicalPath).toBe("/es/awards/grammy/2025");
    expect(target?.card.credits).toContain("Carátulas: Cover Art Archive");
  });

  it("una ceremonia pedida como clase de salón (o al revés) no tiene objetivo", async () => {
    expect(await loadCeremonyTarget("grammy:2025", "es", "hall_of_fame")).toBeNull();
  });

  it("una clase de salón usa su título y su ruta", async () => {
    mocks.ceremony.mockResolvedValue({ ...page, awardSlug: "grammy-hall-of-fame", kind: "hall_of_fame" });
    const target = await loadCeremonyTarget("grammy-hall-of-fame:2025", "en", "hall_of_fame");
    expect(target?.kind).toBe("hall_class");
    expect(target?.canonicalPath).toBe("/en/hall-of-fame/grammy-hall-of-fame/2025");
  });

  it("los índices son tipográficos y sin créditos de carátulas", () => {
    const target = loadIndexTarget("awards", "es");
    expect(target.card.media).toEqual({ type: "typographic" });
    expect(target.card.credits).toEqual([]);
    expect(target.canonicalPath).toBe("/es/awards");
  });
});

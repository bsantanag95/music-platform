import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ceremonyContext: vi.fn() }));
vi.mock("@/services/awards/collection-context", () => ({ ceremonyContext: mocks.ceremonyContext }));

const { awardsPresenter, wonNote } = await import("./awards");

const category = (es: string, en: string) => ({ key: es, name: { es, en } });
const input = { templateKey: "grammy-winners", periodKey: "grammy-2025", family: "awards" as const, albumIds: ["a", "b"], today: new Date("2026-10-14T12:00:00Z") };

describe("wonNote", () => {
  const aoty = category("Álbum del año", "Album of the Year");
  const country = category("Mejor álbum de country", "Best Country Album");
  const rock = category("Mejor álbum de rock", "Best Rock Album");

  it("una categoría", () => {
    expect(wonNote([rock])).toEqual({ key: "awardsWon1", params: { a: rock.name } });
  });

  it("dos categorías, las generales primero", () => {
    expect(wonNote([aoty, country])).toEqual({ key: "awardsWon2", params: { a: aoty.name, b: country.name } });
  });

  it("tres categorías: las dos primeras y «+1»", () => {
    expect(wonNote([aoty, country, rock])).toEqual({ key: "awardsWonMore", params: { a: aoty.name, b: country.name, more: 1 } });
  });

  it("sin categorías: null", () => {
    expect(wonNote([])).toBeNull();
  });
});

describe("awardsPresenter", () => {
  beforeEach(() => mocks.ceremonyContext.mockReset());

  it("resume la ceremonia, enlaza a su página, no numera y da la categoría de cada disco", async () => {
    mocks.ceremonyContext.mockResolvedValue({
      awardSlug: "grammy",
      year: 2025,
      heldOn: "2025-02-02",
      wonByAlbum: new Map([["a", [category("Álbum del año", "Album of the Year")]]]),
    });
    const context = (await awardsPresenter(input))!;

    expect(mocks.ceremonyContext).toHaveBeenCalledWith("grammy-2025", ["a", "b"]);
    expect(context.summary).toEqual({
      key: "awardsSummary",
      params: { award: "Grammy", year: "2025", date: { date: "2025-02-02", style: "long" } },
    });
    expect(context.link).toEqual({ href: "/awards/grammy/2025", label: { key: "awardsLink" } });
    expect(context.numbered).toBe(false);
    expect([...context.notes.keys()]).toEqual(["a"]);
    expect(context.notes.get("a")!.key).toBe("awardsWon1");
  });

  it("se abstiene si la ceremonia del período no está cargada o no hay período", async () => {
    mocks.ceremonyContext.mockResolvedValue(null);
    expect(await awardsPresenter(input)).toBeNull();
    expect(await awardsPresenter({ ...input, periodKey: null })).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import type { CategoryView, CeremonyPage } from "@/services/awards/read";

// Páginas de premios (openspec: redesign-awards-pages): el índice (redirección con un solo premio), la página de un premio y
// la ceremonia (categorías destacadas y compactas, fila de años, navegación interna). Se inspecciona el árbol de elementos que
// devuelven los Server Components.

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  listLatestCeremoniesByAward: vi.fn(),
  listRecentHeadlineWinners: vi.fn(),
  listMostAwardedArtists: vi.fn(),
  getLatestCeremonyYear: vi.fn(),
  getCeremonyPage: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi
    .fn()
    .mockResolvedValue(Object.assign((key: string, values?: Record<string, unknown>) => (values?.year ? `${key}:${values.year}` : key), { has: () => true })),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect, Link: () => null }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/awards/read", () => ({
  listLatestCeremoniesByAward: mocks.listLatestCeremoniesByAward,
  listRecentHeadlineWinners: mocks.listRecentHeadlineWinners,
  listMostAwardedArtists: mocks.listMostAwardedArtists,
  getLatestCeremonyYear: mocks.getLatestCeremonyYear,
  getCeremonyPage: mocks.getCeremonyPage,
  getCategoryHistory: vi.fn(),
}));

const { default: AwardsIndexPage } = await import("./page");
const { default: AwardPage } = await import("./[award]/page");
const { default: CeremonyPageRoute } = await import("./[award]/[year]/page");
const { AwardCategory } = await import("@/components/awards/AwardCategory");
const { FacetRow } = await import("@/components/discovery/FacetRow");
const { AwardTileGrid } = await import("@/components/awards/AwardTile");
const { RecentWinnersRail } = await import("@/components/awards/RecentWinnersRail");
const { PopularChart } = await import("@/components/discovery/PopularChart");
const { StickyJumpNav } = await import("@/components/awards/StickyJumpNav");
const { Breadcrumbs } = await import("@/components/ui/Breadcrumbs");

/** Todos los elementos de `type` dentro del árbol devuelto por el componente. */
function findAll(node: ReactNode, type: unknown, found: ReactElement[] = []): ReactElement[] {
  if (node == null || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((child) => findAll(child, type, found));
    return found;
  }
  if (!isValidElement(node)) return found;
  if (node.type === type) found.push(node);
  findAll((node.props as { children?: ReactNode }).children, type, found);
  return found;
}

const ceremony = (year: number) => ({ year, edition: year - 1958, heldOn: `${year}-02-01` });

const params = Promise.resolve({ locale: "es" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listRecentHeadlineWinners.mockResolvedValue([]);
  mocks.listMostAwardedArtists.mockResolvedValue([]);
});

const latest = (awardSlug: string, year: number) => ({ awardSlug, ...ceremony(year), voting: null, years: [year], headline: null });

describe("/awards: hub de premios", () => {
  it("con un solo premio redirige a su ceremonia más reciente", async () => {
    mocks.listLatestCeremoniesByAward.mockResolvedValue([latest("grammy", 2026)]);

    await expect(AwardsIndexPage({ params })).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/awards/grammy/2026", locale: "es" });
  });

  it("con varios premios muestra una tarjeta por premio, en el orden recibido, sin rótulo sobre el título", async () => {
    mocks.listLatestCeremoniesByAward.mockResolvedValue([latest("brit-awards", 2026), latest("grammy", 2026), latest("mercury-prize", 2025)]);

    const element = await AwardsIndexPage({ params });
    const grid = findAll(element, AwardTileGrid);

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(grid).toHaveLength(1);
    expect((grid[0]!.props as { ceremonies: { awardSlug: string }[] }).ceremonies.map((c) => c.awardSlug)).toEqual([
      "brit-awards",
      "grammy",
      "mercury-prize",
    ]);
    const text = JSON.stringify(element);
    expect(text).not.toContain("kicker");
    expect(text).not.toContain("intro");
  });

  it("sin premios dice que todavía no hay ceremonias cargadas, sin redirigir", async () => {
    mocks.listLatestCeremoniesByAward.mockResolvedValue([]);

    const element = await AwardsIndexPage({ params });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(JSON.stringify(element)).toContain("emptyIndex");
    expect(findAll(element, AwardTileGrid)).toHaveLength(0);
    expect(mocks.listRecentHeadlineWinners).not.toHaveBeenCalled();
    expect(mocks.listMostAwardedArtists).not.toHaveBeenCalled();
  });

  it("las tarjetas del hub van en modo detallado y en una sola grilla (la agrupación está apagada)", async () => {
    mocks.listLatestCeremoniesByAward.mockResolvedValue([latest("grammy", 2026), latest("latin-grammy", 2025)]);

    const element = await AwardsIndexPage({ params });
    const grids = findAll(element, AwardTileGrid);

    expect(grids).toHaveLength(1);
    expect((grids[0]!.props as { detailed?: boolean }).detailed).toBe(true);
  });

  it("muestra los ganadores recientes y el ranking de los más premiados con sus premios", async () => {
    mocks.listLatestCeremoniesByAward.mockResolvedValue([latest("grammy", 2026), latest("latin-grammy", 2025)]);
    const winner = { id: "n1", won: true, text: "X — Y", credit: null, subject: null };
    mocks.listRecentHeadlineWinners.mockResolvedValue([{ awardSlug: "grammy", year: 2026, category: { es: "Álbum del año", en: "AOTY" }, winner }]);
    mocks.listMostAwardedArtists.mockResolvedValue(
      ["a", "b", "c"].map((id, index) => ({ id, name: `Artista ${id}`, photoUrl: null, wins: 5 - index, awardSlugs: ["grammy", "latin-grammy"] })),
    );

    const element = await AwardsIndexPage({ params });

    expect(mocks.listRecentHeadlineWinners).toHaveBeenCalledWith(3);
    expect(findAll(element, RecentWinnersRail)).toHaveLength(1);
    const chart = findAll(element, PopularChart);
    expect(chart).toHaveLength(1);
    const items = (chart[0]!.props as { items: { title: string; subtitle: string; figure: string }[] }).items;
    expect(items.map((item) => item.title)).toEqual(["Artista a", "Artista b", "Artista c"]);
    expect(items[0]!.subtitle).toBe("names.grammy · names.latin-grammy");
  });

  it("sin ganadores ni un ranking de al menos tres artistas no muestra esas secciones", async () => {
    mocks.listLatestCeremoniesByAward.mockResolvedValue([latest("grammy", 2026), latest("latin-grammy", 2025)]);
    mocks.listMostAwardedArtists.mockResolvedValue(
      ["a", "b"].map((id) => ({ id, name: id, photoUrl: null, wins: 2, awardSlugs: ["grammy"] })),
    );

    const element = await AwardsIndexPage({ params });

    expect(findAll(element, RecentWinnersRail).map((rail) => (rail.props as { winners: unknown[] }).winners)).toEqual([[]]);
    expect(findAll(element, PopularChart)).toHaveLength(0);
  });
});

describe("/awards/{premio}", () => {
  it("redirige a la ceremonia más reciente del premio", async () => {
    mocks.getLatestCeremonyYear.mockResolvedValue(2026);

    await expect(AwardPage({ params: Promise.resolve({ locale: "es", award: "grammy" }) })).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.getLatestCeremonyYear).toHaveBeenCalledWith("grammy");
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/awards/grammy/2026", locale: "es" });
  });

  it("un premio inexistente o sin ceremonias es una página no encontrada", async () => {
    mocks.getLatestCeremonyYear.mockResolvedValue(null);

    await expect(AwardPage({ params: Promise.resolve({ locale: "es", award: "inexistente" }) })).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("/awards/{premio}/{año}: ceremonia", () => {
  const category = (key: string, tier: CategoryView["tier"], field: string | null = null): CategoryView => ({
    key,
    tier,
    field,
    name: { es: key, en: key },
    honors: "performer",
    subjectKind: "release_group",
    coverage: "complete",
    nominations: [],
  });

  const page = (over: Partial<CeremonyPage> = {}): CeremonyPage => ({
    awardSlug: "grammy",
    voting: "academy",
    sourceUrl: "https://en.wikipedia.org/wiki/66th_Annual_Grammy_Awards",
    ceremony: ceremony(2024),
    ceremonies: [ceremony(2026), ceremony(2025), ceremony(2024)],
    categories: [
      ...["album", "record", "song", "new-artist", "producer", "songwriter"].map((key) => category(key, "general")),
      category("pop-album", "album"),
      category("rock-album", "album"),
      category("pop-solo", "genre", "pop"),
      category("pop-duo", "genre", "pop"),
      category("rap-solo", "genre", "rap"),
    ],
    ...over,
  });

  const open = async (value: CeremonyPage | null, year = "2024") => {
    mocks.getCeremonyPage.mockResolvedValue(value);
    return CeremonyPageRoute({ params: Promise.resolve({ locale: "es", award: "grammy", year }) });
  };
  const variantsOf = (element: ReactNode) =>
    Object.fromEntries(findAll(element, AwardCategory).map((item) => [(item.props as { name: { es: string } }).name.es, (item.props as { variant: string }).variant]));

  it("las cuatro primeras del campo general van destacadas y el resto, compactas", async () => {
    const variants = variantsOf(await open(page()));

    expect(variants).toMatchObject({ album: "featured", record: "featured", song: "featured", "new-artist": "featured" });
    expect(variants).toMatchObject({ producer: "compact", songwriter: "compact" });
  });

  it("los niveles por álbum y por género son filas compactas", async () => {
    const variants = variantsOf(await open(page()));

    expect(variants).toMatchObject({ "pop-album": "compact", "rock-album": "compact", "pop-solo": "compact", "pop-duo": "compact", "rap-solo": "compact" });
  });

  it("la fila de años va de la más reciente a la más antigua, con la ceremonia actual marcada", async () => {
    const element = await open(page());
    const years = (findAll(element, FacetRow)[0]!.props as { facet: { label: string; links: { key: string; current: boolean; href: string }[] } }).facet;

    expect(years.label).toBe("yearRow");
    expect(years.links.map((link) => link.key)).toEqual(["2026", "2025", "2024"]);
    expect(years.links.find((link) => link.current)?.key).toBe("2024");
    expect(years.links[0]!.href).toBe("/awards/grammy/2026");
  });

  it("con una sola ceremonia no hay fila de años", async () => {
    const element = await open(page({ ceremonies: [ceremony(2024)] }));

    expect(findAll(element, FacetRow)).toHaveLength(0);
  });

  it("la navegación interna lleva a los niveles general y por álbum y a cada campo del nivel por género", async () => {
    const element = await open(page());
    const nav = findAll(element, StickyJumpNav)[0]!.props as { label: string; items: { id: string; label: string }[] };

    expect(nav.label).toBe("jumpLabel");
    expect(nav.items).toEqual([
      { id: "tier-general", label: "tierGeneral" },
      { id: "tier-album", label: "tierAlbum" },
      { id: "field-pop", label: "fields.pop" },
      { id: "field-rap", label: "fields.rap" },
    ]);
  });

  it("sin nivel por género la navegación no tiene campos", async () => {
    const element = await open(page({ categories: page().categories.filter((item) => item.tier !== "genre") }));
    const nav = findAll(element, StickyJumpNav)[0]!.props as { items: { id: string }[] };

    expect(nav.items.map((item) => item.id)).toEqual(["tier-general", "tier-album"]);
  });

  it("la miga de pan lleva el nivel Premios al hub, enlaza el premio a su página y termina en el año", async () => {
    const element = await open(page());
    const items = (findAll(element, Breadcrumbs)[0]!.props as { items: { label: string; href?: string }[] }).items;

    expect(items.map((item) => item.label)).toEqual(["home", "heading", "names.grammy", "2024"]);
    expect(items[1]!.href).toBe("/awards");
    expect(items[2]!.href).toBe("/awards/grammy");
    expect(items[3]!.href).toBeUndefined();
  });

  it("bajo el título dice quién decide el premio y enlaza la fuente con el sitio de la URL", async () => {
    const element = await open(page({ voting: "jury" }));
    const links = findAll(element, "a");
    const source = links.find((a) => (a.props as { href?: string }).href?.includes("wikipedia"));
    const text = JSON.stringify(element);

    expect(text).toContain("voting.jury");
    expect(source).toBeDefined();
    expect((source!.props as { rel: string }).rel).toBe("noopener noreferrer");
    expect(text).toContain("source");
  });

  it("sin tipo de votación ni fuente guardados, la cabecera omite la línea", async () => {
    const text = JSON.stringify(await open(page({ voting: null, sourceUrl: null })));

    expect(text).not.toContain("voting.");
    expect(text).not.toContain("wikipedia");
  });

  it("no pinta ningún rótulo sobre el título", async () => {
    const text = JSON.stringify(await open(page()));

    expect(text).not.toContain("ceremonyKicker");
    expect(text).not.toContain("uppercase tracking-wider text-amber");
  });

  it("un año o premio sin ceremonia es una página no encontrada, y un año mal escrito también", async () => {
    await expect(open(null)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(open(page(), "abc")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

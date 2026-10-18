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
  listAwards: vi.fn(),
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
  listAwards: mocks.listAwards,
  getLatestCeremonyYear: mocks.getLatestCeremonyYear,
  getCeremonyPage: mocks.getCeremonyPage,
  getCategoryHistory: vi.fn(),
}));

const { default: AwardsIndexPage } = await import("./page");
const { default: AwardPage } = await import("./[award]/page");
const { default: CeremonyPageRoute } = await import("./[award]/[year]/page");
const { AwardCategory } = await import("@/components/awards/AwardCategory");
const { FacetRow } = await import("@/components/discovery/FacetRow");
const { ExploreJumpNav } = await import("@/components/discovery/ExploreJumpNav");
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
});

describe("/awards: índice", () => {
  it("con un solo premio redirige a su ceremonia más reciente", async () => {
    mocks.listAwards.mockResolvedValue([{ slug: "grammy", ceremonies: [ceremony(2026), ceremony(2025), ceremony(2021)] }]);

    await expect(AwardsIndexPage({ params })).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/awards/grammy/2026", locale: "es" });
  });

  it("con varios premios lista cada uno con sus años, de la más reciente a la más antigua, sin rótulo sobre el título", async () => {
    mocks.listAwards.mockResolvedValue([
      { slug: "grammy", ceremonies: [ceremony(2025), ceremony(2021)] },
      { slug: "otro", ceremonies: [ceremony(2024), ceremony(2023)] },
    ]);

    const element = await AwardsIndexPage({ params });
    const rows = findAll(element, FacetRow).map((row) => (row.props as { facet: { links: { label: string; href: string }[] } }).facet.links);

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(rows.map((links) => links.map((link) => link.label))).toEqual([["2025", "2021"], ["2024", "2023"]]);
    expect(rows[1]![0]!.href).toBe("/awards/otro/2024");
    const text = JSON.stringify(element);
    expect(text).not.toContain("kicker");
    expect(text).not.toContain("intro");
  });

  it("sin premios dice que todavía no hay ceremonias cargadas, sin redirigir", async () => {
    mocks.listAwards.mockResolvedValue([]);

    const element = await AwardsIndexPage({ params });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(JSON.stringify(element)).toContain("emptyIndex");
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
    const nav = findAll(element, ExploreJumpNav)[0]!.props as { label: string; items: { id: string; label: string }[] };

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
    const nav = findAll(element, ExploreJumpNav)[0]!.props as { items: { id: string }[] };

    expect(nav.items.map((item) => item.id)).toEqual(["tier-general", "tier-album"]);
  });

  it("la miga de pan enlaza el premio a su página y termina en el año", async () => {
    const element = await open(page());
    const items = (findAll(element, Breadcrumbs)[0]!.props as { items: { label: string; href?: string }[] }).items;

    expect(items.map((item) => item.label)).toEqual(["home", "names.grammy", "2024"]);
    expect(items[1]!.href).toBe("/awards/grammy");
    expect(items[2]!.href).toBeUndefined();
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

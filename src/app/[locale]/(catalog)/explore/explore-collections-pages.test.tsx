import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import type { ArchivedCollection, FeaturedCollection } from "@/services/discovery/discovery";

// Páginas de colecciones de Explorar (openspec: split-explore-collections): la portada `/explore` con sus dos riles y
// la página `/explore/collections`. Se inspecciona el árbol de elementos que devuelven los Server Components.

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
  isExploreEnabled: vi.fn(),
  getExplorePage: vi.fn(),
  listCollectionsHub: vi.fn(),
  listCollectionArchive: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect, Link: () => null }));
vi.mock("@/lib/config/discovery", () => ({ isExploreEnabled: mocks.isExploreEnabled }));
vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));
vi.mock("@/services/awards/read", () => ({ listRecentCeremonies: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/discovery/collections/sync", () => ({ ensureCollectionsFresh: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/services/genres/names", () => ({ genreDisplayName: vi.fn(), genreLocaleOf: vi.fn() }));
vi.mock("@/services/discovery/discovery", async () => {
  const actual = await vi.importActual<typeof import("@/services/discovery/discovery")>("@/services/discovery/discovery");
  return {
    ...actual,
    getExplorePage: mocks.getExplorePage,
    albumArtistNames: vi.fn().mockResolvedValue({}),
    listCollectionsHub: mocks.listCollectionsHub,
    listCollectionArchive: mocks.listCollectionArchive,
  };
});

const { default: ExplorePage } = await import("./page");
const { default: CollectionsPage } = await import("./collections/page");
const { CollectionRail } = await import("@/components/discovery/CollectionRail");
const { ExploreJumpNav } = await import("@/components/discovery/ExploreJumpNav");

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

const collection = (id: string, over: Partial<FeaturedCollection> = {}): FeaturedCollection => ({
  id,
  title: `Colección ${id}`,
  description: null,
  itemCount: 12,
  coverThumbs: [],
  source: "template",
  templateKey: "anniversaries",
  periodKey: "2026-10",
  family: "ephemeris",
  ...over,
});

const archived = (id: string): ArchivedCollection => ({ ...collection(id), endedAt: "2026-09-01T00:00:00.000Z" });

const empty = {
  editorial: [] as FeaturedCollection[],
  automatic: [] as FeaturedCollection[],
  newReleases: [],
  upcoming: [],
  decades: [],
  families: [],
  topRated: [],
  mostReviewed: [],
};

const params = Promise.resolve({ locale: "es" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isExploreEnabled.mockReturnValue(true);
  mocks.getExplorePage.mockResolvedValue(empty);
  mocks.listCollectionsHub.mockResolvedValue({ editorial: [], automatic: [] });
  mocks.listCollectionArchive.mockResolvedValue({ collections: [], page: 1, pageSize: 24, hasNext: false });
});

describe("/explore: dos riles de colecciones", () => {
  it("muestra el rail editorial y el automático por separado, cada uno con su ancla y «Ver todas»", async () => {
    mocks.getExplorePage.mockResolvedValue({
      ...empty,
      editorial: [collection("e1", { source: "curated", templateKey: null, periodKey: null, family: null })],
      automatic: [collection("a1")],
    });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const rails = findAll(element, CollectionRail);

    expect(rails.map((rail) => (rail.props as { id: string }).id)).toEqual(["descubre-por-datos", "seleccion-editorial"]);
    const [automatic, editorial] = rails.map((rail) => rail.props as { collections: FeaturedCollection[]; seeAll?: { href: string }; familyLabel?: unknown });
    expect(editorial!.collections.map((c) => c.id)).toEqual(["e1"]);
    expect(automatic!.collections.map((c) => c.id)).toEqual(["a1"]);
    expect(editorial!.seeAll?.href).toBe("/explore/collections");
    expect(automatic!.seeAll?.href).toBe("/explore/collections");
    // Solo las automáticas muestran la familia sobre el título.
    expect(editorial!.familyLabel).toBeUndefined();
    expect(automatic!.familyLabel).toBeTypeOf("function");
  });

  it("la navegación rápida enlaza ambos riles solo si tienen contenido", async () => {
    mocks.getExplorePage.mockResolvedValue({ ...empty, editorial: [], automatic: [collection("a1")], families: [{ key: "rock", tier: "main", count: 3 }] });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const nav = findAll(element, ExploreJumpNav)[0]!.props as { items: { id: string }[] };

    expect(nav.items.map((item) => item.id)).toEqual(["descubre-por-datos", "generos"]);
  });

  it("sin colecciones curadas, el rail editorial no se pide ni se enlaza", async () => {
    mocks.getExplorePage.mockResolvedValue({ ...empty, automatic: [collection("a1")] });

    const element = await ExplorePage({ params, searchParams: Promise.resolve({}) });
    const nav = findAll(element, ExploreJumpNav)[0]?.props as { items: { id: string }[] } | undefined;

    expect(nav?.items.some((item) => item.id === "seleccion-editorial") ?? false).toBe(false);
  });
});

describe("/explore/collections", () => {
  it("redirige a Inicio con Explorar apagado", async () => {
    mocks.isExploreEnabled.mockReturnValue(false);

    await expect(CollectionsPage({ params, searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/", locale: "es" });
  });

  it("agrupa las automáticas vigentes por familia y las deja tras la selección editorial", async () => {
    mocks.listCollectionsHub.mockResolvedValue({
      editorial: [collection("e1", { source: "curated", templateKey: null, periodKey: null, family: null })],
      automatic: [
        collection("a1", { family: "awards" }),
        collection("a2", { family: "ephemeris" }),
        collection("a3", { family: "awards" }),
      ],
    });

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });
    const rails = findAll(element, CollectionRail).map((rail) => rail.props as { id: string; collections: FeaturedCollection[] });

    expect(rails.map((rail) => rail.id)).toEqual(["seleccion-editorial", "familia-ephemeris", "familia-awards", "anteriores"]);
    expect(rails.find((rail) => rail.id === "familia-awards")!.collections.map((c) => c.id)).toEqual(["a1", "a3"]);
  });

  it("omite las familias sin colecciones vigentes", async () => {
    mocks.listCollectionsHub.mockResolvedValue({ editorial: [], automatic: [collection("a1", { family: "awards" })] });

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });
    // `CollectionRail` no pinta nada con una lista vacía y sin mensaje (la selección editorial sin curaduría).
    const visible = findAll(element, CollectionRail)
      .map((rail) => rail.props as { id: string; collections: unknown[]; emptyMessage?: string })
      .filter((rail) => rail.collections.length > 0 || rail.emptyMessage)
      .map((rail) => rail.id);

    expect(visible).toEqual(["familia-awards", "anteriores"]);
  });

  it("pasa la familia y la página al archivo, e ignora una familia inválida", async () => {
    await CollectionsPage({ params, searchParams: Promise.resolve({ familia: "awards", pagina: "3" }) });
    expect(mocks.listCollectionArchive).toHaveBeenLastCalledWith({ family: "awards", page: 3 });

    await CollectionsPage({ params, searchParams: Promise.resolve({ familia: "inventada", pagina: "-2" }) });
    expect(mocks.listCollectionArchive).toHaveBeenLastCalledWith({ family: undefined, page: 1 });
  });

  it("el archivo vacío muestra su mensaje en vez de omitirse", async () => {
    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });
    const archive = findAll(element, CollectionRail).find((rail) => (rail.props as { id: string }).id === "anteriores")!;

    expect((archive.props as { emptyMessage?: string }).emptyMessage).toBe("archiveEmpty");
  });

  it("con filtro de familia, el archivo vacío dice que no hay de ese tipo", async () => {
    const element = await CollectionsPage({ params, searchParams: Promise.resolve({ familia: "awards" }) });
    const archive = findAll(element, CollectionRail).find((rail) => (rail.props as { id: string }).id === "anteriores")!;

    expect((archive.props as { emptyMessage?: string }).emptyMessage).toBe("archiveEmptyFamily");
  });

  it("muestra la fecha en que cada colección del archivo dejó de estar vigente", async () => {
    mocks.listCollectionArchive.mockResolvedValue({ collections: [archived("v1")], page: 1, pageSize: 24, hasNext: false });

    const element = await CollectionsPage({ params, searchParams: Promise.resolve({}) });
    const archive = findAll(element, CollectionRail).find((rail) => (rail.props as { id: string }).id === "anteriores")!;
    const note = (archive.props as { noteFor: (c: ArchivedCollection) => string }).noteFor(archived("v1"));

    expect(note).toBe("endedOn");
  });
});

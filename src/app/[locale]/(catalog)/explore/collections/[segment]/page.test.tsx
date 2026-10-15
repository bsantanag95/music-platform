import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { collectionSegment } from "@/lib/catalog-links";

const LIST_ID = "a1b2c3d4-0000-4000-8000-000000000001";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  permanentRedirect: vi.fn((url: string): never => {
    throw new Error(`NEXT_PERMANENT_REDIRECT:${url}`);
  }),
  redirect: vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
  isExploreEnabled: vi.fn(),
  resolveSession: vi.fn(),
  findGeneratedCollection: vi.fn(),
  getUserListDetail: vi.fn(),
  savedStateFor: vi.fn(),
  saveCountsFor: vi.fn(),
  countsByListId: vi.fn(),
  presentCollection: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
}));
// Traducción de prueba: devuelve la clave (y `has` la da por existente) para ver qué mensajes pide la página.
const translate = Object.assign((key: string) => key, { has: () => true });
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue(translate) }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect, Link: () => null }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/config/discovery", () => ({ isExploreEnabled: mocks.isExploreEnabled }));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/discovery/collections/generated", () => ({ findGeneratedCollection: mocks.findGeneratedCollection }));
vi.mock("@/services/discovery/collections/presenters", () => ({ presentCollection: mocks.presentCollection }));
vi.mock("@/services/lists/lists", () => ({ getUserListDetail: mocks.getUserListDetail }));
vi.mock("@/services/lists/saved-lists", () => ({ savedStateFor: mocks.savedStateFor, saveCountsFor: mocks.saveCountsFor }));
vi.mock("@/services/journeys/progress", () => ({ countsByListId: mocks.countsByListId }));

const { default: CollectionDetailPage } = await import("./page");
const { CollectionDetailHeader } = await import("@/components/discovery/CollectionDetailHeader");
const { CollectionAlbumGrid } = await import("@/components/discovery/CollectionAlbumGrid");

function findElement(node: ReactNode, type: unknown): ReactElement | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) return node.map((child) => findElement(child, type)).find(Boolean) ?? null;
  if (!isValidElement(node)) return null;
  if (node.type === type) return node;
  return findElement((node.props as { children?: ReactNode }).children, type);
}
const findHeader = (node: ReactNode) => findElement(node, CollectionDetailHeader);
const findGrid = (node: ReactNode) => findElement(node, CollectionAlbumGrid);

const generated = { templateKey: "new-releases", periodKey: "evergreen", storedTitle: "Novedades esenciales", family: "releases" as const };
const item = (n: number) => ({ id: `item-${n}`, target: { id: `album-${n}`, title: `Disco ${n}`, artistName: null, coverThumbUrl: null } });
const detail = { id: LIST_ID, entityType: "release-group", title: "Novedades esenciales", audience: "public", items: [item(1), item(2)] };
const emptyContext = { notes: new Map(), numbered: false };

function run(locale: string, segment: string) {
  return CollectionDetailPage({ params: Promise.resolve({ locale, segment }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isExploreEnabled.mockReturnValue(true);
  mocks.resolveSession.mockResolvedValue(null);
  mocks.findGeneratedCollection.mockResolvedValue(generated);
  mocks.getUserListDetail.mockResolvedValue(detail);
  mocks.savedStateFor.mockResolvedValue(new Map());
  mocks.saveCountsFor.mockResolvedValue(new Map());
  mocks.countsByListId.mockResolvedValue(new Map());
  mocks.presentCollection.mockResolvedValue(emptyContext);
});

describe("detalle de una colección generada", () => {
  it("con Explorar apagado redirige a Inicio", async () => {
    mocks.isExploreEnabled.mockReturnValue(false);
    await expect(run("es", collectionSegment("Novedades esenciales", LIST_ID))).rejects.toThrow("NEXT_REDIRECT");
  });

  it("un segmento inválido es 404", async () => {
    await expect(run("es", "no-es-un-slug")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.findGeneratedCollection).not.toHaveBeenCalled();
  });

  it("una lista que no es colección generada (personal o curada) es 404", async () => {
    mocks.findGeneratedCollection.mockResolvedValue(null);
    await expect(run("es", collectionSegment("Discos", LIST_ID))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getUserListDetail).not.toHaveBeenCalled();
  });

  it("en español muestra el título en español, con la plataforma como dueño", async () => {
    const element = await run("es", collectionSegment("Novedades esenciales", LIST_ID));
    const header = findHeader(element)!.props as { list: { title: string }; platformName: string; family: string };

    expect(header.list.title).toBe("Novedades esenciales");
    expect(header.platformName).toBe("Exploración");
    // La familia viene de la fila, no del registro de plantillas.
    expect(header.family).toBe("releases");
  });

  it("en inglés muestra el título en inglés y la plataforma como 'Explore'", async () => {
    const element = await run("en", collectionSegment("Essential new releases", LIST_ID));
    const header = findHeader(element)!.props as { list: { title: string }; platformName: string };

    expect(header.list.title).toBe("Essential new releases");
    expect(header.platformName).toBe("Explore");
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it("un slug de otro idioma redirige (308) al canónico del idioma activo, sin usuario en la URL", async () => {
    await expect(run("en", collectionSegment("Novedades esenciales", LIST_ID))).rejects.toThrow(
      `NEXT_PERMANENT_REDIRECT:/en/explore/collections/${encodeURIComponent(collectionSegment("Essential new releases", LIST_ID))}`,
    );
  });

  it("pide la lista a nombre de la cuenta curadora y con el visitante", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    await run("es", collectionSegment("Novedades esenciales", LIST_ID));

    expect(mocks.getUserListDetail).toHaveBeenCalledWith("exploracion", LIST_ID, "viewer");
  });

  it("una lista que el servicio no puede devolver es 404", async () => {
    mocks.getUserListDetail.mockRejectedValue(new Error("LIST_NOT_FOUND"));
    await expect(run("es", collectionSegment("Novedades esenciales", LIST_ID))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("no decide el contexto: pide a presentCollection con la plantilla, el período, la familia y los discos en orden", async () => {
    await run("es", collectionSegment("Novedades esenciales", LIST_ID));

    expect(mocks.presentCollection).toHaveBeenCalledTimes(1);
    expect(mocks.presentCollection).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: "new-releases",
        periodKey: "evergreen",
        family: "releases",
        albumIds: ["album-1", "album-2"],
        today: expect.any(Date),
      }),
    );
  });

  it("pinta lo que resuelve el presentador: resumen, enlace, cartela, grupos y numeración", async () => {
    mocks.presentCollection.mockResolvedValue({
      summary: { key: "awardsSummary" },
      link: { href: "/awards/grammy/2025", label: { key: "awardsLink" } },
      notes: new Map([["album-1", { key: "year", params: { year: "2024" } }]]),
      groups: [{ label: { key: "monthHeading" }, albumIds: ["album-2", "album-1"] }],
      numbered: true,
    });
    const element = await run("es", collectionSegment("Novedades esenciales", LIST_ID));
    const header = findHeader(element)!.props as { summary: string; link: { href: string; label: string } };
    const grid = findGrid(element)!.props as {
      notes: Record<string, string>;
      numbered: boolean;
      groups: { heading?: string; items: { id: string }[] }[];
    };

    expect(header.summary).toBe("awardsSummary");
    expect(header.link).toEqual({ href: "/awards/grammy/2025", label: "awardsLink" });
    expect(grid.notes).toEqual({ "item-1": "year" });
    expect(grid.numbered).toBe(true);
    expect(grid.groups).toEqual([{ heading: "monthHeading", items: [item(2), item(1)] }]);
  });

  it("sin contexto del presentador, ni resumen ni grupos ni numeración: la cabecera cae a la familia", async () => {
    const element = await run("es", collectionSegment("Novedades esenciales", LIST_ID));
    const header = findHeader(element)!.props as { summary?: string; link?: unknown };
    const grid = findGrid(element)!.props as { groups: unknown; numbered: boolean; notes: object };

    expect(header.summary).toBeUndefined();
    expect(header.link).toBeUndefined();
    expect(grid.groups).toBeNull();
    expect(grid.numbered).toBe(false);
    expect(grid.notes).toEqual({});
  });

  it("una lista que no es de álbumes no pide contexto", async () => {
    mocks.getUserListDetail.mockResolvedValue({ ...detail, entityType: "artist" });
    await run("es", collectionSegment("Novedades esenciales", LIST_ID));

    expect(mocks.presentCollection).not.toHaveBeenCalled();
  });
});

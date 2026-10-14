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
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
}));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect, Link: () => null }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/config/discovery", () => ({ isExploreEnabled: mocks.isExploreEnabled }));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/discovery/collections/generated", () => ({ findGeneratedCollection: mocks.findGeneratedCollection }));
vi.mock("@/services/lists/lists", () => ({ getUserListDetail: mocks.getUserListDetail }));
vi.mock("@/services/lists/saved-lists", () => ({ savedStateFor: mocks.savedStateFor, saveCountsFor: mocks.saveCountsFor }));
vi.mock("@/services/journeys/progress", () => ({ countsByListId: mocks.countsByListId }));

const { default: CollectionDetailPage } = await import("./page");
const { CollectionDetailHeader } = await import("@/components/discovery/CollectionDetailHeader");

function findHeader(node: ReactNode): ReactElement | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) return node.map(findHeader).find(Boolean) ?? null;
  if (!isValidElement(node)) return null;
  if (node.type === CollectionDetailHeader) return node;
  return findHeader((node.props as { children?: ReactNode }).children);
}

const generated = { templateKey: "new-releases", periodKey: "evergreen", storedTitle: "Novedades esenciales", family: "releases" };
const detail = { id: LIST_ID, entityType: "release-group", title: "Novedades esenciales", audience: "public", items: [] };

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
});

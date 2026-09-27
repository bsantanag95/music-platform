import { beforeEach, describe, expect, it, vi } from "vitest";
import kuervosEntity from "../wikimedia/__fixtures__/kuervos-del-sur-entity.json";
import kuervosPlace from "../wikimedia/__fixtures__/kuervos-del-sur-place.json";
import kuervosCountry from "../wikimedia/__fixtures__/kuervos-del-sur-country.json";
import kuervosExtractEs from "../wikimedia/__fixtures__/kuervos-del-sur-extract-es.json";
import kuervosImage from "../wikimedia/__fixtures__/kuervos-del-sur-imageinfo.json";
import monLaferteEntity from "../wikimedia/__fixtures__/mon-laferte-entity.json";
import monLafertePlace from "../wikimedia/__fixtures__/mon-laferte-place.json";
import monLaferteCountry from "../wikimedia/__fixtures__/mon-laferte-country.json";
import monLaferteExtractEs from "../wikimedia/__fixtures__/mon-laferte-extract-es.json";
import monLaferteExtractEn from "../wikimedia/__fixtures__/mon-laferte-extract-en.json";
import monLaferteImage from "../wikimedia/__fixtures__/mon-laferte-imageinfo.json";

// El cliente de Wikimedia responde desde fixtures reales recortados; la base es un mock que
// registra lo que se escribe (el SQL real lo cubre scripts/smoke-test-artist-profile.ts).
const state = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  upserts: [] as { values: Record<string, unknown>; set: Record<string, unknown> }[],
}));
const mocks = vi.hoisted(() => ({ getEntities: vi.fn(), getIntroExtract: vi.fn(), getImageInfo: vi.fn() }));

vi.mock("@/db", () => {
  const tx = {
    execute: async () => undefined,
    select: () => ({ from: () => ({ where: () => ({ limit: async () => (state.current ? [state.current] : []) }) }) }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(values);
        },
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoUpdate: async ({ set }: { set: Record<string, unknown> }) => {
          state.upserts.push({ values, set });
        },
      }),
    }),
  };
  return { db: { transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } };
});
vi.mock("../wikimedia/client", () => ({ wikimedia: mocks }));
vi.spyOn(console, "warn").mockImplementation(() => {});

const { enrichArtistFromWikimedia } = await import("./artist-wikimedia");

type Fixture = { entities: Record<string, unknown> };
function entitiesFrom(...fixtures: Fixture[]) {
  const all = Object.assign({}, ...fixtures.map((f) => f.entities)) as Record<string, unknown>;
  return async (ids: string[]) => ({ entities: Object.fromEntries(ids.map((id) => [id, all[id]])) });
}

function artistRow(overrides: Record<string, unknown> = {}) {
  return { id: "a1", mbid: "m1", type: "group", wikidataId: "Q63565567", wikimediaSyncedAt: null, photoBlockedAt: null, ...overrides };
}

function upsertFor(locale: string) {
  return state.upserts.find((u) => u.values.locale === locale)?.values;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.current = artistRow();
  state.updates = [];
  state.upserts = [];
  mocks.getEntities.mockImplementation(entitiesFrom(kuervosEntity, kuervosPlace, kuervosCountry));
  mocks.getIntroExtract.mockImplementation(async (lang: string) => (lang === "es" ? kuervosExtractEs : { query: { pages: [] } }));
  mocks.getImageInfo.mockResolvedValue(kuervosImage);
});

describe("enrichArtistFromWikimedia", () => {
  it("banda con artículo solo en español: foto CC BY-SA, descripción por idioma, lugar con país", async () => {
    const result = await enrichArtistFromWikimedia("a1");

    expect(result.status).toBe("enriched");
    expect(mocks.getIntroExtract).toHaveBeenCalledTimes(1); // no hay artículo en inglés
    expect(state.updates[0]).toMatchObject({
      photoLicense: "CC BY-SA 4.0",
      photoAuthor: "Carolina Marlene Gatica Molina",
      photoFile: "Kuervos del Sur.jpg",
      wikimediaSyncedAt: expect.any(Date),
    });
    expect(upsertFor("es")).toMatchObject({
      description: "Grupo de música de Chile",
      summaryTitle: "Kuervos del Sur",
      summaryUrl: expect.stringContaining("es.wikipedia.org"),
      placeLabel: "Curicó, Chile",
    });
    expect(upsertFor("en")).toMatchObject({ description: "Chilean musical group", summary: null, placeLabel: "Curicó, Chile" });
  });

  it("persona: lugar de nacimiento traducido con su país", async () => {
    state.current = artistRow({ type: "person", wikidataId: "Q2836528" });
    mocks.getEntities.mockImplementation(entitiesFrom(monLaferteEntity, monLafertePlace, monLaferteCountry));
    mocks.getIntroExtract.mockImplementation(async (lang: string) => (lang === "es" ? monLaferteExtractEs : monLaferteExtractEn));
    mocks.getImageInfo.mockResolvedValue(monLaferteImage);

    await enrichArtistFromWikimedia("a1");

    expect(upsertFor("es")?.placeLabel).toBe("Viña del Mar, Chile");
    expect(upsertFor("en")?.summaryUrl).toContain("en.wikipedia.org");
  });

  it("si Wikidata no responde, propaga el error y no escribe nada", async () => {
    mocks.getEntities.mockRejectedValue(new Error("Wikimedia caído"));
    await expect(enrichArtistFromWikimedia("a1")).rejects.toThrow("Wikimedia caído");
    expect(state.updates).toHaveLength(0);
    expect(state.upserts).toHaveLength(0);
  });

  it("si falla solo la foto, conserva la anterior y escribe los textos", async () => {
    mocks.getImageInfo.mockRejectedValue(new Error("Commons caído"));
    const result = await enrichArtistFromWikimedia("a1");

    expect(result.status === "enriched" && result.failures).toEqual(["foto"]);
    expect(state.updates[0]).toEqual({ wikimediaSyncedAt: expect.any(Date) }); // sin columnas de foto
    expect(upsertFor("es")?.summaryTitle).toBe("Kuervos del Sur");
  });

  it("si falla un resumen, no pisa el guardado de ese idioma", async () => {
    mocks.getIntroExtract.mockRejectedValue(new Error("Wikipedia caída"));
    await enrichArtistFromWikimedia("a1");
    expect(upsertFor("es")).not.toHaveProperty("summary");
    expect(upsertFor("es")).toHaveProperty("description");
  });

  it("una foto borrada de Commons se quita", async () => {
    mocks.getImageInfo.mockResolvedValue({ query: { pages: [{ title: "File:Kuervos del Sur.jpg", missing: true }] } });
    await enrichArtistFromWikimedia("a1");
    expect(state.updates[0]).toMatchObject({ photoUrl: null, photoFile: null, photoLicense: null });
  });

  it("con la foto retirada a pedido no consulta Commons ni asigna foto", async () => {
    state.current = artistRow({ photoBlockedAt: new Date() });
    await enrichArtistFromWikimedia("a1");
    expect(mocks.getImageInfo).not.toHaveBeenCalled();
    expect(state.updates[0]).toMatchObject({ photoUrl: null });
  });

  it("sin relación wikidata no consulta Wikimedia y marca el artista como sincronizado", async () => {
    state.current = artistRow({ wikidataId: null });
    expect(await enrichArtistFromWikimedia("a1")).toEqual({ status: "no-wikidata" });
    expect(mocks.getEntities).not.toHaveBeenCalled();
    expect(state.updates).toEqual([{ wikimediaSyncedAt: expect.any(Date) }]);
  });

  it("al día (menos de 30 días) se omite, salvo que se fuerce", async () => {
    state.current = artistRow({ wikimediaSyncedAt: new Date() });
    expect(await enrichArtistFromWikimedia("a1")).toEqual({ status: "skipped" });
    expect((await enrichArtistFromWikimedia("a1", { force: true })).status).toBe("enriched");
  });

  it("en simulación no escribe", async () => {
    await enrichArtistFromWikimedia("a1", { dryRun: true });
    expect(state.updates).toHaveLength(0);
    expect(state.upserts).toHaveLength(0);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// El cliente de Wikimedia está simulado; la base es un mock que registra lo que se escribe (el SQL
// real y el candado los cubre el smoke test contra Postgres).
const state = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  upserts: [] as { values: Record<string, unknown>; set: Record<string, unknown> }[],
  locks: 0,
}));
const mocks = vi.hoisted(() => ({ getEntities: vi.fn(), getIntroExtract: vi.fn() }));

vi.mock("@/db", () => {
  const tx = {
    execute: async () => {
      state.locks++;
    },
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

const { enrichGenreFromWikimedia, isAboutStale } = await import("./about-sync");

const extract = (title: string, text: string, lang: string) => ({
  query: { pages: [{ title, extract: text, fullurl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}` }] },
});
const entity = (sitelinks: Record<string, string>) => ({
  entities: {
    Q1: {
      id: "Q1",
      descriptions: { es: { language: "es", value: "género musical" }, en: { language: "en", value: "music genre" } },
      sitelinks: Object.fromEntries(Object.entries(sitelinks).map(([site, title]) => [site, { site, title }])),
    },
  },
});
const genreRow = (over: Record<string, unknown> = {}) => ({ id: "g1", kind: "style", wikidataId: "Q1", wikimediaSyncedAt: null, ...over });
const upsert = (locale: string) => state.upserts.find((u) => u.values.locale === locale)?.values;

beforeEach(() => {
  vi.clearAllMocks();
  state.current = genreRow();
  state.updates = [];
  state.upserts = [];
  state.locks = 0;
  mocks.getEntities.mockResolvedValue(entity({ eswiki: "Shoegaze", enwiki: "Shoegaze (music)" }));
  mocks.getIntroExtract.mockImplementation(async (lang: string, title: string) => extract(title, `Texto de ${title}.`, lang));
});

describe("isAboutStale", () => {
  it("nunca sincronizado o con más de 30 días está vencido", () => {
    const now = Date.parse("2026-10-05T00:00:00Z");
    expect(isAboutStale(null, now)).toBe(true);
    expect(isAboutStale(new Date("2026-08-01T00:00:00Z"), now)).toBe(true);
    expect(isAboutStale(new Date("2026-09-25T00:00:00Z"), now)).toBe(false);
  });
});

describe("enrichGenreFromWikimedia", () => {
  it("guarda descripción, resumen, título y URL de cada idioma y marca la sincronización", async () => {
    const result = await enrichGenreFromWikimedia("g1");
    expect(result.status).toBe("enriched");
    expect(upsert("es")).toMatchObject({
      genreId: "g1",
      description: "género musical",
      summary: "Texto de Shoegaze.",
      summaryTitle: "Shoegaze",
      summaryUrl: "https://es.wikipedia.org/wiki/Shoegaze",
    });
    expect(upsert("en")).toMatchObject({ summary: "Texto de Shoegaze (music).", summaryTitle: "Shoegaze (music)" });
    expect(state.updates.at(-1)).toHaveProperty("wikimediaSyncedAt");
    expect(state.locks).toBe(1);
  });

  it("se llega a Wikidata solo por el wikidata_id del género", async () => {
    await enrichGenreFromWikimedia("g1");
    expect(mocks.getEntities).toHaveBeenCalledWith(["Q1"], ["descriptions", "sitelinks"]);
  });

  it("sin artículo en español no inventa ni traduce: ese idioma queda sin resumen", async () => {
    mocks.getEntities.mockResolvedValue(entity({ enwiki: "Shoegaze (music)" }));
    await enrichGenreFromWikimedia("g1");
    expect(upsert("es")).toMatchObject({ description: "género musical", summary: null, summaryTitle: null, summaryUrl: null });
    expect(upsert("en")?.summary).toBe("Texto de Shoegaze (music).");
    expect(mocks.getIntroExtract).toHaveBeenCalledTimes(1);
  });

  it("sin wikidata_id se marca como sincronizado sin hacer ninguna request a Wikimedia", async () => {
    state.current = genreRow({ wikidataId: null });
    await expect(enrichGenreFromWikimedia("g1")).resolves.toEqual({ status: "no-wikidata" });
    expect(mocks.getEntities).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(1);
    expect(state.upserts).toHaveLength(0);
  });

  it("un texto vigente (10 días) no hace ninguna request; --force sí", async () => {
    state.current = genreRow({ wikimediaSyncedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) });
    await expect(enrichGenreFromWikimedia("g1")).resolves.toEqual({ status: "skipped" });
    expect(mocks.getEntities).not.toHaveBeenCalled();
    await expect(enrichGenreFromWikimedia("g1", { force: true })).resolves.toMatchObject({ status: "enriched" });
  });

  it("solo sincroniza géneros de estilo", async () => {
    state.current = genreRow({ kind: "descriptor" });
    await expect(enrichGenreFromWikimedia("g1")).resolves.toEqual({ status: "skipped" });
    state.current = null;
    await expect(enrichGenreFromWikimedia("g1")).resolves.toEqual({ status: "skipped" });
  });

  it("si Wikidata cae no escribe nada, ni la marca, y propaga el error", async () => {
    mocks.getEntities.mockRejectedValue(new Error("Wikimedia respondió 503"));
    await expect(enrichGenreFromWikimedia("g1")).rejects.toThrow("503");
    expect(state.upserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("si falla el extracto de un idioma conserva el texto anterior de ese idioma y guarda el otro", async () => {
    mocks.getIntroExtract.mockImplementation(async (lang: string, title: string) => {
      if (lang === "es") throw new Error("timeout");
      return extract(title, "Texto en inglés.", lang);
    });
    const result = await enrichGenreFromWikimedia("g1");
    expect(result).toMatchObject({ status: "enriched", failures: ["resumen es"] });
    // El patch de español no toca las columnas del resumen: el upsert no las sobrescribe.
    expect(upsert("es")).not.toHaveProperty("summary");
    expect(upsert("es")).toMatchObject({ description: "género musical" });
    expect(upsert("en")?.summary).toBe("Texto en inglés.");
    expect(state.updates.at(-1)).toHaveProperty("wikimediaSyncedAt");
  });

  it("una entidad que ya no existe conserva el texto, marca la sincronización y no reintenta en cada visita", async () => {
    mocks.getEntities.mockResolvedValue({ entities: { Q1: { id: "Q1", missing: "" } } });
    await expect(enrichGenreFromWikimedia("g1")).resolves.toEqual({ status: "missing-entity" });
    expect(state.upserts).toHaveLength(0);
    expect(state.updates).toHaveLength(1);
  });

  it("--dry-run informa sin escribir", async () => {
    const result = await enrichGenreFromWikimedia("g1", { dryRun: true });
    expect(result.status).toBe("enriched");
    expect(state.upserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("un artículo sin extracto deja el resumen en null (no queda texto huérfano)", async () => {
    mocks.getIntroExtract.mockResolvedValue({ query: { pages: [{ title: "Shoegaze", missing: true }] } });
    await enrichGenreFromWikimedia("g1");
    expect(upsert("es")).toMatchObject({ summary: null, summaryTitle: null, summaryUrl: null });
  });
});

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/db", () => ({ db: { execute: mocks.execute } }));

const { COVERS_PER_FAMILY, FAMILY_COVERS_TTL_MS, assignCovers, listFamilyCovers, resetFamilyCoversCache } = await import("./family-covers");

const rows = [
  { familyKey: "rock", albumId: "a-r1", cover: "r1" },
  { familyKey: "rock", albumId: "a-r2", cover: "r2" },
  { familyKey: "jazz", albumId: "a-j1", cover: "j1" },
];

beforeEach(() => {
  resetFamilyCoversCache();
  mocks.execute.mockReset();
  mocks.execute.mockResolvedValue(rows);
});

describe("listFamilyCovers", () => {
  it("agrupa las carátulas por familia, en el orden en que llegan", async () => {
    const covers = await listFamilyCovers();

    expect(covers.get("rock")).toEqual(["r1", "r2"]);
    expect(covers.get("jazz")).toEqual(["j1"]);
    expect(covers.has("latin")).toBe(false);
  });

  it("es una sola consulta con ventana, solo de estudio con carátula, con la señal de calidad y tope por familia", async () => {
    await listFamilyCovers();

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const query = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0] as SQL);
    const text = query.sql.replace(/\s+/g, " ");
    expect(text).toContain("row_number() over (partition by m.family_key order by");
    expect(text).toContain('"release_group"."category" = \'studio\'');
    expect(text).toContain('"release_group"."cover_thumb_url" is not null');
    // La señal de las colecciones del día 0 y el desempate por id, para que sea estable.
    expect(text).toContain("award_nomination");
    expect(text).toContain("release_calendar_entry");
    expect(text).toMatch(/"release_group"."id" asc/);
    // Lee más candidatos que carátulas por familia, para poder repartirlos sin repetir.
    expect(query.params.some((param) => typeof param === "number" && param > COVERS_PER_FAMILY)).toBe(true);
  });

  it("reutiliza el resultado dentro del tiempo de vigencia y lo vuelve a leer al vencer", async () => {
    await listFamilyCovers(1_000);
    await listFamilyCovers(1_000 + FAMILY_COVERS_TTL_MS - 1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);

    await listFamilyCovers(1_000 + FAMILY_COVERS_TTL_MS);
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("las visitas simultáneas comparten una sola consulta", async () => {
    const [a, b, c] = await Promise.all([listFamilyCovers(), listFamilyCovers(), listFamilyCovers()]);

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("un error no se cachea: devuelve el mapa vacío y reintenta en la próxima visita", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.execute.mockRejectedValueOnce(new Error("boom"));

    const failed = await listFamilyCovers();
    expect(failed.size).toBe(0);

    const recovered = await listFamilyCovers();
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(recovered.get("rock")).toEqual(["r1", "r2"]);
  });
});

describe("assignCovers", () => {
  const c = (familyKey: string, n: number) => ({ familyKey, albumId: `a${n}`, cover: `c${n}` });

  it("no repite un disco en dos familias: cada una toma sus mejores que nadie haya tomado", () => {
    // `pop` tiene pocos candidatos y se atiende primero; `rock` cede los que ya tomó `pop`.
    const result = assignCovers([
      c("rock", 1), c("rock", 2), c("rock", 3), c("rock", 4), c("rock", 5), c("rock", 6),
      c("pop", 1), c("pop", 2), c("pop", 7),
    ]);

    expect(result.get("pop")).toEqual(["c1", "c2", "c7"]);
    expect(result.get("rock")).toEqual(["c3", "c4", "c5", "c6"]);
    const all = [...result.values()].flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it("toma como mucho COVERS_PER_FAMILY por familia", () => {
    const many = Array.from({ length: 10 }, (_, i) => c("rock", i));

    expect(assignCovers(many).get("rock")).toHaveLength(COVERS_PER_FAMILY);
  });

  it("completa con discos ya usados si a la familia le quedaría menos de dos propios", () => {
    const result = assignCovers([c("rock", 1), c("rock", 2), c("jazz", 1), c("jazz", 2)]);

    // Ambas tienen los mismos dos candidatos: a una le toca todo y a la otra se le completan hasta dos.
    expect(result.get("jazz")).toEqual(["c1", "c2"]);
    expect(result.get("rock")).toEqual(["c1", "c2"]);
  });

  it("una familia con un solo candidato conserva ese y no inventa otros", () => {
    expect(assignCovers([c("latin", 9)]).get("latin")).toEqual(["c9"]);
  });

  it("es determinista: el mismo resultado sin importar cuántas veces se calcule", () => {
    const input = [c("rock", 1), c("rock", 2), c("pop", 1), c("pop", 3), c("jazz", 2), c("jazz", 4)];

    expect([...assignCovers(input).entries()]).toEqual([...assignCovers(input).entries()]);
  });
});

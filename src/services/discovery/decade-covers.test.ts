import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/db", () => ({ db: { execute: mocks.execute } }));

const { COVERS_PER_DECADE, DECADE_COVERS_TTL_MS, listDecadeCovers, resetDecadeCoversCache } = await import("./decade-covers");

const rows = [
  { decade: 1990, cover: "n1" },
  { decade: 1990, cover: "n2" },
  { decade: "1980", cover: "o1" },
];

beforeEach(() => {
  resetDecadeCoversCache();
  mocks.execute.mockReset();
  mocks.execute.mockResolvedValue(rows);
});

describe("listDecadeCovers", () => {
  it("agrupa las carátulas por década, en el orden en que llegan, aunque la década llegue como texto", async () => {
    const covers = await listDecadeCovers();

    expect(covers.get(1990)).toEqual(["n1", "n2"]);
    expect(covers.get(1980)).toEqual(["o1"]);
    expect(covers.has(1970)).toBe(false);
  });

  it("es una sola consulta con ventana, solo de estudio con carátula y con año, con la señal de calidad y tope por década", async () => {
    await listDecadeCovers();

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    const query = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0] as SQL);
    const text = query.sql.replace(/\s+/g, " ");
    expect(text).toContain('row_number() over ( partition by floor("release_group"."first_release_year" / 10) order by');
    expect(text).toContain('"release_group"."category" = \'studio\'');
    expect(text).toContain('"release_group"."cover_thumb_url" is not null');
    expect(text).toContain('"release_group"."first_release_year" is not null');
    // La señal de las colecciones del día 0 y el desempate por id, para que sea estable.
    expect(text).toContain("award_nomination");
    expect(text).toContain("release_calendar_entry");
    expect(text).toMatch(/"release_group"."id" asc/);
    expect(query.params).toContain(COVERS_PER_DECADE);
    expect(COVERS_PER_DECADE).toBe(4);
  });

  it("reutiliza el resultado dentro del tiempo de vigencia y lo vuelve a leer al vencer", async () => {
    await listDecadeCovers(1_000);
    await listDecadeCovers(1_000 + DECADE_COVERS_TTL_MS - 1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);

    await listDecadeCovers(1_000 + DECADE_COVERS_TTL_MS);
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("las visitas simultáneas comparten una sola consulta", async () => {
    const [a, b] = await Promise.all([listDecadeCovers(), listDecadeCovers()]);

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("un error no se cachea: devuelve el mapa vacío y reintenta en la próxima visita", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.execute.mockRejectedValueOnce(new Error("boom"));

    const failed = await listDecadeCovers();
    expect(failed.size).toBe(0);

    const recovered = await listDecadeCovers();
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(recovered.get(1990)).toEqual(["n1", "n2"]);
  });
});

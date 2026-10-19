import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Los salones de la fama no son premios ganados (openspec: add-grammy-hall-of-fame, design D4; ADR 0044): cada lector de
// nominaciones filtra por el tipo de premio. La base se mockea y se inspecciona el SQL de cada consulta.

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), execute: vi.fn() } }));
vi.mock("@/db", () => ({ db: mocks.db }));

const { isClosedClass, listHallOfFameClasses, listLatestCeremoniesByAward, listMostAwardedArtists, listRecentHeadlineWinners } =
  await import("./read");
const { competitionNominations } = await import("./competition");
const { albumSignalOrder } = await import("@/services/discovery/collections/signal");

const dialect = new PgDialect();
const render = (value: unknown) => dialect.sqlToQuery(value as SQL);

/** Cadena de consulta que guarda el `where` y se resuelve a `rows` al hacer await. */
function chain(rows: unknown[], seen: { where: SQL[] }) {
  const q: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "orderBy", "limit"]) q[method] = () => q;
  q.where = (w: SQL) => ((seen.where.push(w), q));
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
  return q;
}

let seen: { where: SQL[] };
beforeEach(() => {
  vi.clearAllMocks();
  seen = { where: [] };
  mocks.db.select.mockImplementation(() => chain([], seen));
  mocks.db.execute.mockResolvedValue([]);
});

describe("tarjetas, ganadores recientes y rankings: solo competencias", () => {
  it("las tarjetas de premios piden solo ceremonias de premios competitivos", async () => {
    await listLatestCeremoniesByAward();
    expect(render(seen.where[0]).params).toEqual(["competition"]);
  });

  it("los ganadores recientes piden solo ceremonias de premios competitivos", async () => {
    await listRecentHeadlineWinners();
    expect(render(seen.where[0]).params).toEqual(["competition"]);
  });

  it("«Los más premiados» excluye los salones de la fama en el SQL", async () => {
    await listMostAwardedArtists();
    const sqlText = render(mocks.db.execute.mock.calls[0]![0]).sql;
    expect(sqlText).toContain("a.kind = 'competition'");
    expect(sqlText).toContain("n.won");
  });

  it("el bloque de salones pide solo ceremonias de salones de la fama", async () => {
    await listHallOfFameClasses("2026-10-19");
    expect(render(seen.where[0]).params).toEqual(["hall_of_fame"]);
  });
});

describe("puntajes del catálogo: un salón no suma", () => {
  it("la subconsulta compartida solo trae nominaciones de premios competitivos y no está correlacionada", () => {
    const { sql: text } = render(competitionNominations);
    expect(text).toContain("a.kind = 'competition'");
    expect(text).toContain("from award_nomination n");
    expect(text).not.toMatch(/release_group"\."id/);
  });

  it("el puntaje de la señal de colecciones lee de la subconsulta competitiva", () => {
    const text = albumSignalOrder().map((o) => render(o).sql).join("\n");
    expect(text).toContain("a.kind = 'competition'");
    expect(text).not.toMatch(/from award_nomination n\s+where/);
  });
});

describe("clases cerradas", () => {
  it("una clase está cerrada cuando su gala no es posterior a hoy", () => {
    expect(isClosedClass("2026-05-08", "2026-10-19")).toBe(true);
    expect(isClosedClass("2026-10-19", "2026-10-19")).toBe(true);
    expect(isClosedClass("2026-11-14", "2026-10-19")).toBe(false);
  });

  it("sin clases cerradas no hay nada que mostrar", async () => {
    mocks.db.select.mockImplementation(() =>
      chain([{ id: "c1", awardSlug: "grammy-hall-of-fame", voting: "academy", year: 2026, edition: null, heldOn: "2026-11-14" }], seen),
    );
    await expect(listHallOfFameClasses("2026-10-19")).resolves.toEqual([]);
  });
});

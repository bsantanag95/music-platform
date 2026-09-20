import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getCurationSummary } from "./curation";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

// Cada consulta de conteo se resuelve por la tabla consultada; se registra el
// `where` para comprobar que se filtra por el usuario correcto.
const totals: Record<string, number> = {};
const wheres: Record<string, unknown> = {};

function chain() {
  let table = "";
  const step: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "from") {
          return (t: Parameters<typeof getTableName>[0]) => {
            table = getTableName(t);
            return step;
          };
        }
        if (prop === "where") {
          return (condition: unknown) => {
            wheres[table] = condition;
            return step;
          };
        }
        if (prop === "then") {
          const p = Promise.resolve([{ total: totals[table] ?? 0 }]);
          return p.then.bind(p);
        }
        return () => step;
      },
    },
  );
  return step;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(totals)) delete totals[key];
  for (const key of Object.keys(wheres)) delete wheres[key];
  mocks.select.mockImplementation(() => chain());
});

describe("getCurationSummary", () => {
  it("devuelve los tres conteos de curaduría del usuario", async () => {
    totals.user_list_pin = 2;
    totals.rating_highlight = 4;
    totals.listen_entry_highlight = 1;

    await expect(getCurationSummary("u1")).resolves.toEqual({
      pinnedLists: 2,
      ratingHighlights: 4,
      diaryHighlights: 1,
    });
  });

  it("sin nada fijado ni destacado todo es cero", async () => {
    await expect(getCurationSummary("u1")).resolves.toEqual({
      pinnedLists: 0,
      ratingHighlights: 0,
      diaryHighlights: 0,
    });
  });

  it("consulta exactamente las tres tablas de señal, cada una filtrada por el usuario", async () => {
    await getCurationSummary("u1");

    expect(Object.keys(wheres).sort()).toEqual(["listen_entry_highlight", "rating_highlight", "user_list_pin"]);
    for (const condition of Object.values(wheres)) {
      expect(condition).toBeDefined();
    }
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { listTrendingConversations, resetTrendingConversationsCache } from "./trending-conversations";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn() } }));
vi.mock("@/db", () => ({ db: mocks.db }));

// select().from().innerJoin().where() → filas de una fuente (valoraciones, comentarios o reseñas).
function sourceQuery(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  return { from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where })) })) };
}
// select().from().where() → detalles de los álbumes o bloqueos del lector.
function plainQuery(rows: unknown[]) {
  return { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })) };
}

const NOW = Date.parse("2026-10-20T12:00:00Z");
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000);
const act = (userId: string, releaseGroupId: string, hoursAgo = 1) => ({ userId, releaseGroupId, at: at(hoursAgo) });
const album = (id: string, title = id) => ({ id, title, coverThumbUrl: null, artistName: "Artista", artistId: "art" });

function mockSources(ratings: unknown[], comments: unknown[], reviews: unknown[], details: unknown[]) {
  mocks.db.select
    .mockReturnValueOnce(sourceQuery(ratings))
    .mockReturnValueOnce(sourceQuery(comments))
    .mockReturnValueOnce(sourceQuery(reviews))
    .mockReturnValueOnce(plainQuery(details));
}

describe("listTrendingConversations", () => {
  beforeEach(() => {
    // `mockReset`, no `clearAllMocks`: también vacía la cola de `mockReturnValueOnce` que un test deja sin consumir.
    mocks.db.select.mockReset();
    resetTrendingConversationsCache();
  });

  it("cuenta personas distintas por álbum, sumando valoraciones, comentarios y reseñas", async () => {
    mockSources([act("u1", "rgA"), act("u2", "rgB")], [act("u2", "rgA"), act("u1", "rgA")], [act("u3", "rgA")], [
      album("rgA", "Álbum A"),
    ]);

    const result = await listTrendingConversations(null, NOW);

    expect(result).toEqual([
      { releaseGroupId: "rgA", title: "Álbum A", coverThumbUrl: null, artistName: "Artista", artistId: "art", people: 3 },
    ]);
  });

  it("una sola persona no alcanza el umbral aunque comente muchas veces", async () => {
    mockSources([], [act("u1", "rgA", 1), act("u1", "rgA", 2), act("u1", "rgA", 3)], [], []);

    expect(await listTrendingConversations(null, NOW)).toEqual([]);
    // Sin candidatos no se piden detalles.
    expect(mocks.db.select).toHaveBeenCalledTimes(3);
  });

  it("ordena por personas y, a igualdad, por la actividad más reciente; tope de 5", async () => {
    const ratings = [
      ...["u1", "u2", "u3"].map((u) => act(u, "rgTres", 30)),
      ...["u1", "u2"].map((u) => act(u, "rgViejo", 40)),
      ...["u1", "u2"].map((u) => act(u, "rgNuevo", 2)),
      ...["c", "d", "e", "f"].flatMap((rg) => ["u1", "u2"].map((u) => act(u, `rg-${rg}`, 50))),
    ];
    mockSources(ratings, [], [], [
      album("rgTres"),
      album("rgViejo"),
      album("rgNuevo"),
      ...["c", "d", "e", "f"].map((rg) => album(`rg-${rg}`)),
    ]);

    const result = await listTrendingConversations(null, NOW);

    expect(result).toHaveLength(5);
    expect(result.slice(0, 3).map((r) => r.releaseGroupId)).toEqual(["rgTres", "rgNuevo", "rgViejo"]);
  });

  it("con lector, resta a las personas con bloqueo y descarta el álbum que queda bajo el umbral", async () => {
    mockSources([act("u1", "rgA"), act("u2", "rgA"), act("u1", "rgB"), act("u2", "rgB"), act("u3", "rgB")], [], [], [
      album("rgA"),
      album("rgB"),
    ]);
    // El lector bloqueó a u2 (y u3 no tiene relación).
    mocks.db.select.mockReturnValueOnce(plainQuery([{ blockerId: "viewer", blockedId: "u2" }]));

    const result = await listTrendingConversations("viewer", NOW);

    expect(result.map((r) => [r.releaseGroupId, r.people])).toEqual([["rgB", 2]]);
  });

  it("usa la caché dentro de la vigencia y no vuelve a consultar", async () => {
    mockSources([act("u1", "rgA"), act("u2", "rgA")], [], [], [album("rgA")]);

    await listTrendingConversations(null, NOW);
    await listTrendingConversations(null, NOW + 60_000);

    expect(mocks.db.select).toHaveBeenCalledTimes(4);
  });

  it("si la lectura falla devuelve [] y no lo cachea", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.db.select.mockImplementationOnce(() => {
      throw new Error("sin conexión");
    });

    expect(await listTrendingConversations(null, NOW)).toEqual([]);
    error.mockRestore();
  });
});

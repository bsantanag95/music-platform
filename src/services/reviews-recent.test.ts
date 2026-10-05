import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";

const state = vi.hoisted(() => ({ rows: [] as unknown[], where: null as SQL | null, limit: 0 }));

vi.mock("@/db", () => {
  const builder: Record<string, unknown> = {
    from: () => builder,
    innerJoin: () => builder,
    leftJoin: () => builder,
    where: (arg: SQL) => {
      state.where = arg;
      return builder;
    },
    orderBy: () => builder,
    limit: (n: number) => {
      state.limit = n;
      return Promise.resolve(state.rows);
    },
  };
  return { db: { select: () => builder } };
});

const { listRecentAlbumReviews } = await import("./reviews");
const dialect = new PgDialect();

const row = (over: Record<string, unknown> = {}) => ({
  id: "r1",
  title: null,
  body: "Gran disco",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  user: { id: "u1", username: "ana", displayName: "Ana", deactivatedAt: null },
  stars: "4.5",
  detailedScore: null,
  albumId: "rg1",
  albumTitle: "Souvlaki",
  albumCover: null,
  ...over,
});

beforeEach(() => {
  state.rows = [];
  state.where = null;
  state.limit = 0;
});

describe("listRecentAlbumReviews", () => {
  it("serializa la reseña con su álbum y las estrellas del autor", async () => {
    state.rows = [row()];
    const [item] = await listRecentAlbumReviews(sql`1 = 1`, null, 5);
    expect(state.limit).toBe(5);
    expect(item?.album).toEqual({ id: "rg1", title: "Souvlaki", coverThumbUrl: null });
    expect(item?.review.rating).toEqual({ stars: 4.5, detailedScore: null });
    expect(item?.review.user.username).toBe("ana");
  });

  it("enmascara al autor de una cuenta desactivada", async () => {
    state.rows = [row({ user: { id: "u1", username: "ana", displayName: "Ana", deactivatedAt: new Date() } })];
    const [item] = await listRecentAlbumReviews(sql`1 = 1`, null, 5);
    expect(item?.review.user.deactivated).toBe(true);
    expect(item?.review.user.username).not.toBe("ana");
  });

  it("solo reseñas visibles y, sin lector, sin condición de bloqueo", async () => {
    await listRecentAlbumReviews(sql`1 = 1`, null, 5);
    const { sql: text, params } = dialect.sqlToQuery(state.where as SQL);
    expect(params).toContain("visible");
    expect(text).not.toContain("user_block");
  });

  it("con lector excluye autores bloqueados en cualquier dirección", async () => {
    await listRecentAlbumReviews(sql`1 = 1`, "reader-1", 5);
    const { sql: text, params } = dialect.sqlToQuery(state.where as SQL);
    expect(text).toContain("user_block");
    expect(text).toMatch(/blocker_id.*blocked_id.*or.*blocker_id.*blocked_id/s);
    expect(params.filter((p) => p === "reader-1").length).toBeGreaterThanOrEqual(2);
  });
});

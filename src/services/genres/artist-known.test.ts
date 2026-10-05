import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { artistFollowingCondition, artistKnownCondition } from "./artist-known";

const dialect = new PgDialect();
const render = (condition: ReturnType<typeof artistKnownCondition>) => dialect.sqlToQuery(condition!);
/** Colapsa espacios y saltos de línea para comparar fragmentos de SQL. */
const flat = (text: string) => text.replace(/\s+/g, " ");

describe("artistKnownCondition", () => {
  it("sin lector no hay condición: nadie conoce a nadie", () => {
    expect(artistKnownCondition(null)).toBeNull();
    expect(artistFollowingCondition(null)).toBeNull();
  });

  it("cubre seguir, valorar, escuchar, favoritos y pendientes, tanto del artista como de un álbum suyo", () => {
    const text = flat(render(artistKnownCondition("u1")).sql);
    expect(text).toContain("FROM artist_follow f");
    for (const table of ["rating", "listen_entry", "favorite", "want_to_listen_entry"]) {
      // Una señal directa sobre el artista y otra a través de un álbum donde figura acreditado.
      expect(text).toContain(`FROM ${table} s WHERE s.user_id = $`);
      expect(text).toContain(`s.artist_id = a.id)`);
      expect(text).toContain(`FROM ${table} s JOIN credit kc ON kc.release_group_id = s.release_group_id`);
    }
  });

  it("incluye los créditos de invitado: no filtra por rol", () => {
    expect(render(artistKnownCondition("u1")).sql).not.toContain("role");
  });

  it("todas las señales son del lector pedido y van como parámetro", () => {
    const { sql: text, params } = render(artistKnownCondition("reader-1"));
    expect(params.length).toBe(9);
    expect(params.every((p) => p === "reader-1")).toBe(true);
    expect(text).not.toContain("reader-1");
  });

  it("acepta otra referencia al artista", () => {
    const text = render(artistKnownCondition("u1", sql`x.artist_id`)).sql;
    expect(text).toContain("= x.artist_id");
    expect(text).not.toContain("= a.id");
  });
});

describe("artistFollowingCondition", () => {
  it("solo mira artist_follow", () => {
    const { sql: text, params } = dialect.sqlToQuery(artistFollowingCondition("u1")!);
    expect(text).toContain("artist_follow");
    expect(text).not.toContain("rating");
    expect(params).toEqual(["u1"]);
  });
});

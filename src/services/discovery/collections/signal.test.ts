import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { sql, type SQL } from "drizzle-orm";
import { albumSignalOrder, coverResolvableCondition } from "./signal";

const render = (fragment: SQL) => new PgDialect().sqlToQuery(fragment).sql.replace(/\s+/g, " ");

describe("albumSignalOrder", () => {
  it("ordena comunidad → premio → calendario → carátula → id", () => {
    const parts = albumSignalOrder().map(render);
    expect(parts).toHaveLength(5);
    expect(parts[0]).toContain("from rating");
    expect(parts[0]).toContain("having count(*) >=");
    expect(parts[0]).toContain("desc nulls last");
    expect(parts[1]).toContain("from award_nomination");
    expect(parts[1]).toContain("anchor_release_group_id");
    expect(parts[2]).toContain("from release_calendar_entry");
    expect(parts[2]).toContain("asc nulls last");
    expect(parts[3]).toContain('"release_group"."cover_thumb_url" is not null');
    expect(parts[4]).toContain('"release_group"."id"');
  });

  it("los desempates propios van antes del id final", () => {
    const parts = albumSignalOrder(sql`first_release_date desc`).map(render);
    expect(parts).toHaveLength(6);
    expect(parts[4]).toBe("first_release_date desc");
    expect(parts[5]).toContain('"release_group"."id"');
  });

  it("la comunidad exige el umbral de valoraciones como parámetro", () => {
    const query = new PgDialect().sqlToQuery(albumSignalOrder()[0]!);
    expect(query.params).toContain(3);
  });
});

describe("coverResolvableCondition", () => {
  it("acepta carátula resuelta o sin comprobar, y descarta retiradas y negativos recientes", () => {
    const text = render(coverResolvableCondition());
    expect(text).toContain('"release_group"."cover_thumb_url" is not null');
    expect(text).toContain('"release_group"."cover_blocked_at" is null');
    expect(text).toContain('"release_group"."cover_checked_at" is null');
    expect(text).toContain("make_interval");
  });
});

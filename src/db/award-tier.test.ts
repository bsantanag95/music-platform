import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { AWARD_CATEGORY_TIERS, awardTierRank, awardTierRankSql } from "./schema";

describe("orden de niveles de categoría de premios", () => {
  it("el rango es la posición en la tupla: general, álbum, género", () => {
    expect(AWARD_CATEGORY_TIERS.map(awardTierRank)).toEqual([0, 1, 2]);
    expect(awardTierRank("general")).toBeLessThan(awardTierRank("album"));
    expect(awardTierRank("album")).toBeLessThan(awardTierRank("genre"));
  });

  it("la expresión SQL se genera de la misma tupla y da el mismo rango a cada nivel", () => {
    const query = new PgDialect().sqlToQuery(awardTierRankSql(sql`cat.tier`));
    expect(query.sql).toContain("case cat.tier");
    // Parámetros en pares (nivel, rango), en el orden de la tupla.
    expect(query.params).toEqual(AWARD_CATEGORY_TIERS.flatMap((tier) => [tier, awardTierRank(tier)]));
  });
});

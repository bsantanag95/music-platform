// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateItems,
  formatHits,
  matchesGlob,
  parseAddedLines,
  parseNameStatus,
  parseReviewMd,
  type ChangedFile,
} from "./review";

const reviewMd = readFileSync(join(import.meta.dirname, "../../../REVIEW.md"), "utf8");
const items = parseReviewMd(reviewMd);
const file = (path: string, kind: ChangedFile["kind"] = "M", added: string[] = []): ChangedFile => ({ path, kind, added });
const hitIds = (changes: ChangedFile[]) => evaluateItems(items, changes).map((h) => h.item.id);
const hit = (changes: ChangedFile[], id: string) => evaluateItems(items, changes).find((h) => h.item.id === id);

describe("matchesGlob", () => {
  it("soporta *, ** y rutas con corchetes", () => {
    expect(matchesGlob("drizzle/0100_x.sql", "drizzle/*.sql")).toBe(true);
    expect(matchesGlob("drizzle/sub/0100_x.sql", "drizzle/*.sql")).toBe(false);
    expect(matchesGlob("src/a/b/c.ts", "src/**/*.ts")).toBe(true);
    expect(matchesGlob("src/c.ts", "src/**/*.ts")).toBe(true);
    expect(matchesGlob("src/app/[locale]/page.tsx", "src/app/**/page.tsx")).toBe(true);
    expect(matchesGlob("src/db/schema.ts", "src/db/schema.ts")).toBe(true);
    expect(matchesGlob("src/db/schemaXts", "src/db/schema.ts")).toBe(false);
  });
});

describe("parseReviewMd (REVIEW.md real)", () => {
  it("carga todos los ítems con disparador, check y origen", () => {
    expect(items.map((i) => i.id)).toEqual(["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10"]);
    for (const item of items) {
      expect(item.paths.length).toBeGreaterThan(0);
      expect(item.check).not.toBe("");
      expect(item.origin).not.toBe("");
    }
  });
});

describe("parseReviewMd: formato", () => {
  it("une las líneas de continuación de un campo", () => {
    const parsed = parseReviewMd(
      "### X1 — Prueba\n- **Rutas:** `a/*.ts`\n- **Check:** primera línea\n  segunda línea\n- **Origen:** cita\n",
    );
    expect(parsed[0]?.check).toBe("primera línea segunda línea");
    expect(parsed[0]?.origin).toBe("cita");
  });
});

describe("evaluateItems con los ítems iniciales", () => {
  it("R01: esquema sin migración nueva ni doc falla; con ambas solo se revisa", () => {
    const sinNada = hit([file("src/db/schema.ts")], "R01");
    expect(sinNada?.status).toBe("falla");
    expect(sinNada?.unmet).toEqual(["drizzle/*.sql@A", "docs/03-data/sql-model.md"]);
    const completo = hit(
      [file("src/db/schema.ts"), file("drizzle/0100_nueva.sql", "A"), file("docs/03-data/sql-model.md")],
      "R01",
    );
    expect(completo?.status).toBe("revisar");
  });
  it("R01: editar un .sql existente no cuenta como migración nueva", () => {
    const h = hit([file("src/db/schema.ts"), file("drizzle/0050_x.sql", "M"), file("docs/03-data/sql-model.md")], "R01");
    expect(h?.unmet).toEqual(["drizzle/*.sql@A"]);
  });
  it("R02/R03: textos en un solo idioma", () => {
    expect(hit([file("messages/es/info.json")], "R02")?.status).toBe("falla");
    expect(hit([file("messages/es/diary.json"), file("messages/en/diary.json")], "R02")?.status).toBe("revisar");
    expect(hitIds([file("messages/en/diary.json")])).toContain("R03");
  });
  it("R04: texto legal sin fecha", () => {
    const h = hit([file("messages/es/legal.json"), file("messages/en/legal.json")], "R04");
    expect(h?.status).toBe("falla");
    expect(h?.unmet).toEqual(["src/lib/info-pages.ts"]);
  });
  it("R05: solo si una línea añadida pasa un Date a sql", () => {
    expect(hitIds([file("src/services/a.ts", "M", ["const x = 1;"])])).not.toContain("R05");
    expect(hitIds([file("src/services/a.ts", "M", ["await db.execute(sql`select ${new Date()}`)"])])).toContain("R05");
    expect(hitIds([file("src/services/a.ts", "M", ["sql`where d > ${createdDate}`"])])).toContain("R05");
  });
  it("R05: los archivos de test se excluyen", () => {
    expect(hitIds([file("src/services/a.test.ts", "M", ["await db.execute(sql`select ${new Date()}`)"])])).not.toContain("R05");
  });
  it("R06: CHECK con IN solo en migraciones nuevas", () => {
    const check = ["ALTER TABLE t ADD CONSTRAINT c CHECK (kind IN ('a','b'));"];
    expect(hitIds([file("drizzle/0100_x.sql", "A", check)])).toContain("R06");
    expect(hitIds([file("drizzle/0100_x.sql", "A", ["CREATE TABLE t ();"])])).not.toContain("R06");
  });
  it("R07: firma vieja de params", () => {
    expect(hitIds([file("src/app/api/x/[id]/route.ts", "M", ["{ params }: { params: { id: string } }"])])).toContain("R07");
    expect(
      hitIds([file("src/app/api/x/[id]/route.ts", "M", ["{ params }: { params: Promise<{ id: string }> }"])]),
    ).not.toContain("R07");
  });
  it("R08: cookie nueva exige tabla en ambos idiomas", () => {
    expect(hit([file("src/lib/a.ts", "M", ['document.cookie = "x=1"'])], "R08")?.status).toBe("falla");
  });
  it("R09: editar o borrar un .sql aplicado falla siempre; crear uno no", () => {
    expect(hit([file("drizzle/0050_x.sql", "M")], "R09")?.status).toBe("falla");
    expect(hit([file("drizzle/0050_x.sql", "D")], "R09")?.status).toBe("falla");
    expect(hitIds([file("drizzle/0100_x.sql", "A")])).not.toContain("R09");
  });
  it("R10: smoke test nuevo", () => {
    expect(hitIds([file("scripts/smoke-test-nuevo.ts", "A")])).toContain("R10");
    expect(hitIds([file("scripts/smoke-test-nuevo.ts", "M")])).not.toContain("R10");
  });
  it("un diff sin coincidencias no dispara nada", () => {
    expect(evaluateItems(items, [file("docs/README.md"), file("src/components/a.tsx", "M", ["const x = 1"])])).toEqual([]);
    expect(formatHits([])).toContain("ningún disparador");
  });
  it("el reporte explica el porqué y cita el origen", () => {
    const text = formatHits(evaluateItems(items, [file("drizzle/0050_x.sql", "M")]));
    expect(text).toContain("[FALLA] R09");
    expect(text).toContain("Por qué importa");
    expect(text).toContain("AGENTS.md");
  });
});

describe("lectura de diffs", () => {
  it("parseNameStatus maneja A/M/D y renombrados", () => {
    const files = parseNameStatus("A\ta.ts\nM\tb.ts\nD\tc.ts\nR100\told.ts\tnew.ts\n");
    expect(files.map((f) => [f.kind, f.path])).toEqual([
      ["A", "a.ts"],
      ["M", "b.ts"],
      ["D", "c.ts"],
      ["R", "new.ts"],
    ]);
  });
  it("parseAddedLines devuelve solo las líneas añadidas por archivo", () => {
    const diff = [
      "diff --git a/x.ts b/x.ts",
      "--- a/x.ts",
      "+++ b/x.ts",
      "@@ -1 +1,2 @@",
      "-viejo",
      "+nuevo",
      "+otro",
      "diff --git a/y.ts b/y.ts",
      "--- a/y.ts",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-borrado",
    ].join("\n");
    const m = parseAddedLines(diff);
    expect(m.get("x.ts")).toEqual(["nuevo", "otro"]);
    expect(m.has("y.ts")).toBe(false);
  });
});

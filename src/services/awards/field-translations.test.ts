import { describe, expect, it } from "vitest";
import en from "../../../messages/en/awards.json";
import es from "../../../messages/es/awards.json";
import { readAllAwards } from "./curation-files";

// Cada campo que usan las categorías de nivel `genre` se muestra como subtítulo en la página de la ceremonia: si le
// falta el nombre en un idioma, saldría la clave cruda. Se hace cumplir aquí y no con una nota en la documentación
// (openspec: expand-grammy-categories, design D3).

describe("campos de categorías de premios", () => {
  const { awards } = readAllAwards();
  const used = [...new Set(awards.flatMap((a) => a.categories.categories.flatMap((c) => (c.field ? [c.field] : []))))];

  it("hay al menos un campo en uso", () => {
    expect(used.length).toBeGreaterThan(0);
  });

  it.each(used)("el campo %s tiene nombre en español e inglés", (field) => {
    const esFields = es.fields as Record<string, string>;
    const enFields = en.fields as Record<string, string>;
    expect(esFields[field]?.trim(), `falta messages/es/awards.json › fields.${field}`).toBeTruthy();
    expect(enFields[field]?.trim(), `falta messages/en/awards.json › fields.${field}`).toBeTruthy();
  });
});

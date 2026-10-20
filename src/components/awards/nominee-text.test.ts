import { describe, expect, it } from "vitest";
import { splitNomineeText } from "./nominee-text";
import { typeCoverInitial, typeCoverTone } from "./TypeCover";

describe("splitNomineeText", () => {
  it("parte el texto curado en título y artista", () => {
    expect(splitNomineeText("Rumor Has It — Reba McEntire", null)).toEqual({ title: "Rumor Has It", artist: "Reba McEntire" });
    expect(splitNomineeText("Chicago (Original Cast Album) — Original Broadway Cast", null)).toEqual({
      title: "Chicago (Original Cast Album)",
      artist: "Original Broadway Cast",
    });
  });

  it("con crédito curado lo usa como artista y deja el texto entero", () => {
    expect(splitNomineeText("Speech", "Someone")).toEqual({ title: "Speech", artist: "Someone" });
  });

  it("sin separador, o con un lado vacío, el texto entero es el título", () => {
    expect(splitNomineeText("Olivia Dean", null)).toEqual({ title: "Olivia Dean", artist: null });
    expect(splitNomineeText(" — Alguien", null)).toEqual({ title: " — Alguien", artist: null });
  });
});

describe("portada tipográfica", () => {
  it("usa la primera letra o número del título, saltando comillas y signos", () => {
    expect(typeCoverInitial("¿Y ahora qué +?")).toBe("Y");
    expect(typeCoverInitial("“Weird Al”")).toBe("W");
    expect(typeCoverInitial("1989")).toBe("1");
    expect(typeCoverInitial("!!!")).toBe("℗");
  });

  it("da siempre el mismo tono al mismo título", () => {
    expect(typeCoverTone("Texas Flood")).toBe(typeCoverTone("Texas Flood"));
  });
});

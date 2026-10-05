import { describe, expect, it } from "vitest";
import { pickAboutText, splitAboutText } from "./about-text";

const sentence = (n: number) => `Esta es la oración número ${n}, que tiene el largo suficiente para rellenar el párrafo de prueba.`;
const long = Array.from({ length: 12 }, (_, i) => sentence(i + 1)).join(" ");

describe("splitAboutText", () => {
  it("un primer párrafo corto va entero y los demás párrafos quedan como resto", () => {
    const { excerpt, rest } = splitAboutText("Primer párrafo corto.\nSegundo párrafo.\nTercero.");
    expect(excerpt).toBe("Primer párrafo corto.");
    expect(rest).toBe("Segundo párrafo.\n\nTercero.");
  });

  it("un texto de un solo párrafo corto no tiene resto", () => {
    expect(splitAboutText("Solo esto.")).toEqual({ excerpt: "Solo esto.", rest: null });
  });

  it("un párrafo largo se corta en el último límite de oración que cabe en 600 caracteres", () => {
    const { excerpt, rest } = splitAboutText(long);
    expect(excerpt.length).toBeLessThanOrEqual(600);
    expect(excerpt.length).toBeGreaterThan(200);
    expect(excerpt.endsWith(".")).toBe(true);
    expect(excerpt.endsWith("…")).toBe(false);
    // Nada se pierde: excerpt + resto reconstruyen el texto (salvo el espacio del corte).
    expect(`${excerpt} ${rest}`).toBe(long);
  });

  it("sin límite de oración utilizable corta en un espacio y agrega puntos suspensivos", () => {
    const noSentences = Array.from({ length: 200 }, () => "palabra").join(" ");
    const { excerpt, rest } = splitAboutText(noSentences);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(601);
    expect(rest).not.toBeNull();
  });

  it("el resto incluye los párrafos siguientes después del corte", () => {
    const { rest } = splitAboutText(`${long}\nOtro párrafo final.`);
    expect(rest?.endsWith("Otro párrafo final.")).toBe(true);
  });

  it("texto vacío no rompe", () => {
    expect(splitAboutText("  \n ")).toEqual({ excerpt: "", rest: null });
  });
});

describe("pickAboutText", () => {
  const es = { locale: "es", summary: "Texto en español.", summaryTitle: "Shoegaze", summaryUrl: "https://es.wikipedia.org/wiki/Shoegaze" };
  const en = { locale: "en", summary: "Text in English.", summaryTitle: "Shoegaze (music)", summaryUrl: "https://en.wikipedia.org/wiki/Shoegaze" };

  it("usa el idioma de la ruta sin marcar respaldo", () => {
    expect(pickAboutText([en, es], "es")).toMatchObject({ language: "es", isFallback: false, title: "Shoegaze", excerpt: "Texto en español." });
  });

  it("sin texto en el idioma pedido usa el otro e indica que es respaldo", () => {
    expect(pickAboutText([en], "es")).toMatchObject({ language: "en", isFallback: true, url: en.summaryUrl });
  });

  it("una fila solo con descripción (sin resumen) no cuenta como texto", () => {
    const onlyDescription = { locale: "es", summary: null, summaryTitle: null, summaryUrl: null };
    expect(pickAboutText([onlyDescription], "es")).toBeNull();
    expect(pickAboutText([onlyDescription, en], "es")).toMatchObject({ language: "en", isFallback: true });
  });

  it("un resumen sin URL se ignora: la atribución es obligatoria", () => {
    expect(pickAboutText([{ ...es, summaryUrl: null }], "es")).toBeNull();
  });

  it("sin filas devuelve null", () => {
    expect(pickAboutText([], "es")).toBeNull();
  });

  it("conserva el título del artículo, que puede diferir del nombre del género", () => {
    const musicaCulta = { ...es, summaryTitle: "Música culta" };
    expect(pickAboutText([musicaCulta], "es")?.title).toBe("Música culta");
  });
});

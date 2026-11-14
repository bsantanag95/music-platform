import { describe, expect, it } from "vitest";
import { INFO_PAGES } from "@/lib/info-pages";
import { TERMS_VERSION, termsAcceptanceValues } from "./terms";

describe("versión de los Términos", () => {
  it("es una fecha ISO y es la que se ve al pie de /terms", () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(INFO_PAGES.terms.updated).toBe(TERMS_VERSION);
  });

  it("las columnas de aceptación llevan fecha, versión y modo juntos", () => {
    expect(termsAcceptanceValues("notice")).toEqual({
      termsAcceptedAt: expect.any(Date),
      termsVersion: TERMS_VERSION,
      termsAcceptedVia: "notice",
    });
  });
});

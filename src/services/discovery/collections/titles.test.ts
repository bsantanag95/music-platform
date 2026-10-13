import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import catalogEn from "../../../../messages/en/catalog.json";
import catalogEs from "../../../../messages/es/catalog.json";
import { COLLECTION_TEMPLATES } from "./templates";
import {
  FAMILY_NAMES,
  PLATFORM_OWNER_NAME,
  TITLE_PATTERNS,
  collectionTitle,
  titleLocaleOf,
} from "./titles";

const FALLBACK = "Título guardado";

describe("collectionTitle", () => {
  it("las plantillas sin período muestran el título del idioma", () => {
    expect(collectionTitle("new-releases", "evergreen", "es", FALLBACK)).toBe("Novedades esenciales");
    expect(collectionTitle("new-releases", "evergreen", "en", FALLBACK)).toBe("Essential new releases");
    expect(collectionTitle("upcoming", "evergreen", "en", FALLBACK)).toBe("What's coming");
    expect(collectionTitle("one-per-decade", "evergreen", "es", FALLBACK)).toBe("Un disco por década");
  });

  it("el premio lleva su nombre y el año de la ceremonia", () => {
    expect(collectionTitle("grammy-winners", "grammy-2025", "es", FALLBACK)).toBe("Ganadores del Grammy 2025");
    expect(collectionTitle("grammy-winners", "grammy-2025", "en", FALLBACK)).toBe("Grammy winners 2025");
  });

  it("un premio sin nombre conocido usa su clave", () => {
    expect(collectionTitle("grammy-winners", "brit-awards-2026", "en", FALLBACK)).toBe("brit-awards winners 2026");
  });

  it("los períodos mensuales llevan el mes en el idioma y el año", () => {
    expect(collectionTitle("anniversaries", "2026-10", "es", FALLBACK)).toBe("Cumplen años en octubre de 2026");
    expect(collectionTitle("anniversaries", "2026-10", "en", FALLBACK)).toBe("Anniversaries in October 2026");
    expect(collectionTitle("most-reviewed-month", "2026-03", "es", FALLBACK)).toBe("Lo más reseñado de marzo de 2026");
    expect(collectionTitle("most-reviewed-month", "2026-03", "en", FALLBACK)).toBe("Most reviewed in March 2026");
  });

  it("el archivo distingue el mismo mes de años distintos", () => {
    expect(collectionTitle("anniversaries", "2025-10", "en", FALLBACK)).not.toBe(
      collectionTitle("anniversaries", "2026-10", "en", FALLBACK),
    );
  });

  it("el trimestre lleva su número y el año", () => {
    expect(collectionTitle("top-rated-quarter", "2026-Q4", "es", FALLBACK)).toBe("Mejor valorados del 4.º trimestre de 2026");
    expect(collectionTitle("top-rated-quarter", "2026-Q4", "en", FALLBACK)).toBe("Top rated of Q4 2026");
  });

  it("el género de la semana nombra la familia en el idioma", () => {
    expect(collectionTitle("genre-spotlight", "2026-W43-folk", "es", FALLBACK)).toBe("Para entrar a Folk y cantautor");
    expect(collectionTitle("genre-spotlight", "2026-W43-folk", "en", FALLBACK)).toBe("Getting into Folk & singer-songwriter");
    expect(collectionTitle("genre-spotlight", "2026-W07-hip-hop", "en", FALLBACK)).toBe("Getting into Hip hop");
  });

  it("una familia desconocida usa su clave", () => {
    expect(collectionTitle("genre-spotlight", "2026-W43-nueva", "es", FALLBACK)).toBe("Para entrar a nueva");
  });

  it("una plantilla desconocida o ausente cae al título guardado", () => {
    expect(collectionTitle("ya-no-existe", "evergreen", "en", FALLBACK)).toBe(FALLBACK);
    expect(collectionTitle(null, null, "en", FALLBACK)).toBe(FALLBACK);
    expect(collectionTitle(undefined, "2026-10", "en", FALLBACK)).toBe(FALLBACK);
  });

  it("un período ilegible cae al título guardado, sin lanzar", () => {
    expect(collectionTitle("anniversaries", "octubre", "en", FALLBACK)).toBe(FALLBACK);
    expect(collectionTitle("anniversaries", "2026-13", "en", FALLBACK)).toBe(FALLBACK);
    expect(collectionTitle("top-rated-quarter", "2026-Q5", "es", FALLBACK)).toBe(FALLBACK);
    expect(collectionTitle("genre-spotlight", "2026-W43", "es", FALLBACK)).toBe(FALLBACK);
    expect(collectionTitle("grammy-winners", "2025", "es", FALLBACK)).toBe(FALLBACK);
  });

  it("un locale distinto de en usa español", () => {
    expect(titleLocaleOf("en-US")).toBe("en");
    expect(titleLocaleOf("EN")).toBe("en");
    expect(titleLocaleOf("es")).toBe("es");
    expect(titleLocaleOf("fr")).toBe("es");
  });
});

describe("catálogo de títulos", () => {
  it("cada plantilla del registro tiene título en los dos idiomas", () => {
    for (const template of COLLECTION_TEMPLATES) {
      expect(TITLE_PATTERNS.es[template.key], `es:${template.key}`).toBeDefined();
      expect(TITLE_PATTERNS.en[template.key], `en:${template.key}`).toBeDefined();
    }
  });

  it("ambos idiomas tienen las mismas plantillas y los mismos marcadores", () => {
    expect(Object.keys(TITLE_PATTERNS.en).sort()).toEqual(Object.keys(TITLE_PATTERNS.es).sort());
    const markers = (pattern: string) => [...pattern.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(TITLE_PATTERNS.es)) {
      expect(markers(TITLE_PATTERNS.en[key]!), key).toEqual(markers(TITLE_PATTERNS.es[key]!));
    }
  });

  it("los nombres de familia coinciden con los mensajes de la app", () => {
    expect(FAMILY_NAMES.es).toEqual(catalogEs.genres.families);
    expect(FAMILY_NAMES.en).toEqual(catalogEn.genres.families);
  });

  it("el dueño de una colección generada es la plataforma, en cada idioma", () => {
    expect(PLATFORM_OWNER_NAME).toEqual({ es: "Exploración", en: "Explore" });
  });
});

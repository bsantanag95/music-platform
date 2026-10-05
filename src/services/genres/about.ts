import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { genreLocalizedText } from "@/db/schema";
import { pickAboutText, type AboutLocale, type GenreAbout } from "./about-text";

export { splitAboutText, pickAboutText, type AboutLocale, type GenreAbout } from "./about-text";

// Lectura de "Sobre el género" (openspec: redesign-genre-page, capability `genre-about`, ADR 0027):
// el texto guardado de Wikipedia en el idioma de la ruta o, si falta, en el otro. La página nunca
// espera a Wikimedia: lo que no está sincronizado todavía simplemente no se muestra.

export const getGenreAbout = cache(async (genreId: string, locale: AboutLocale): Promise<GenreAbout | null> => {
  const rows = await db
    .select({
      locale: genreLocalizedText.locale,
      summary: genreLocalizedText.summary,
      summaryTitle: genreLocalizedText.summaryTitle,
      summaryUrl: genreLocalizedText.summaryUrl,
    })
    .from(genreLocalizedText)
    .where(eq(genreLocalizedText.genreId, genreId));
  return pickAboutText(rows, locale);
});

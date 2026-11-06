import { createTranslator } from "next-intl";
import esAwards from "../../../messages/es/awards.json";
import enAwards from "../../../messages/en/awards.json";
import esCatalog from "../../../messages/es/catalog.json";
import enCatalog from "../../../messages/en/catalog.json";
import esCommon from "../../../messages/es/common.json";
import enCommon from "../../../messages/en/common.json";
import esDiary from "../../../messages/es/diary.json";
import enDiary from "../../../messages/en/diary.json";
import esShare from "../../../messages/es/share.json";
import enShare from "../../../messages/en/share.json";
import type { ShareLocale } from "@/lib/share/kinds";

// Textos de las imágenes y los metadatos de compartir (spec share-images, "Idioma de la imagen"). La ruta de
// imágenes vive fuera de `[locale]`, así que el idioma llega como parámetro y el traductor se arma con los
// mismos catálogos que la interfaz (patrón del resumen semanal por email).

const MESSAGES = {
  es: { share: esShare, awards: esAwards, common: esCommon, diary: esDiary },
  en: { share: enShare, awards: enAwards, common: enCommon, diary: enDiary },
} as const;

export function shareTranslator(locale: ShareLocale) {
  return createTranslator({ locale, messages: MESSAGES[locale] });
}

export type ShareTranslator = ReturnType<typeof shareTranslator>;

/** Nombre de la app tal como lo muestra la interfaz (`common.appName`); lo usa la firma de la marca. */
export function shareAppName(locale: ShareLocale): string {
  return MESSAGES[locale].common.appName;
}

/** Nombre de una familia de géneros por idioma (`catalog.genres.families.<familia>`). */
export function shareFamilyName(locale: ShareLocale, family: string): string {
  const names: Record<string, string> = (locale === "en" ? enCatalog : esCatalog).genres.families;
  return names[family] ?? family;
}

/** Nombre de un premio por idioma (`awards.names.<slug>`), o el slug si no tiene traducción. */
export function shareAwardName(locale: ShareLocale, slug: string): string {
  const names: Record<string, string> = MESSAGES[locale].awards.names;
  return names[slug] ?? slug;
}

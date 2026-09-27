import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artistLink, artistLocalizedText, type ArtistLocalizedTextRow, type ArtistRow } from "@/db/schema";
import type { ArtistLinkKind } from "../musicbrainz/artist-profile-mappers";

// Lectura del perfil de artista para la página (openspec: enrich-artist-profile). Solo lee
// la base: la actualización corre en segundo plano (artist-profile-sync.ts).

export type ProfileLocale = "es" | "en";

export interface ArtistProfile {
  /** Ficha de MusicBrainz; en una persona, inicio y fin son nacimiento y muerte. */
  facts: {
    country: string | null;
    beginAreaName: string | null;
    lifeBegin: string | null;
    lifeEnd: string | null;
    lifeEnded: boolean | null;
  };
  links: { kind: ArtistLinkKind; url: string }[];
  /** Descripción corta de Wikidata en el idioma pedido; sin respaldo a otro idioma. */
  description: string | null;
  /** Resumen de Wikipedia en el idioma pedido o, si no hay, en el otro (con su idioma). */
  summary: { text: string; title: string | null; url: string; language: ProfileLocale } | null;
  /** Lugar de nacimiento o formación traducido; respaldo: el lugar de inicio de MusicBrainz. */
  placeLabel: string | null;
  /** Foto de Commons con el crédito que exige su licencia. */
  photo: { url: string; author: string | null; license: string; licenseUrl: string | null; sourceUrl: string } | null;
}

function otherLocale(locale: ProfileLocale): ProfileLocale {
  return locale === "es" ? "en" : "es";
}

/** Arma el perfil desde filas ya leídas (función pura, testeable sin base). */
export function buildArtistProfile(
  row: ArtistRow,
  links: { kind: string; url: string }[],
  texts: ArtistLocalizedTextRow[],
  locale: ProfileLocale,
): ArtistProfile {
  const own = texts.find((t) => t.locale === locale);
  const other = texts.find((t) => t.locale === otherLocale(locale));
  const summarySource = own?.summary && own.summaryUrl ? own : other?.summary && other.summaryUrl ? other : null;

  return {
    facts: {
      country: row.country,
      beginAreaName: row.beginAreaName,
      lifeBegin: row.lifeBegin,
      lifeEnd: row.lifeEnd,
      lifeEnded: row.lifeEnded,
    },
    links: links
      .filter((link): link is { kind: ArtistLinkKind; url: string } => ["official", "bandcamp", "streaming"].includes(link.kind))
      .map(({ kind, url }) => ({ kind, url })),
    description: own?.description ?? null,
    summary: summarySource
      ? {
          text: summarySource.summary!,
          title: summarySource.summaryTitle,
          url: summarySource.summaryUrl!,
          language: summarySource.locale as ProfileLocale,
        }
      : null,
    placeLabel: own?.placeLabel ?? other?.placeLabel ?? row.beginAreaName,
    photo:
      row.photoUrl && row.photoLicense && row.photoSourceUrl && !row.photoBlockedAt
        ? {
            url: row.photoUrl,
            author: row.photoAuthor,
            license: row.photoLicense,
            licenseUrl: row.photoLicenseUrl,
            sourceUrl: row.photoSourceUrl,
          }
        : null,
  };
}

export async function getArtistProfile(row: ArtistRow, locale: ProfileLocale): Promise<ArtistProfile> {
  const [links, texts] = await Promise.all([
    db
      .select({ kind: artistLink.kind, url: artistLink.url })
      .from(artistLink)
      .where(eq(artistLink.artistId, row.id))
      .orderBy(asc(artistLink.position)),
    db.select().from(artistLocalizedText).where(eq(artistLocalizedText.artistId, row.id)),
  ]);
  return buildArtistProfile(row, links, texts, locale);
}

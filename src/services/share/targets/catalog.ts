import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, rating, recording, release, releaseGroup, track } from "@/db/schema";
import { albumHref, artistHref, localeHref, songHref } from "@/lib/catalog-links";
import type { ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { summarizeRatings } from "@/services/catalog/album-community-shared";
import { resolvePrimaryArtists, slugArtistName } from "@/services/catalog/primary-artists";
import { monogramLetter } from "@/components/social/monogram";
import { shareTranslator } from "../i18n";
import type { ShareTarget } from "../types";
import { catalogCredits, clipDescription, downloadName, joinParts, releaseYear } from "./shared";

// Objetivos de catálogo: álbum, canción y artista (spec share-images, "Imágenes por objeto"). Solo leen la base
// propia: un objeto que no está en el catálogo local no se comparte (imagen genérica), nunca dispara una ingesta.

type AlbumCategory = "studio" | "single_ep" | "compilation" | "live_other";

function isCategory(value: string): value is AlbumCategory {
  return value === "studio" || value === "single_ep" || value === "compilation" || value === "live_other";
}

export async function loadAlbumTarget(id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const [row] = await db
    .select({
      id: releaseGroup.id,
      title: releaseGroup.title,
      category: releaseGroup.category,
      coverThumbUrl: releaseGroup.coverThumbUrl,
      firstReleaseYear: releaseGroup.firstReleaseYear,
      firstReleaseDate: releaseGroup.firstReleaseDate,
    })
    .from(releaseGroup)
    .where(eq(releaseGroup.id, id))
    .limit(1);
  if (!row) return null;

  const [primary, aggregate] = await Promise.all([
    resolvePrimaryArtists({ releaseGroupIds: [id] }).then((maps) => maps.releaseGroups.get(id) ?? null),
    db
      .select({
        count: sql<number>`count(*)::int`,
        averageStars: sql<number | null>`avg(${rating.stars})::float`,
        averageDetailedScore: sql<number | null>`avg(${rating.detailedScore})::float`,
      })
      .from(rating)
      .where(eq(rating.releaseGroupId, id))
      .then((rows) => rows[0] ?? { count: 0, averageStars: null, averageDetailedScore: null }),
  ]);

  const t = shareTranslator(locale);
  // Mismo umbral que la cabecera del álbum: media solo con 5 o más valoraciones.
  const summary = summarizeRatings(aggregate, []);
  const artistName = primary?.name ?? null;
  const year = releaseYear(row);
  const categoryLabel = isCategory(row.category) ? t(`share.image.category.${row.category}`) : null;

  return {
    kind: "album",
    ref: row.id,
    locale,
    canonicalPath: localeHref(locale, albumHref(slugArtistName(primary), row.title, row.id)),
    title: artistName ? `${row.title} · ${artistName}` : row.title,
    description: clipDescription(joinParts(artistName, categoryLabel, year)),
    imageAlt: joinParts(row.title, artistName, year),
    downloadName: downloadName(artistName, row.title),
    card: {
      kicker: t("share.image.kicker.album"),
      title: row.title,
      subtitle: artistName,
      meta: [categoryLabel, year].filter((part): part is string => Boolean(part)),
      media: { type: "cover", cover: { url: row.coverThumbUrl, fallbackTitle: row.title, fallbackSubtitle: artistName } },
      community:
        summary.averageStars !== null ? { averageStars: Number(summary.averageStars.toFixed(1)), count: summary.count } : null,
      credits: catalogCredits(t, true),
    },
  };
}

export async function loadSongTarget(id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const [row] = await db.select({ id: recording.id, title: recording.title }).from(recording).where(eq(recording.id, id)).limit(1);
  if (!row) return null;

  const [primary, album] = await Promise.all([
    resolvePrimaryArtists({ recordingIds: [id] }).then((maps) => maps.recordings.get(id) ?? null),
    // El disco que la representa: el primero con carátula y, entre ellos, el más antiguo.
    db
      .select({ title: releaseGroup.title, coverThumbUrl: releaseGroup.coverThumbUrl })
      .from(track)
      .innerJoin(release, eq(release.id, track.releaseId))
      .innerJoin(releaseGroup, eq(releaseGroup.id, release.releaseGroupId))
      .where(and(eq(track.recordingId, id), isNull(releaseGroup.discographyUnlistedAt)))
      .orderBy(
        sql`${releaseGroup.coverThumbUrl} IS NULL`,
        sql`${releaseGroup.category} <> 'studio'`,
        sql`${releaseGroup.firstReleaseYear} ASC NULLS LAST`,
        asc(releaseGroup.id),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const t = shareTranslator(locale);
  const artistName = primary?.name ?? null;
  const fromAlbum = album ? t("share.image.fromAlbum", { album: album.title }) : null;

  return {
    kind: "song",
    ref: row.id,
    locale,
    canonicalPath: localeHref(locale, songHref(slugArtistName(primary), row.title, row.id)),
    title: artistName ? `${row.title} · ${artistName}` : row.title,
    description: clipDescription(joinParts(artistName, fromAlbum)),
    imageAlt: joinParts(row.title, artistName, fromAlbum),
    downloadName: downloadName(artistName, row.title),
    card: {
      kicker: t("share.image.kicker.song"),
      title: row.title,
      subtitle: artistName,
      meta: fromAlbum ? [fromAlbum] : [],
      media: {
        type: "cover",
        cover: { url: album?.coverThumbUrl ?? null, fallbackTitle: album?.title ?? row.title, fallbackSubtitle: artistName },
      },
      community: null,
      credits: catalogCredits(t, album?.coverThumbUrl != null),
    },
  };
}

/** Años de actividad para mostrar: "1981–", "1970–1980". `null` si no se conoce el inicio. */
function activeYears(lifeBegin: string | null, lifeEnd: string | null, lifeEnded: boolean | null): string | null {
  const begin = lifeBegin?.slice(0, 4);
  if (!begin) return null;
  const end = lifeEnd?.slice(0, 4);
  return end ? `${begin}–${end}` : lifeEnded ? begin : `${begin}–`;
}

export async function loadArtistTarget(id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const [row] = await db
    .select({
      id: artist.id,
      name: artist.name,
      type: artist.type,
      beginAreaName: artist.beginAreaName,
      lifeBegin: artist.lifeBegin,
      lifeEnd: artist.lifeEnd,
      lifeEnded: artist.lifeEnded,
      photoUrl: artist.photoUrl,
      photoAuthor: artist.photoAuthor,
      photoLicense: artist.photoLicense,
    })
    .from(artist)
    .where(eq(artist.id, id))
    .limit(1);
  if (!row) return null;

  const t = shareTranslator(locale);
  const typeKey = row.type === "person" || row.type === "group" || row.type === "various" ? row.type : "unknown";
  const typeLabel = t(`share.image.artistType.${typeKey}`);
  const years = activeYears(row.lifeBegin, row.lifeEnd, row.lifeEnded);
  // La foto solo con crédito completo (ADR 0021): sin autor o licencia no se dibuja.
  const photoUrl = row.photoUrl && row.photoAuthor && row.photoLicense ? row.photoUrl : null;
  const credits = [t("share.image.credits.catalog")];
  if (photoUrl) credits.unshift(t("share.image.credits.photo", { author: row.photoAuthor!, license: row.photoLicense! }));

  return {
    kind: "artist",
    ref: row.id,
    locale,
    canonicalPath: localeHref(locale, artistHref(row.name, row.id)),
    title: row.name,
    description: clipDescription(joinParts(typeLabel, row.beginAreaName, years)),
    imageAlt: joinParts(row.name, typeLabel),
    downloadName: downloadName(row.name),
    card: {
      kicker: t("share.image.kicker.artist"),
      title: row.name,
      subtitle: typeLabel,
      meta: [row.beginAreaName, years].filter((part): part is string => Boolean(part)),
      media: { type: "photo", photo: { url: photoUrl, fallbackTitle: row.name, fallbackSubtitle: null }, monogram: monogramLetter(row.name) },
      community: null,
      credits,
    },
  };
}

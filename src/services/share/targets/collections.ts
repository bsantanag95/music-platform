import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { rating, releaseGroup, releaseGroupEffectiveGenre, userListItem } from "@/db/schema";
import { ceremonyHref, hallClassHref, hallOfFameIndexHref, awardsIndexHref } from "@/components/awards/award-links";
import { collectionHref, genreHref, localeHref } from "@/lib/catalog-links";
import type { ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { getCeremonyPage, type AlbumRef } from "@/services/awards/read";
import { resolvePrimaryArtists } from "@/services/catalog/primary-artists";
import { findGeneratedCollection } from "@/services/discovery/collections/generated";
import { collectionTitle } from "@/services/discovery/collections/titles";
import { findStyleGenreBySlug, genreDisplayName } from "@/services/genres/read";
import { genreLocaleOf } from "@/services/genres/names";
import { shareAwardName, shareTranslator, type ShareTranslator } from "../i18n";
import type { ShareImageRef, ShareTarget } from "../types";
import { catalogCredits, clipDescription, downloadName } from "./shared";

// Objetivos con mosaico de carátulas (género, ceremonia, clase de salón, colección) y los índices tipográficos
// (spec share-images, "Imágenes por objeto"; D6 y ADR 0049: hasta 4 miniaturas por imagen).

const MOSAIC_SIZE = 4;

function mosaicCredits(t: ShareTranslator, covers: ShareImageRef[]): string[] {
  return catalogCredits(t, covers.some((c) => c.url !== null));
}

export async function loadGenreTarget(slug: string, locale: ShareLocale): Promise<ShareTarget | null> {
  const row = await findStyleGenreBySlug(slug);
  if (!row) return null;
  const name = genreDisplayName(row, genreLocaleOf(locale));

  // Los discos de estudio con carátula más valorados del género (con herencia), estables por id.
  const albums = await db
    .select({ id: releaseGroup.id, title: releaseGroup.title, coverThumbUrl: releaseGroup.coverThumbUrl })
    .from(releaseGroupEffectiveGenre)
    .innerJoin(releaseGroup, eq(releaseGroup.id, releaseGroupEffectiveGenre.releaseGroupId))
    .where(
      and(
        eq(releaseGroupEffectiveGenre.genreId, row.id),
        eq(releaseGroup.category, "studio"),
        isNotNull(releaseGroup.coverThumbUrl),
        isNull(releaseGroup.discographyUnlistedAt),
      ),
    )
    .orderBy(
      desc(sql`(SELECT count(*) FROM ${rating} WHERE ${rating.releaseGroupId} = ${releaseGroup.id})`),
      desc(releaseGroupEffectiveGenre.score),
      asc(releaseGroup.id),
    )
    .limit(MOSAIC_SIZE);
  const artists = await resolvePrimaryArtists({ releaseGroupIds: albums.map((a) => a.id) });
  const covers: ShareImageRef[] = albums.map((a) => ({
    url: a.coverThumbUrl,
    fallbackTitle: a.title,
    fallbackSubtitle: artists.releaseGroups.get(a.id)?.name ?? null,
  }));

  const t = shareTranslator(locale);
  const description = t("share.image.descriptions.genre", { genre: name });
  return {
    kind: "genre",
    ref: row.slug,
    locale,
    canonicalPath: localeHref(locale, genreHref(row.slug)),
    title: name,
    description: clipDescription(description),
    imageAlt: name,
    downloadName: downloadName(name),
    card: {
      kicker: t("share.image.kicker.genre"),
      title: name,
      subtitle: null,
      meta: [],
      media: covers.length > 0 ? { type: "mosaic", covers } : { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, covers),
    },
  };
}

function albumCover(album: AlbumRef): ShareImageRef {
  return { url: album.cover.coverThumbUrl, fallbackTitle: album.title, fallbackSubtitle: album.artistName };
}

/** `<slug>:<año>` → partes, o `null` si no tiene esa forma. */
export function parseCeremonyRef(ref: string): { slug: string; year: number } | null {
  const match = /^([a-z0-9]+(?:-[a-z0-9]+)*):(\d{4})$/.exec(ref);
  return match ? { slug: match[1]!, year: Number(match[2]) } : null;
}

/** Ceremonia de un premio o clase de un salón: el mosaico son los primeros ganadores o incorporados con disco. */
export async function loadCeremonyTarget(
  ref: string,
  locale: ShareLocale,
  expected: "competition" | "hall_of_fame",
): Promise<ShareTarget | null> {
  const parsed = parseCeremonyRef(ref);
  if (!parsed) return null;
  const page = await getCeremonyPage(parsed.slug, parsed.year);
  if (!page || (page.kind === "hall_of_fame") !== (expected === "hall_of_fame")) return null;

  const covers: ShareImageRef[] = [];
  const seen = new Set<string>();
  for (const category of page.categories) {
    for (const nomination of category.nominations) {
      if (!nomination.won || covers.length >= MOSAIC_SIZE) continue;
      const subject = nomination.subject;
      const album = subject?.kind === "release_group" ? subject.album : subject?.kind === "recording" ? subject.anchor : null;
      if (!album || seen.has(album.id)) continue;
      seen.add(album.id);
      covers.push(albumCover(album));
    }
  }

  const t = shareTranslator(locale);
  const award = shareAwardName(locale, page.awardSlug);
  const hall = page.kind === "hall_of_fame";
  const title = hall
    ? t("awards.hall.classFull", { award, year: page.ceremony.year })
    : t("awards.ceremonyTitle", { award, year: page.ceremony.year });
  const href = hall ? hallClassHref(page.awardSlug, page.ceremony.year) : ceremonyHref(page.awardSlug, page.ceremony.year);

  return {
    kind: hall ? "hall_class" : "ceremony",
    ref: `${page.awardSlug}:${page.ceremony.year}`,
    locale,
    canonicalPath: localeHref(locale, href),
    title,
    description: clipDescription(t(hall ? "share.image.descriptions.hallClass" : "share.image.descriptions.ceremony", { title })),
    imageAlt: title,
    downloadName: downloadName(award, String(page.ceremony.year)),
    card: {
      kicker: t(hall ? "share.image.kicker.hall_class" : "share.image.kicker.ceremony"),
      title: award,
      subtitle: String(page.ceremony.year),
      meta: [],
      media: covers.length > 0 ? { type: "mosaic", covers } : { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, covers),
    },
  };
}

export async function loadCollectionTarget(id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const collection = await findGeneratedCollection(id);
  if (!collection) return null;
  const title = collectionTitle(collection.templateKey, collection.periodKey, locale, collection.storedTitle);

  const items = await db
    .select({ id: releaseGroup.id, title: releaseGroup.title, coverThumbUrl: releaseGroup.coverThumbUrl })
    .from(userListItem)
    .innerJoin(releaseGroup, eq(releaseGroup.id, userListItem.releaseGroupId))
    .where(eq(userListItem.listId, id))
    .orderBy(asc(userListItem.position), asc(userListItem.id))
    .limit(MOSAIC_SIZE);
  const artists = await resolvePrimaryArtists({ releaseGroupIds: items.map((i) => i.id) });
  const covers: ShareImageRef[] = items.map((item) => ({
    url: item.coverThumbUrl,
    fallbackTitle: item.title,
    fallbackSubtitle: artists.releaseGroups.get(item.id)?.name ?? null,
  }));

  const t = shareTranslator(locale);
  return {
    kind: "collection",
    ref: id,
    locale,
    canonicalPath: localeHref(locale, collectionHref(title, id)),
    title,
    description: clipDescription(t("share.image.descriptions.collection")),
    imageAlt: title,
    downloadName: downloadName(title),
    card: {
      kicker: t("share.image.kicker.collection"),
      title,
      subtitle: null,
      meta: [],
      media: covers.length > 0 ? { type: "mosaic", covers } : { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, covers),
    },
  };
}

/** Índices de premios, salones y colecciones: composición tipográfica, sin carátulas. */
export function loadIndexTarget(kind: "awards" | "halls" | "collections", locale: ShareLocale): ShareTarget {
  const t = shareTranslator(locale);
  const title = t(`share.image.kicker.${kind}`);
  const href = kind === "awards" ? awardsIndexHref() : kind === "halls" ? hallOfFameIndexHref() : "/explore/collections";
  return {
    kind,
    ref: "-",
    locale,
    canonicalPath: localeHref(locale, href),
    title,
    description: clipDescription(t(`share.image.descriptions.${kind}`)),
    imageAlt: title,
    downloadName: downloadName(title),
    card: {
      kicker: "",
      title,
      subtitle: t(`share.image.descriptions.${kind}`),
      meta: [],
      media: { type: "typographic" },
      community: null,
      credits: [],
    },
  };
}

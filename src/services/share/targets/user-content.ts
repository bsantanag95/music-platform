import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userList } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { listHref, localeHref, reviewHref } from "@/lib/catalog-links";
import type { ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { activeUserCondition } from "@/services/auth/account-status";
import { getUserCaminoDetail } from "@/services/camino/camino";
import { listProfileCollection } from "@/services/collection/collection";
import { generatedRefsFor } from "@/services/discovery/collections/generated";
import { getUserListDetail } from "@/services/lists/lists";
import { getTasteFingerprint } from "@/services/profiles/stats";
import { getReviewDetail } from "@/services/reviews";
import { getCommentPermalink } from "@/services/social";
import { getProfileByUsername } from "@/services/social/profiles";
import { audiencesForProfile } from "@/services/social/visibility";
import { shareFamilyName, shareTranslator } from "../i18n";
import type { ShareImageRef, ShareMedia, ShareTarget } from "../types";
import { loadAlbumTarget, loadArtistTarget, loadSongTarget } from "./catalog";
import { mosaicCredits } from "./collections";
import { loadProfileTargetByUsername, usernameOfAccount } from "./profile";
import { clipDescription, downloadName, joinParts } from "./shared";

// Objetivos de lo que publica una persona (spec share-images; openspec: add-share-user-actions-phase1). Cada uno
// lee con el mismo servicio que su página y `viewerId = null`, así que hereda sus reglas de visibilidad: lo que un
// anónimo no puede ver no tiene objetivo (imagen genérica). La firma es de quien escribió, no de quien comparte.

const QUOTE_MAX = 200;
const MOSAIC_SIZE = 4;

/** Lee como anónimo: el "no existe / no se puede ver" del servicio (`ApiError`) es no tener objetivo. */
async function ifVisible<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

/** Hasta 4 carátulas sin repetir, primero las que tienen imagen (spec: mosaico de hasta 4). */
function mosaicOf(items: Array<{ title: string; artistName: string | null; coverThumbUrl: string | null }>): ShareImageRef[] {
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    const key = item.coverThumbUrl ?? item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const withCover = unique.filter((item) => item.coverThumbUrl);
  return (withCover.length > 0 ? withCover : unique).slice(0, MOSAIC_SIZE).map((item) => ({
    url: item.coverThumbUrl,
    fallbackTitle: item.title,
    fallbackSubtitle: item.artistName,
  }));
}

export async function loadReviewTarget(id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const detail = await getReviewDetail(id);
  // La página enmascara al autor de una cuenta desactivada; compartir usa la imagen genérica.
  if (!detail || detail.review.user.deactivated || !detail.review.user.username) return null;
  const album = await loadAlbumTarget(detail.album.id, locale);
  if (!album) return null;

  const t = shareTranslator(locale);
  const { review } = detail;
  const username = review.user.username!;
  const handle = `@${username}`;
  const title = t("share.image.titles.review", { album: album.card.title, author: handle });
  return {
    kind: "review",
    ref: review.id,
    locale,
    canonicalPath: localeHref(locale, reviewHref(username, detail.album.title, review.id)),
    title,
    description: clipDescription(review.body),
    imageAlt: title,
    downloadName: downloadName(album.card.title, username),
    card: {
      kicker: t("share.image.kicker.review"),
      title: album.card.title,
      subtitle: album.card.subtitle,
      meta: [],
      media: album.card.media,
      community: null,
      credits: album.card.credits,
      quote: clipDescription(review.body, QUOTE_MAX),
      // Solo las estrellas: el puntaje detallado de una reseña lo ve únicamente su autor.
      stars: review.rating ? Number(review.rating.stars) : null,
      byline: handle,
    },
  };
}

/** Objetivo de un comentario raíz; la referencia de una respuesta da el de su raíz. */
export async function loadCommentTarget(id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const permalink = await getCommentPermalink(id, null);
  if (!permalink) return null;
  const { comment, author, object } = permalink;
  const load = { artist: loadArtistTarget, "release-group": loadAlbumTarget, recording: loadSongTarget }[object.type];
  const base = await load(object.id, locale);
  if (!base) return null;

  const t = shareTranslator(locale);
  const handle = `@${author.username}`;
  const title = t("share.image.titles.comment", { object: base.card.title, author: handle });
  return {
    kind: "comment",
    ref: comment.id,
    locale,
    canonicalPath: localeHref(locale, `/comment/${comment.id}`),
    title,
    description: clipDescription(comment.body),
    imageAlt: title,
    downloadName: downloadName(base.card.title, author.username),
    card: {
      kicker: t("share.image.kicker.comment"),
      title: base.card.title,
      subtitle: base.card.subtitle,
      meta: [],
      media: base.card.media,
      community: null,
      credits: base.card.credits,
      quote: clipDescription(comment.body, QUOTE_MAX),
      byline: handle,
    },
  };
}

/** Dueño activo de una lista de cualquier tipo: `user_list` guarda listas, Caminos y recorridos. */
async function listOwner(id: string): Promise<{ kind: string; username: string } | null> {
  const [row] = await db
    .select({ kind: userList.kind, username: appUser.username })
    .from(userList)
    .innerJoin(appUser, eq(appUser.id, userList.ownerId))
    .where(and(eq(userList.id, id), activeUserCondition()))
    .limit(1);
  return row ?? null;
}

export async function loadListTarget(id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const owner = await listOwner(id);
  if (owner?.kind !== "standard") return null;
  const list = await ifVisible(getUserListDetail(owner.username, id, null));
  // Una lista generada por plantilla se comparte como colección de Explorar.
  if (!list || (await generatedRefsFor([id])).has(id)) return null;

  const t = shareTranslator(locale);
  const handle = `@${owner.username}`;
  // Un mosaico de fotos pediría un crédito por foto, y el ADR 0049 solo cubre carátulas.
  const covers = list.entityType === "artist" ? [] : mosaicOf(list.items.map((item) => item.target));
  const media: ShareMedia = covers.length > 0 ? { type: "mosaic", covers } : { type: "typographic" };
  const count = t(`share.image.listItems.${list.entityType}`, { count: list.itemCount });
  return {
    kind: "list",
    ref: id,
    locale,
    canonicalPath: localeHref(locale, listHref(owner.username, list.title, id)),
    title: t("share.image.titles.list", { title: list.title, author: handle }),
    description: clipDescription(list.description?.trim() || joinParts(handle, count)),
    imageAlt: t("share.image.titles.list", { title: list.title, author: handle }),
    downloadName: downloadName(owner.username, list.title),
    card: {
      kicker: t("share.image.kicker.list"),
      title: list.title,
      subtitle: handle,
      meta: [count],
      media,
      community: null,
      credits: mosaicCredits(t, covers),
    },
  };
}

export async function loadCaminoTarget(id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const owner = await listOwner(id);
  if (owner?.kind !== "custom_journey") return null;
  const profile = await ifVisible(getProfileByUsername(owner.username, null));
  if (!profile) return null;
  const camino = await ifVisible(getUserCaminoDetail(id, profile.id, audiencesForProfile(profile)));
  if (!camino) return null;

  const t = shareTranslator(locale);
  const handle = `@${owner.username}`;
  const covers = mosaicOf(camino.albums);
  // Sin el progreso del dueño: sale de sus escuchas, que tienen audiencia propia.
  const count = t("share.image.listItems.release-group", { count: camino.albums.length });
  return {
    kind: "camino",
    ref: id,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(owner.username)}/caminos/${id}`),
    title: t("share.image.titles.list", { title: camino.title, author: handle }),
    description: clipDescription(camino.description?.trim() || joinParts(handle, count)),
    imageAlt: t("share.image.titles.list", { title: camino.title, author: handle }),
    downloadName: downloadName(owner.username, camino.title),
    card: {
      kicker: t("share.image.kicker.camino"),
      title: camino.title,
      subtitle: handle,
      meta: [count],
      media: covers.length > 0 ? { type: "mosaic", covers } : { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, covers),
    },
  };
}

export async function loadUserCollectionTarget(userId: string, locale: ShareLocale): Promise<ShareTarget | null> {
  const username = await usernameOfAccount(userId);
  if (!username) return null;
  const [profile, collection] = await Promise.all([
    loadProfileTargetByUsername(username, locale),
    ifVisible(listProfileCollection(username, null, 1, MOSAIC_SIZE)),
  ]);
  if (!profile || !collection || collection.entries.length === 0) return null;

  const t = shareTranslator(locale);
  const covers = mosaicOf(collection.entries.map((entry) => entry.album));
  const formats = (["vinyl", "cd", "cassette", "other"] as const)
    .filter((format) => collection.counts[format] > 0)
    .map((format) => t(`share.image.formats.${format}`, { count: collection.counts[format] }));
  const title = t("share.image.titles.collection", { name: profile.card.title });
  return {
    kind: "user_collection",
    ref: userId,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(username)}/collection`),
    title,
    description: clipDescription(joinParts(...formats)),
    imageAlt: title,
    downloadName: downloadName(username, t("share.image.kicker.user_collection")),
    card: {
      kicker: t("share.image.kicker.user_collection"),
      title: profile.card.title,
      subtitle: profile.card.subtitle,
      meta: formats,
      media: { type: "mosaic", covers },
      community: null,
      credits: mosaicCredits(t, covers),
    },
  };
}

export async function loadFingerprintTarget(userId: string, locale: ShareLocale): Promise<ShareTarget | null> {
  const username = await usernameOfAccount(userId);
  if (!username) return null;
  const [profile, fingerprint] = await Promise.all([
    loadProfileTargetByUsername(username, locale),
    ifVisible(getTasteFingerprint(username, null)),
  ]);
  if (!profile || !fingerprint) return null;

  const t = shareTranslator(locale);
  const decade = [...fingerprint.decades].sort((a, b) => b.count - a.count)[0];
  const family = fingerprint.genres[0];
  if (!decade && !family) return null;
  // Frases propias: el resumen de la huella (`summary`) está escrito solo en español.
  const facts = [
    decade ? t("share.image.fingerprint.decade", { decade: decade.label }) : null,
    family ? t("share.image.fingerprint.family", { family: shareFamilyName(locale, family.family) }) : null,
  ].filter((fact): fact is string => fact !== null);
  const title = t("share.image.titles.fingerprint", { name: profile.card.title });
  return {
    kind: "fingerprint",
    ref: userId,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(username)}/fingerprint`),
    title,
    description: clipDescription(facts.join(". ")),
    imageAlt: title,
    downloadName: downloadName(username, t("share.image.kicker.fingerprint")),
    card: {
      kicker: t("share.image.kicker.fingerprint"),
      title: profile.card.title,
      subtitle: profile.card.subtitle,
      meta: facts,
      media: profile.card.media,
      community: null,
      credits: profile.card.credits,
    },
  };
}

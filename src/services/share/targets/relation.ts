import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, listenEntry, rating } from "@/db/schema";
import { localeHref, relationHref } from "@/lib/catalog-links";
import type { ShareLocale } from "@/lib/share/kinds";
import type { ListenReaction } from "@/services/diary/types";
import { isValidUuid } from "@/lib/validation";
import { activeUserCondition } from "@/services/auth/account-status";
import { getProfileByUsername } from "@/services/social/profiles";
import { shareTranslator } from "../i18n";
import type { ShareTarget } from "../types";
import { loadAlbumTarget, loadSongTarget } from "./catalog";
import { clipDescription, downloadName, ifVisible, joinParts } from "./shared";

// Objetivos de lo que una persona tiene con un disco o una canción (spec share-images; openspec:
// add-share-user-actions-phase2). Sin `owner` se calculan como anónimo: hace falta la marca, el destacado o la
// audiencia pública, y acceso al perfil. Con `owner` son la imagen privada de su dueño (spec personal-share-image):
// exigen que la fila sea suya y saltean esas reglas. El armado es el mismo, así las dos imágenes no divergen.

const QUOTE_MAX = 200;

export type RelationType = "album" | "song";

interface TargetOptions {
  /** Id del dueño que pide su imagen privada. */
  owner?: string;
}

/** Disco o canción de una fila, o `null` si es de un artista: esas no tienen página de relación. */
function relationObject(row: { releaseGroupId: string | null; recordingId: string | null }) {
  if (row.releaseGroupId) return { type: "album" as const, id: row.releaseGroupId };
  if (row.recordingId) return { type: "song" as const, id: row.recordingId };
  return null;
}

async function loadBase(type: RelationType, id: string, locale: ShareLocale): Promise<ShareTarget | null> {
  return type === "album" ? loadAlbumTarget(id, locale) : loadSongTarget(id, locale);
}

async function anonymousCanSee(username: string): Promise<boolean> {
  const profile = await ifVisible(getProfileByUsername(username, null));
  return profile?.accessible === true;
}

/** Ruta de la relación a partir de la canónica del disco o la canción, que ya trae el segmento con su slug. */
function relationPath(base: ShareTarget, type: RelationType, username: string, locale: ShareLocale): string {
  return localeHref(locale, relationHref(username, type, base.canonicalPath.slice(base.canonicalPath.lastIndexOf("/") + 1)));
}

export async function loadRatingTarget(id: string, locale: ShareLocale, options: TargetOptions = {}): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const [row] = await db
    .select({
      userId: rating.userId,
      releaseGroupId: rating.releaseGroupId,
      recordingId: rating.recordingId,
      stars: rating.stars,
      detailedScore: rating.detailedScore,
      username: appUser.username,
      isPublic: sql<boolean>`(
        EXISTS (SELECT 1 FROM rating_share s WHERE s.rating_id = "rating"."id")
        OR EXISTS (SELECT 1 FROM rating_highlight h WHERE h.rating_id = "rating"."id")
      )`,
    })
    .from(rating)
    .innerJoin(appUser, eq(appUser.id, rating.userId))
    .where(and(eq(rating.id, id), activeUserCondition()))
    .limit(1);
  const object = row ? relationObject(row) : null;
  if (!row || !object) return null;
  if (options.owner ? row.userId !== options.owner : !row.isPublic || !(await anonymousCanSee(row.username))) return null;
  const base = await loadBase(object.type, object.id, locale);
  if (!base) return null;

  const t = shareTranslator(locale);
  const handle = `@${row.username}`;
  const stars = Number(row.stars);
  const score = row.detailedScore !== null ? `${row.detailedScore}/100` : `${new Intl.NumberFormat(locale).format(stars)}★`;
  const title = t("share.image.titles.rating", { author: handle, object: base.card.title, score });
  return {
    kind: "rating",
    ref: id,
    locale,
    canonicalPath: relationPath(base, object.type, row.username, locale),
    title,
    description: clipDescription(joinParts(base.card.subtitle, score)),
    imageAlt: title,
    downloadName: downloadName(base.card.title, row.username),
    card: {
      kicker: t("share.image.kicker.rating"),
      title: base.card.title,
      subtitle: base.card.subtitle,
      meta: [],
      media: base.card.media,
      community: null,
      credits: base.card.credits,
      stars,
      detailedScore: row.detailedScore,
      byline: handle,
    },
  };
}

export async function loadListenTarget(id: string, locale: ShareLocale, options: TargetOptions = {}): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const [row] = await db
    .select({
      userId: listenEntry.userId,
      releaseGroupId: listenEntry.releaseGroupId,
      recordingId: listenEntry.recordingId,
      body: listenEntry.body,
      reaction: listenEntry.reaction,
      createdAt: listenEntry.createdAt,
      username: appUser.username,
      isPublic: sql<boolean>`(
        "listen_entry"."audience" = 'public'
        OR EXISTS (SELECT 1 FROM listen_entry_highlight h WHERE h.listen_entry_id = "listen_entry"."id")
      )`,
    })
    .from(listenEntry)
    .innerJoin(appUser, eq(appUser.id, listenEntry.userId))
    .where(and(eq(listenEntry.id, id), activeUserCondition()))
    .limit(1);
  const object = row ? relationObject(row) : null;
  if (!row || !object) return null;
  if (options.owner ? row.userId !== options.owner : !row.isPublic || !(await anonymousCanSee(row.username))) return null;
  const base = await loadBase(object.type, object.id, locale);
  if (!base) return null;

  const t = shareTranslator(locale);
  const handle = `@${row.username}`;
  // Mes y año, no día: la imagen es igual para todos y no hay zona horaria guardada del autor.
  const when = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(row.createdAt);
  const reaction = row.reaction ? t(`diary.reaction.${row.reaction as ListenReaction}`) : null;
  const title = t("share.image.titles.listen", { author: handle, object: base.card.title });
  return {
    kind: "listen",
    ref: id,
    locale,
    canonicalPath: `${relationPath(base, object.type, row.username, locale)}?escucha=${id}`,
    title,
    description: clipDescription(row.body?.trim() || joinParts(base.card.subtitle, when, reaction)),
    imageAlt: title,
    downloadName: downloadName(base.card.title, row.username),
    card: {
      kicker: t("share.image.kicker.listen"),
      title: base.card.title,
      subtitle: base.card.subtitle,
      meta: [when, reaction].filter((part): part is string => part !== null),
      media: base.card.media,
      community: null,
      credits: base.card.credits,
      quote: row.body?.trim() ? clipDescription(row.body, QUOTE_MAX) : null,
      byline: handle,
    },
  };
}

/**
 * Lo que anuncia una página de relación, como anónimo (spec relation-page): la escucha pedida, la valoración o la
 * escucha pública más reciente. Sin ninguna, `null`.
 */
export async function loadRelationTarget(
  username: string,
  type: RelationType,
  objectId: string,
  locale: ShareLocale,
  listenId?: string | null,
): Promise<ShareTarget | null> {
  if (!isValidUuid(objectId)) return null;
  const [user] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(and(eq(appUser.username, username), activeUserCondition()))
    .limit(1);
  if (!user) return null;

  const listenColumn = type === "album" ? listenEntry.releaseGroupId : listenEntry.recordingId;
  const ofRelation = and(eq(listenEntry.userId, user.id), eq(listenColumn, objectId));
  if (listenId && isValidUuid(listenId)) {
    const [listen] = await db.select({ id: listenEntry.id }).from(listenEntry).where(and(ofRelation, eq(listenEntry.id, listenId))).limit(1);
    const target = listen ? await loadListenTarget(listen.id, locale) : null;
    if (target) return target;
  }

  const ratingColumn = type === "album" ? rating.releaseGroupId : rating.recordingId;
  const [own] = await db.select({ id: rating.id }).from(rating).where(and(eq(rating.userId, user.id), eq(ratingColumn, objectId))).limit(1);
  const ratingTarget = own ? await loadRatingTarget(own.id, locale) : null;
  if (ratingTarget) return ratingTarget;

  const [latest] = await db
    .select({ id: listenEntry.id })
    .from(listenEntry)
    .where(and(ofRelation, eq(listenEntry.audience, "public")))
    .orderBy(desc(listenEntry.createdAt), desc(listenEntry.id))
    .limit(1);
  return latest ? loadListenTarget(latest.id, locale) : null;
}

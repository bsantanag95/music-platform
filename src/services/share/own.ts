import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, discographyShare, ratingShare } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { ShareFormat, ShareLocale } from "@/lib/share/kinds";
import { updateListenEntry } from "@/services/diary/diary";
import { isDiscographyShared } from "@/services/laminas/discography";
import { updateLamina } from "@/services/laminas/laminas";
import { updateTierList } from "@/services/laminas/tiers";
import { markYearShared, readYearShare, unmarkYearShared } from "@/services/laminas/year";
import { requestTimeZone } from "@/lib/request-time-zone";
import { shareFormatsOf, sharePayloadFor } from "./metadata";
import { loadDiscographyTarget } from "./targets/discography";
import { loadLaminaTarget } from "./targets/lamina";
import { loadTierTarget } from "./targets/tier";
import { loadYearTarget, parseYearRef } from "./targets/year";
import { loadListenTarget, loadRatingTarget } from "./targets/relation";
import type { ShareTarget } from "./types";

// Compartir lo propio (spec personal-share-image y rating-sharing): qué puede hacer el dueño con una valoración o
// una escucha. Lo decide el servidor: la hoja solo muestra el estado. Lo único que vuelve público algo es
// `makeOwnPublic`, y solo esa fila.

export const OWN_SHARE_KINDS = ["rating", "listen", "top", "discography", "tier", "year"] as const;
export type OwnShareKind = (typeof OWN_SHARE_KINDS)[number];

export function isOwnShareKind(value: string): value is OwnShareKind {
  return (OWN_SHARE_KINDS as readonly string[]).includes(value);
}

/** La referencia ya pasó por `requireOwnTarget`: son dos identificadores válidos. */
function artistOf(ref: string): string {
  return ref.split(".")[1] as string;
}

function loadTarget(kind: OwnShareKind, ref: string, locale: ShareLocale, owner?: string): Promise<ShareTarget | null> {
  if (kind === "top") return loadLaminaTarget(ref, locale, { owner });
  if (kind === "tier") return loadTierTarget(ref, locale, { owner });
  if (kind === "year") return loadYearTarget(ref, locale, { owner });
  if (kind === "discography") return loadDiscographyTarget(ref, locale, { owner });
  return kind === "rating" ? loadRatingTarget(ref, locale, { owner }) : loadListenTarget(ref, locale, { owner });
}

/** Imagen privada del dueño: la versión para él, aunque no sea pública. `null` si la fila no es suya. */
export function loadOwnTarget(kind: OwnShareKind, ref: string, locale: ShareLocale, owner: string): Promise<ShareTarget | null> {
  return loadTarget(kind, ref, locale, owner);
}

function notFound(kind: OwnShareKind): ApiError {
  if (kind === "top" || kind === "tier") return new ApiError("LAMINA_NOT_FOUND", 404, "La Lámina no existe");
  if (kind === "discography") return new ApiError("DISCOGRAPHY_NOT_FOUND", 404, "La discografía no existe");
  if (kind === "year") return new ApiError("YEAR_NOT_FOUND", 404, "El año no existe");
  return kind === "rating"
    ? new ApiError("RATING_NOT_FOUND", 404, "La valoración no existe")
    : new ApiError("LISTEN_ENTRY_NOT_FOUND", 404, "La escucha no existe");
}

async function requireOwnTarget(kind: OwnShareKind, ref: string, locale: ShareLocale, userId: string): Promise<ShareTarget> {
  const own = await loadOwnTarget(kind, ref, locale, userId);
  if (!own) throw notFound(kind);
  return own;
}

async function isProfilePrivate(userId: string): Promise<boolean> {
  const [row] = await db.select({ visibility: appUser.profileVisibility }).from(appUser).where(eq(appUser.id, userId)).limit(1);
  return row?.visibility === "private";
}

function personalImagePath(kind: OwnShareKind, ref: string, locale: ShareLocale, format: ShareFormat): string {
  const params = new URLSearchParams({ locale, format, personal: "1" });
  return `/api/share/image/${kind}/${encodeURIComponent(ref)}?${params.toString()}`;
}

export async function ownShareState(kind: OwnShareKind, ref: string, locale: ShareLocale, userId: string) {
  const own = await requireOwnTarget(kind, ref, locale, userId);
  const [anonymous, marked] = await Promise.all([
    loadTarget(kind, ref, locale),
    kind === "rating"
      ? db.select({ id: ratingShare.ratingId }).from(ratingShare).where(eq(ratingShare.ratingId, ref)).limit(1).then((rows) => rows.length > 0)
      : kind === "discography"
        ? isDiscographyShared(userId, artistOf(ref))
        : kind === "year"
          ? readYearShare(userId, parseYearRef(ref)!.year).then(Boolean)
        : Promise.resolve(false),
  ]);
  const common = { canUnshare: marked, hasNote: Boolean(own.card.quote) };
  if (anonymous) return { state: "public" as const, ...common, payload: sharePayloadFor(anonymous) };
  return {
    state: (await isProfilePrivate(userId)) ? ("private_profile" as const) : ("needs_gesture" as const),
    ...common,
    payload: {
      ...sharePayloadFor(own),
      images: shareFormatsOf(own).map((format) => ({ format, url: personalImagePath(kind, ref, locale, format) })),
    },
  };
}

/** "Hacer pública y compartir": solo esa fila. El llamador ya verificó la suspensión social. */
export async function makeOwnPublic(kind: OwnShareKind, ref: string, locale: ShareLocale, userId: string) {
  await requireOwnTarget(kind, ref, locale, userId);
  if (await isProfilePrivate(userId)) {
    throw new ApiError("PROFILE_PRIVATE", 409, "Con el perfil privado nadie sin cuenta podría abrir el enlace");
  }
  if (kind === "rating") {
    await db.insert(ratingShare).values({ userId, ratingId: ref }).onConflictDoNothing();
  } else if (kind === "discography") {
    await db.insert(discographyShare).values({ userId, artistId: artistOf(ref) }).onConflictDoNothing();
  } else if (kind === "top") {
    await updateLamina(ref, userId, { audience: "public" });
  } else if (kind === "tier") {
    await updateTierList(ref, userId, { audience: "public" });
  } else if (kind === "year") {
    // Guarda la zona del dueño: los meses del año compartido se cuentan en ella para cualquier otra persona.
    await markYearShared(userId, parseYearRef(ref)!.year, await requestTimeZone());
  } else {
    await updateListenEntry(ref, userId, { audience: "public" });
  }
  return ownShareState(kind, ref, locale, userId);
}

export const STOPPABLE_KINDS = ["rating", "discography", "year"] as const;
export type StoppableKind = (typeof STOPPABLE_KINDS)[number];

/** "Dejar de compartir" lo que tiene marca. Una escucha o una Lámina se cierran desde su audiencia. */
export async function stopSharing(kind: StoppableKind, ref: string, locale: ShareLocale, userId: string) {
  await requireOwnTarget(kind, ref, locale, userId);
  if (kind === "year") {
    await unmarkYearShared(userId, parseYearRef(ref)!.year);
  } else if (kind === "discography") {
    await db.delete(discographyShare).where(and(eq(discographyShare.userId, userId), eq(discographyShare.artistId, artistOf(ref))));
  } else {
    await db.delete(ratingShare).where(and(eq(ratingShare.ratingId, ref), eq(ratingShare.userId, userId)));
  }
  return ownShareState(kind, ref, locale, userId);
}

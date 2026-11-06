import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, ratingShare } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { ShareFormat, ShareLocale } from "@/lib/share/kinds";
import { updateListenEntry } from "@/services/diary/diary";
import { sharePayloadFor } from "./metadata";
import { loadListenTarget, loadRatingTarget } from "./targets/relation";
import type { ShareTarget } from "./types";

// Compartir lo propio (spec personal-share-image y rating-sharing): qué puede hacer el dueño con una valoración o
// una escucha. Lo decide el servidor: la hoja solo muestra el estado. Lo único que vuelve público algo es
// `makeOwnPublic`, y solo esa fila.

export const OWN_SHARE_KINDS = ["rating", "listen"] as const;
export type OwnShareKind = (typeof OWN_SHARE_KINDS)[number];

export function isOwnShareKind(value: string): value is OwnShareKind {
  return (OWN_SHARE_KINDS as readonly string[]).includes(value);
}

function loadTarget(kind: OwnShareKind, ref: string, locale: ShareLocale, owner?: string): Promise<ShareTarget | null> {
  return kind === "rating" ? loadRatingTarget(ref, locale, { owner }) : loadListenTarget(ref, locale, { owner });
}

/** Imagen privada del dueño: la versión para él, aunque no sea pública. `null` si la fila no es suya. */
export function loadOwnTarget(kind: OwnShareKind, ref: string, locale: ShareLocale, owner: string): Promise<ShareTarget | null> {
  return loadTarget(kind, ref, locale, owner);
}

function notFound(kind: OwnShareKind): ApiError {
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
      : Promise.resolve(false),
  ]);
  const common = { canUnshare: marked, hasNote: Boolean(own.card.quote) };
  if (anonymous) return { state: "public" as const, ...common, payload: sharePayloadFor(anonymous) };
  return {
    state: (await isProfilePrivate(userId)) ? ("private_profile" as const) : ("needs_gesture" as const),
    ...common,
    payload: {
      ...sharePayloadFor(own),
      imageUrl: personalImagePath(kind, ref, locale, "link"),
      storyImageUrl: personalImagePath(kind, ref, locale, "story"),
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
  } else {
    await updateListenEntry(ref, userId, { audience: "public" });
  }
  return ownShareState(kind, ref, locale, userId);
}

/** "Dejar de compartir" una valoración. Una escucha se cierra desde su audiencia. */
export async function stopSharingRating(ref: string, locale: ShareLocale, userId: string) {
  await requireOwnTarget("rating", ref, locale, userId);
  await db.delete(ratingShare).where(and(eq(ratingShare.ratingId, ref), eq(ratingShare.userId, userId)));
  return ownShareState("rating", ref, locale, userId);
}

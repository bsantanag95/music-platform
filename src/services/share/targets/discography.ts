import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { localeHref } from "@/lib/catalog-links";
import type { ShareFormat, ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { activeUserCondition } from "@/services/auth/account-status";
import { bestRated, getDiscographyLamina } from "@/services/laminas/discography";
import { shareTranslator } from "../i18n";
import type { ShareImageRef, ShareTarget } from "../types";
import { mosaicCredits } from "./collections";
import { clipDescription, downloadName } from "./shared";

// Objetivo de una discografía (spec share-images). Como anónimo, solo con la marca y si un anónimo puede ver el perfil; con
// `owner`, la imagen privada de su dueño. La referencia son dos identificadores, como exige `share_event`: estable si cambia el
// usuario, y permite borrar los eventos con la cuenta.

/** Tope del ADR 0053. */
const MAX_COVERS = 10;
const MAX_DISCS = 20;
const FORMATS: ShareFormat[] = ["post", "link", "story"];

export function discographyRef(userId: string, artistId: string): string {
  return `${userId}.${artistId}`;
}

/** Referencia para los metadatos de la página, que solo tiene el usuario de la ruta. */
export async function discographyRefFor(username: string, artistId: string): Promise<string | null> {
  const [owner] = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.username, username)).limit(1);
  return owner ? discographyRef(owner.id, artistId) : null;
}

function parseRef(ref: string): { userId: string; artistId: string } | null {
  const [userId, artistId, ...rest] = ref.split(".");
  return userId && artistId && rest.length === 0 && isValidUuid(userId) && isValidUuid(artistId) ? { userId, artistId } : null;
}

export async function loadDiscographyTarget(ref: string, locale: ShareLocale, options: { owner?: string } = {}): Promise<ShareTarget | null> {
  const parsed = parseRef(ref);
  if (!parsed || (options.owner && options.owner !== parsed.userId)) return null;
  const [owner] = await db
    .select({ username: appUser.username, displayName: appUser.displayName })
    .from(appUser)
    .where(and(eq(appUser.id, parsed.userId), activeUserCondition()))
    .limit(1);
  if (!owner) return null;
  const lamina = await getDiscographyLamina(owner.username, parsed.artistId, options.owner ?? null);
  if (!lamina || lamina.missing > 0) return null;

  const t = shareTranslator(locale);
  const handle = `@${owner.username}`;
  const name = owner.displayName?.trim();
  const byline = name ? `${name} · ${handle}` : handle;
  const shown = lamina.discs.slice(0, MAX_DISCS);
  const withCover = bestRated(shown, MAX_COVERS);
  const discs = shown.map((disc) => ({
    cover: {
      url: withCover.has(disc) ? disc.coverThumbUrl : null,
      fallbackTitle: disc.title,
      fallbackSubtitle: null,
    } satisfies ShareImageRef,
    title: disc.title,
    year: disc.year,
    stars: disc.stars,
    detailedScore: disc.detailedScore,
  }));
  const rated = t("share.image.discographyRated", { count: lamina.discs.length });
  const title = t("share.image.titles.discography", { artist: lamina.artist.name, author: handle });
  const covers = discs.map((disc) => disc.cover).filter((cover) => cover.url);
  return {
    kind: "discography",
    ref,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(owner.username)}/artist/${parsed.artistId}`),
    title,
    description: clipDescription(`${rated} · ${shown.map((disc) => disc.title).join(" · ")}`),
    imageAlt: title,
    downloadName: downloadName(lamina.artist.name, "discografia", owner.username),
    formats: FORMATS,
    card: {
      kicker: t("share.image.kicker.discography"),
      title: lamina.artist.name,
      subtitle: handle,
      meta: [rated],
      media: { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, covers),
      discography: {
        byline,
        rated,
        discs,
        more: lamina.discs.length - shown.length,
        progressPercent: lamina.progress.kind === "journey" ? lamina.progress.percent : null,
      },
    },
  };
}

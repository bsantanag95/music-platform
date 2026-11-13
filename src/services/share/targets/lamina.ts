import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userList } from "@/db/schema";
import { localeHref } from "@/lib/catalog-links";
import type { ShareFormat, ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { activeUserCondition } from "@/services/auth/account-status";
import { getOwnedLamina, getUserLamina, type LaminaDetail } from "@/services/laminas/laminas";
import { shareTranslator } from "../i18n";
import type { ShareImageRef, ShareTarget } from "../types";
import { mosaicCredits } from "./collections";
import { clipDescription, downloadName, ifVisible } from "./shared";

// Objetivo de una Lámina Top N (spec share-images). Como anónimo solo si un anónimo puede verla; con `owner`, la imagen
// privada de su dueño. Las notas solo van si la Lámina las muestra: el dueño ve las suyas en el editor, no en la imagen.

/** Tope del ADR 0051: lo que arma una persona junta hasta 10 carátulas. */
const MAX_COVERS = 10;

export async function loadLaminaTarget(id: string, locale: ShareLocale, options: { owner?: string } = {}): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const [owner] = await db
    .select({ id: appUser.id, username: appUser.username, displayName: appUser.displayName, kind: userList.kind })
    .from(userList)
    .innerJoin(appUser, eq(appUser.id, userList.ownerId))
    .where(and(eq(userList.id, id), activeUserCondition()))
    .limit(1);
  if (owner?.kind !== "top") return null;
  if (options.owner && owner.id !== options.owner) return null;
  const lamina: LaminaDetail | null = options.owner
    ? await ifVisible(getOwnedLamina(id, options.owner))
    : await ifVisible(getUserLamina(owner.username, id, null));
  if (!lamina) return null;

  const t = shareTranslator(locale);
  const handle = `@${owner.username}`;
  const name = owner.displayName?.trim();
  const byline = name ? `${name} · ${handle}` : handle;
  const items = lamina.items.slice(0, MAX_COVERS).map((item) => ({
    cover: { url: item.target.coverThumbUrl, fallbackTitle: item.target.title, fallbackSubtitle: item.target.artistName } satisfies ShareImageRef,
    title: item.target.title,
    subtitle: item.target.artistName,
    // Una Lámina sin notas no las lleva, ni para su dueño: la imagen es lo que se publica.
    stars: lamina.showScores && item.score ? Number(item.score.stars) : null,
    detailedScore: lamina.showScores ? (item.score?.detailedScore ?? null) : null,
  }));
  const covers = items.slice(0, 4).map((item) => item.cover);
  const formats: ShareFormat[] = lamina.format === "grid9" ? ["square", "link", "story"] : ["post", "link", "story"];
  const count = t(`share.image.listItems.${lamina.entityType}`, { count: lamina.items.length });
  const title = t("share.image.titles.list", { title: lamina.title, author: handle });
  return {
    kind: "top",
    ref: id,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(owner.username)}/cards/${id}`),
    title,
    description: clipDescription(items.map((item, index) => `${index + 1}. ${item.title}`).join(" · ") || count),
    imageAlt: title,
    downloadName: downloadName(owner.username, lamina.title),
    formats,
    card: {
      kicker: t(`share.image.kicker.${lamina.format}`),
      title: lamina.title,
      subtitle: handle,
      meta: [count],
      media: covers.length > 0 ? { type: "mosaic", covers } : { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, items.map((item) => item.cover)),
      top: { format: lamina.format, byline, items },
    },
  };
}

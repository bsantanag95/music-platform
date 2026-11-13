import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userList } from "@/db/schema";
import { localeHref } from "@/lib/catalog-links";
import type { ShareFormat, ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { activeUserCondition } from "@/services/auth/account-status";
import { getOwnedTierList, getUserTierList, type TierListDetail } from "@/services/laminas/tiers";
import { shareTranslator } from "../i18n";
import type { ShareImageRef, ShareTarget } from "../types";
import { mosaicCredits } from "./collections";
import { clipDescription, downloadName, ifVisible } from "./shared";

// Objetivo de una tier list (spec share-images, openspec: add-tier-list-lamina-phase1). Como anónimo solo si un anónimo puede verla;
// con `owner`, la imagen privada de su dueño. Nunca lleva la bandeja, ni para el dueño: la imagen es lo que se publica. Lo mismo con
// las notas: solo si la tier list las muestra.

/** Tope del ADR 0051: lo que arma una persona junta hasta 10 carátulas, desde el nivel más alto. El resto, como ficha de texto. */
const MAX_COVERS = 10;
const FORMATS: ShareFormat[] = ["post", "link", "story"];

export async function loadTierTarget(id: string, locale: ShareLocale, options: { owner?: string } = {}): Promise<ShareTarget | null> {
  if (!isValidUuid(id)) return null;
  const [owner] = await db
    .select({ id: appUser.id, username: appUser.username, displayName: appUser.displayName, kind: userList.kind })
    .from(userList)
    .innerJoin(appUser, eq(appUser.id, userList.ownerId))
    .where(and(eq(userList.id, id), activeUserCondition()))
    .limit(1);
  if (owner?.kind !== "tier") return null;
  if (options.owner && owner.id !== options.owner) return null;
  const tierList: TierListDetail | null = options.owner
    ? await ifVisible(getOwnedTierList(id, options.owner))
    : await ifVisible(getUserTierList(owner.username, id, null));
  if (!tierList) return null;

  const t = shareTranslator(locale);
  const handle = `@${owner.username}`;
  const name = owner.displayName?.trim();
  const byline = name ? `${name} · ${handle}` : handle;
  let covered = 0;
  const tiers = tierList.tiers.map((items) =>
    items.map((item) => {
      const withCover = covered < MAX_COVERS && item.target.coverThumbUrl !== null;
      if (withCover) covered += 1;
      const cover: ShareImageRef = { url: withCover ? item.target.coverThumbUrl : null, fallbackTitle: item.target.title, fallbackSubtitle: item.target.artistName };
      return {
        cover,
        title: item.target.title,
        stars: tierList.showScores && item.score ? Number(item.score.stars) : null,
        detailedScore: tierList.showScores ? (item.score?.detailedScore ?? null) : null,
      };
    }),
  );
  const placed = tiers.flat();
  const count = t(`share.image.listItems.${tierList.entityType}`, { count: placed.length });
  const title = t("share.image.titles.list", { title: tierList.title, author: handle });
  const description = tiers
    .flatMap((items, index) => (items.length > 0 ? [`${tierList.labels[index]}: ${items.map((item) => item.title).join(", ")}`] : []))
    .join(" · ");
  return {
    kind: "tier",
    ref: id,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(owner.username)}/cards/${id}`),
    title,
    description: clipDescription(description || count),
    imageAlt: title,
    downloadName: downloadName(owner.username, tierList.title),
    formats: FORMATS,
    card: {
      kicker: t("share.image.kicker.tier"),
      title: tierList.title,
      subtitle: handle,
      meta: [count],
      media: { type: "typographic" },
      community: null,
      credits: mosaicCredits(t, placed.map((item) => item.cover).filter((cover) => cover.url)),
      tier: { byline, labels: tierList.labels, tiers },
    },
  };
}

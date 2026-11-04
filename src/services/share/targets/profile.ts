import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { monogramLetter, monogramVariant } from "@/components/social/monogram";
import { localeHref } from "@/lib/catalog-links";
import type { ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { activeUserCondition } from "@/services/auth/account-status";
import { getExtendedIdentityByUsername } from "@/services/profiles/identity";
import { getShowcase, type ShowcaseEntity } from "@/services/profiles/showcase";
import { getProfileByUsername } from "@/services/social/profiles";
import { shareTranslator } from "../i18n";
import type { ShareImageRef, ShareTarget } from "../types";
import { catalogCredits, clipDescription, downloadName } from "./shared";

// Objetivo del perfil (spec share-images y share-metadata): SIEMPRE como visitante anónimo. La identidad (foto o
// monograma, nombre, usuario, contadores) es pública aun en un perfil privado (spec social-profiles); la bio y
// la Tarjeta de Identidad solo si el anónimo tiene acceso. Una cuenta desactivada o inexistente no tiene
// objetivo (imagen genérica). La referencia es el id de la cuenta, nunca el usuario (spec share-events).

function cardCover(entity: ShowcaseEntity | null): ShareImageRef | null {
  if (!entity) return null;
  return { url: entity.coverThumbUrl, fallbackTitle: entity.title, fallbackSubtitle: entity.artistName };
}

export const loadProfileTargetByUsername = cache(async (username: string, locale: ShareLocale): Promise<ShareTarget | null> => {
  const [identity, profile] = await Promise.all([
    getExtendedIdentityByUsername(username),
    getProfileByUsername(username, null).catch(() => null),
  ]);
  if (!identity || !profile) return null;

  const t = shareTranslator(locale);
  const name = identity.displayName?.trim() || `@${identity.username}`;
  const handle = `@${identity.username}`;

  let covers: ShareImageRef[] = [];
  if (profile.accessible) {
    const { identityCard } = await getShowcase(profile.id);
    covers = [cardCover(identityCard.album), cardCover(identityCard.anthem), cardCover(identityCard.artist)].filter(
      (cover): cover is ShareImageRef => cover !== null,
    );
  }

  const description = profile.accessible && identity.bio?.trim()
    ? identity.bio
    : t(profile.accessible ? "share.image.descriptions.profile" : "share.image.descriptions.privateProfile", { name });
  const counters = [
    t("share.image.followers", { count: identity.followerCount }),
    t("share.image.following", { count: identity.followingCount }),
  ];

  return {
    kind: "profile",
    ref: identity.id,
    locale,
    canonicalPath: localeHref(locale, `/users/${encodeURIComponent(identity.username)}`),
    title: name === handle ? handle : `${name} (${handle})`,
    description: clipDescription(description),
    imageAlt: name === handle ? handle : `${name}, ${handle}`,
    downloadName: downloadName(identity.username),
    card: {
      kicker: t("share.image.kicker.profile"),
      title: name,
      subtitle: name === handle ? null : handle,
      meta: profile.accessible ? counters : [t("share.image.privateProfile"), ...counters],
      media: {
        type: "identity",
        avatarUrl: identity.avatarUrl,
        monogram: monogramLetter(identity.displayName?.trim() || identity.username),
        monogramVariant: monogramVariant(identity.username),
        covers,
      },
      community: null,
      credits: covers.length > 0 ? catalogCredits(t, covers.some((c) => c.url !== null)) : [],
    },
  };
});

/** Objetivo por id de la cuenta (la referencia de la ruta de imágenes y de `share_event`). */
export async function loadProfileTarget(userId: string, locale: ShareLocale): Promise<ShareTarget | null> {
  if (!isValidUuid(userId)) return null;
  const [row] = await db
    .select({ username: appUser.username })
    .from(appUser)
    .where(and(eq(appUser.id, userId), activeUserCondition()))
    .limit(1);
  return row ? loadProfileTargetByUsername(row.username, locale) : null;
}

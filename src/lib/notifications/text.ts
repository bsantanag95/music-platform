import type { NotificationGroupValue } from "@/lib/api/schemas";

// Texto de una entrada de la bandeja (openspec: add-notifications-core, D8;
// add-notification-digest-and-awards, D3). Vive fuera del componente para que el
// resumen semanal redacte exactamente lo mismo que la app: una sola definición
// de "qué dice" cada aviso.

type NotificationT = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

type ModerationTarget = Extract<
  NonNullable<NotificationGroupValue["target"]>,
  { type: "moderation" }
>;

export interface NotificationTextOptions {
  /**
   * Nombre localizado del premio a partir de su slug. El target solo trae el
   * slug (`awardName`), porque los nombres viven en los mensajes de `awards`.
   */
  awardName?: (slug: string, fallback: string) => string;
}

/**
 * Texto de la entrada. Los plurales viven en los mensajes ICU: `count` es el
 * número de personas distintas del grupo (el verbo concuerda con él) y
 * `people` ya trae "Ana y Bruno" o "Ana, Bruno y 2 personas más". Los hitos, los
 * lanzamientos y los premios no tienen personas: usan su propio objeto y su
 * cifra.
 */
export function notificationText(
  t: NotificationT,
  group: NotificationGroupValue,
  locale: string,
  options: NotificationTextOptions = {},
): string {
  const nameOf = (actor: NotificationGroupValue["actors"][number]) =>
    actor.displayName ?? actor.username;

  // "Ana", "Ana y Bruno" o "Ana, Bruno y 2 personas más": hasta dos nombres y el resto como cifra,
  // igual para los hilos y para los seguidores del día.
  const people = () => {
    const names = group.actors.map(nameOf);
    const remaining = Math.max(0, group.actorCount - names.length);
    return remaining > 0
      ? t("row.moreNames", { names: names.slice(0, 2).join(", "), count: remaining })
      : names.length > 1
        ? t("row.twoNames", { first: names[0]!, second: names[1]! })
        : (names[0] ?? "");
  };

  if (group.kind === "comment_reply" || group.kind === "thread_reply") {
    return t(group.kind === "comment_reply" ? "row.commentReply" : "row.threadReply", {
      people: people(),
      count: Math.max(group.actorCount, 1),
      artist: group.target?.type === "artist" ? group.target.artistName : "",
    });
  }

  if (group.kind === "new_follower") {
    return t("row.newFollower", { people: people(), count: Math.max(group.actorCount, 1) });
  }

  const name = group.actors[0] ? nameOf(group.actors[0]) : "";

  if (group.kind === "follow_request") return t("row.followRequest", { name });
  if (group.kind === "follow_accepted") return t("row.followAccepted", { name });

  const target = group.target;

  if (group.kind === "comment_like_milestone") {
    if (target?.type !== "comment") return t("row.milestoneFallback");
    return t("row.commentLikeMilestone", {
      subject: target.subjectName,
      count: target.milestone,
    });
  }

  if (group.kind === "list_save_milestone") {
    if (target?.type !== "list") return t("row.milestoneFallback");
    return t(
      target.isCamino ? "row.listSaveMilestoneCamino" : "row.listSaveMilestone",
      { title: target.title, count: target.milestone },
    );
  }

  if (
    group.kind === "artist_release" ||
    group.kind === "artist_release_announced" ||
    group.kind === "artist_single"
  ) {
    if (target?.type !== "release") return t("row.releaseFallback");
    if (group.kind === "artist_release_announced") {
      const date = target.releaseDate
        ? formatReleaseDate(target.releaseDate, locale)
        : null;
      return date
        ? t("row.releaseAnnounced", {
            artist: target.artistName,
            title: target.title,
            date,
          })
        : t("row.releaseAnnouncedNoDate", {
            artist: target.artistName,
            title: target.title,
          });
    }
    const key =
      target.category === "single"
        ? "row.releaseSingle"
        : target.category === "ep"
          ? "row.releaseEp"
          : "row.releaseAlbum";
    return t(key, { artist: target.artistName, title: target.title });
  }

  if (target?.type === "award") {
    const award = options.awardName?.(target.awardSlug, target.awardName) ?? target.awardName;
    const params = {
      artist: target.artistName,
      award,
      year: target.year,
      count: target.count,
      artistCount: target.artistCount,
      otherArtists: Math.max(0, target.artistCount - 1),
    };
    const more = target.artistCount > 1 ? "More" : "";
    if (target.isHallOfFame) return t(`row.awardHallOfFame${more}`, params);
    return t(
      group.kind === "artist_award_win" ? `row.awardWin${more}` : `row.awardNomination${more}`,
      params,
    );
  }

  if (target?.type === "moderation") {
    return t(moderationKey(target.action, target.contentType));
  }
  return t("moderation.fallback");
}

/** `YYYY-MM-DD` a "14 de noviembre" en el idioma activo; `null` si no es una fecha. */
export function formatReleaseDate(iso: string, locale: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function moderationKey(
  action: ModerationTarget["action"],
  contentType: ModerationTarget["contentType"],
): string {
  if (action === "suspend_social") return "moderation.suspendSocial";
  if (action === "revoke_social") return "moderation.revokeSocial";
  if (action === "restore") {
    if (contentType === "comment") return "moderation.restoreComment";
    if (contentType === "review") return "moderation.restoreReview";
    if (contentType === "list") return "moderation.restoreList";
  }
  if (contentType === "comment") return "moderation.hideComment";
  if (contentType === "review") return "moderation.hideReview";
  if (contentType === "list") return "moderation.hideList";
  return "moderation.fallback";
}

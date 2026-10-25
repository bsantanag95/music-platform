"use client";

import { useState } from "react";
import { useLocale, useTranslations, useTimeZone } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import { NoContentSchema, type NotificationGroupValue } from "@/lib/api/schemas";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { UserAvatar } from "@/components/social/UserAvatar";
import { AppImage } from "@/components/ui/AppImage";
import { markNotificationsRead } from "./api";
import { NOTIFICATIONS_COUNT_KEY } from "./query-keys";

interface NotificationRowProps {
  group: NotificationGroupValue;
  /** Se llama al abrir el destino (el panel lo usa para cerrarse). */
  onNavigate?: () => void;
  /** Aviso de lectura para que una página actualice su lista local. */
  onRead?: () => void;
  /** Aviso de solicitud resuelta: la entrada deja de existir. */
  onResolved?: () => void;
}

type ModerationAction = "hide" | "restore" | "suspend_social" | "revoke_social";
type ModerationContentType = "comment" | "review" | "list" | "social_suspension";
type ReleaseTarget = Extract<NotificationGroupValue["target"], { type: "release" }>;

// Fila de la bandeja (openspec: add-notifications-core, D8;
// add-notification-milestones-and-releases, D8). Las respuestas y los
// seguidores enlazan a su objeto; la moderación no enlaza (el contenido puede
// estar oculto) y solo redacta acción, objeto y motivo, sin nombrar al
// moderador. Los hitos no tienen actor: llevan un icono y enlazan al hilo o a
// la lista. Los lanzamientos llevan la carátula de 250 px (o el placeholder) y
// enlazan al disco. La solicitud de seguimiento conserva Aprobar / Rechazar.
export function NotificationRow({
  group,
  onNavigate,
  onRead,
  onResolved,
}: NotificationRowProps) {
  const t = useTranslations("notifications");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();

  const text = notificationText(t, group, locale);
  const reason =
    group.target?.type === "moderation"
      ? t("moderation.reason", { reason: group.target.reason })
      : null;

  const requester = group.kind === "follow_request" ? group.actors[0] : undefined;
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const actor = group.actors[0];
  const actorName = actor ? (actor.displayName ?? actor.username) : "";

  // Abrir el destino también marca leída la entrada (D6). La petición no
  // bloquea la navegación: el enlace sigue siendo el que cambia de página. La
  // lista que contiene la fila se actualiza desde el contenedor (`onRead`),
  // porque el panel y la página cachean formas distintas.
  const markRead = () => {
    onRead?.();
    void markNotificationsRead({ groupKeys: [group.id] }, timeZone)
      .catch(() => {
        // Sin conexión o error del servidor: el punto sigue como estaba.
      })
      .finally(() => {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_COUNT_KEY });
      });
  };

  const handleNavigate = () => {
    onNavigate?.();
    if (group.unread) markRead();
  };

  const resolveRequest = async (action: "approve" | "reject") => {
    if (!requester) return;
    setBusy(true);
    setErrorCode(null);
    try {
      await apiFetch(
        `/api/me/follow-requests/${encodeURIComponent(requester.id)}/${action}`,
        NoContentSchema,
        { method: "POST" },
      );
      onResolved?.();
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_COUNT_KEY });
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <>
      <span className="block font-body text-sm text-paper">
        {text}
        {group.unread ? <span className="sr-only"> ({t("bell.unread")})</span> : null}
      </span>
      {reason ? (
        <span className="mt-0.5 block font-data text-xs text-paper-muted">{reason}</span>
      ) : null}
      <span className="mt-1 flex items-center gap-2">
        <RelativeDate iso={group.lastAt} />
        {group.unread ? (
          <span className="size-1.5 shrink-0 rounded-full bg-amber" aria-hidden="true" />
        ) : null}
      </span>
    </>
  );

  const href = targetHref(group);

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <LeadingVisual group={group} actor={actor} actorName={actorName} />

      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            onClick={handleNavigate}
            className="block rounded-sm transition-colors hover:text-amber"
          >
            {body}
          </Link>
        ) : (
          <div>
            {body}
            {/* Sin destino que abrir (moderación): la entrada se marca leída a mano. */}
            {group.unread ? (
              <button
                type="button"
                onClick={markRead}
                className="mt-1 font-data text-xs text-amber underline"
              >
                {t("row.markRead")}
              </button>
            ) : null}
          </div>
        )}

        {requester ? (
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveRequest("approve")}
                className="rounded bg-amber px-2.5 py-1 font-data text-xs font-medium text-ink transition-colors hover:bg-amber-hover disabled:cursor-wait disabled:opacity-60"
              >
                {t("row.approve")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resolveRequest("reject")}
                className="rounded border border-ink-border px-2.5 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:cursor-wait disabled:opacity-60"
              >
                {t("row.reject")}
              </button>
            </div>
            {errorCode ? (
              <span role="alert" className="font-data text-xs text-danger">
                {tErrors(`${errorCode}.description`)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

interface LeadingVisualProps {
  group: NotificationGroupValue;
  actor: NotificationGroupValue["actors"][number] | undefined;
  actorName: string;
}

/** Icono, carátula o avatar de la fila, según la familia de la entrada. */
function LeadingVisual({ group, actor, actorName }: LeadingVisualProps) {
  if (group.kind === "moderation") return <ModerationIcon />;
  if (group.kind === "comment_like_milestone") return <MilestoneIcon kind="like" />;
  if (group.kind === "list_save_milestone") return <MilestoneIcon kind="save" />;
  if (group.target?.type === "release") return <ReleaseCover target={group.target} />;
  if (actor) {
    return (
      <UserAvatar
        avatarUrl={actor.avatarUrl}
        username={actor.username}
        name={actorName}
        size="menu"
      />
    );
  }
  return <span className="size-9 shrink-0" aria-hidden="true" />;
}

function ReleaseCover({ target }: { target: ReleaseTarget }) {
  return (
    <span className="relative size-10 shrink-0 overflow-hidden rounded ring-1 ring-ink-border">
      {target.coverUrl ? (
        <AppImage src={target.coverUrl} alt="" fill sizes="40px" className="object-cover" />
      ) : (
        <DiscPlaceholder alt="" className="size-full" />
      )}
    </span>
  );
}

type NotificationT = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Texto de la entrada. Los plurales viven en los mensajes ICU: `count` es el
 * número de personas distintas del grupo (el verbo concuerda con él) y
 * `people` ya trae "Ana y Bruno" o "Ana, Bruno y 2 personas más". Los hitos y
 * los lanzamientos no tienen personas: usan su propio objeto y su cifra.
 */
function notificationText(
  t: NotificationT,
  group: NotificationGroupValue,
  locale: string,
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
      artist: target.artistName,
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

  if (target?.type === "moderation") {
    return t(moderationKey(target.action, target.contentType));
  }
  return t("moderation.fallback");
}

/** `YYYY-MM-DD` a "14 de noviembre" en el idioma activo; `null` si no es una fecha. */
function formatReleaseDate(iso: string, locale: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function moderationKey(action: ModerationAction, contentType: ModerationContentType): string {
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

function targetHref(group: NotificationGroupValue): string | null {
  const target = group.target;
  if (!target) return null;
  // Al hilo, no solo a la página: `Comments` abre `?thread=` y lo lleva a la vista.
  if (target.type === "artist") {
    return `${artistHref(target.artistName, target.artistId)}?thread=${encodeURIComponent(target.rootId)}`;
  }
  if (target.type === "comment") {
    return `${artistHref(target.artistName, target.artistId)}?thread=${encodeURIComponent(target.rootId)}`;
  }
  if (target.type === "profile") return `/users/${encodeURIComponent(target.username)}`;
  // El destinatario de un hito de guardados es el dueño: enlaza a su superficie.
  if (target.type === "list") {
    return target.isCamino
      ? `/me/caminos/${encodeURIComponent(target.listId)}`
      : `/me/lists/${encodeURIComponent(target.listId)}`;
  }
  if (target.type === "release") {
    return albumHref(target.artistName, target.title, target.releaseGroupId);
  }
  return null;
}

function MilestoneIcon({ kind }: { kind: "like" | "save" }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "like" ? (
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        ) : (
          <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
        )}
      </svg>
    </span>
  );
}

function ModerationIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="16.5" x2="12" y2="16.6" />
      </svg>
    </span>
  );
}

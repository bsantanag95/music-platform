"use client";

import { useState } from "react";
import { useTranslations, useTimeZone } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import {
  NoContentSchema,
  type NotificationGroupValue,
} from "@/lib/api/schemas";
import { artistHref } from "@/lib/catalog-links";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { UserAvatar } from "@/components/social/UserAvatar";
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

// Fila de la bandeja (openspec: add-notifications-core, D8). Las respuestas y
// los seguidores enlazan a su objeto; la moderación no enlaza (el contenido
// puede estar oculto) y solo redacta acción, objeto y motivo, sin nombrar al
// moderador. La solicitud de seguimiento conserva Aprobar / Rechazar en línea.
export function NotificationRow({
  group,
  onNavigate,
  onRead,
  onResolved,
}: NotificationRowProps) {
  const t = useTranslations("notifications");
  const tErrors = useTranslations("errors");
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();

  const text = notificationText(t, group);
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
  const handleNavigate = () => {
    onNavigate?.();
    if (!group.unread) return;

    onRead?.();
    void markNotificationsRead({ groupKeys: [group.id] }, timeZone)
      .catch(() => {
        // Sin conexión o error del servidor: el punto sigue como estaba.
      })
      .finally(() => {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_COUNT_KEY });
      });
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
      {group.kind === "moderation" ? (
        <ModerationIcon />
      ) : actor ? (
        <UserAvatar
          avatarUrl={actor.avatarUrl}
          username={actor.username}
          name={actorName}
          size="menu"
        />
      ) : (
        <span className="size-9 shrink-0" aria-hidden="true" />
      )}

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
          <div>{body}</div>
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

type NotificationT = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Texto de la entrada. Los plurales viven en los mensajes ICU: `count` es el
 * número de personas distintas del grupo (el verbo concuerda con él) y
 * `people` ya trae "Ana y Bruno" o "Ana, Bruno y 2 personas más".
 */
function notificationText(t: NotificationT, group: NotificationGroupValue): string {
  const nameOf = (actor: NotificationGroupValue["actors"][number]) =>
    actor.displayName ?? actor.username;

  if (group.kind === "comment_reply" || group.kind === "thread_reply") {
    const names = group.actors.map(nameOf);
    const remaining = Math.max(0, group.actorCount - names.length);
    const people =
      remaining > 0
        ? t("row.moreNames", { names: names.slice(0, 2).join(", "), count: remaining })
        : names.length > 1
          ? t("row.twoNames", { first: names[0]!, second: names[1]! })
          : (names[0] ?? "");

    return t(group.kind === "comment_reply" ? "row.commentReply" : "row.threadReply", {
      people,
      count: Math.max(group.actorCount, 1),
      artist: group.target?.type === "artist" ? group.target.artistName : "",
    });
  }

  const name = group.actors[0] ? nameOf(group.actors[0]) : "";

  if (group.kind === "new_follower") return t("row.newFollower", { name });
  if (group.kind === "follow_request") return t("row.followRequest", { name });
  if (group.kind === "follow_accepted") return t("row.followAccepted", { name });

  const target = group.target;
  if (target?.type === "moderation") {
    return t(moderationKey(target.action, target.contentType));
  }
  return t("moderation.fallback");
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
  if (target.type === "artist") return artistHref(target.artistName, target.artistId);
  if (target.type === "profile") return `/users/${encodeURIComponent(target.username)}`;
  return null;
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

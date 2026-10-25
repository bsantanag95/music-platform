"use client";

import { useState } from "react";
import { useLocale, useTranslations, useTimeZone } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import { NoContentSchema, type NotificationGroupValue } from "@/lib/api/schemas";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import { notificationText } from "@/lib/notifications/text";
import { ceremonyHref, hallClassHref } from "@/components/awards/award-links";
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

type ReleaseTarget = Extract<NotificationGroupValue["target"], { type: "release" }>;

// Fila de la bandeja (openspec: add-notifications-core, D8;
// add-notification-milestones-and-releases, D8;
// add-notification-digest-and-awards, D8). Las respuestas y los seguidores
// enlazan a su objeto; la moderación no enlaza (el contenido puede estar oculto)
// y solo redacta acción, objeto y motivo, sin nombrar al moderador. Los hitos no
// tienen actor: llevan un icono y enlazan al hilo o a la lista. Los lanzamientos
// llevan la carátula de 250 px (o el placeholder) y enlazan al disco. Los premios
// llevan el trofeo y enlazan a la ceremonia (o a la clase del Salón de la Fama),
// con el nombre del premio localizado. La solicitud de seguimiento conserva
// Aprobar / Rechazar.
export function NotificationRow({
  group,
  onNavigate,
  onRead,
  onResolved,
}: NotificationRowProps) {
  const t = useTranslations("notifications");
  const tAwards = useTranslations("awards");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();

  const text = notificationText(t, group, locale, {
    awardName: (slug, fallback) =>
      tAwards.has(`names.${slug}`) ? tAwards(`names.${slug}`) : fallback,
  });
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
  if (group.target?.type === "award") return <AwardIcon won={group.kind === "artist_award_win"} />;
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

function targetHref(group: NotificationGroupValue): string | null {
  const target = group.target;
  if (!target) return null;
  // Al hilo, no solo a la página: `Comments` abre `?thread=` y lo lleva a la vista.
  if (target.type === "artist") {
    return `${artistHref(target.artistName, target.artistId)}?thread=${encodeURIComponent(target.rootId)}`;
  }
  // Hito de likes: al hilo en un artista; a la página del álbum o de la canción en los demás.
  if (target.type === "comment") {
    if (target.subject === "album") {
      return albumHref(target.subjectArtistName, target.subjectName, target.subjectId);
    }
    if (target.subject === "song") {
      return songHref(target.subjectArtistName, target.subjectName, target.subjectId);
    }
    const page = artistHref(target.subjectName, target.subjectId);
    return target.rootId ? `${page}?thread=${encodeURIComponent(target.rootId)}` : page;
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
  // Ceremonia o clase del Salón de la Fama, según la clase de premio.
  if (target.type === "award") {
    return target.isHallOfFame
      ? hallClassHref(target.awardSlug, target.year)
      : ceremonyHref(target.awardSlug, target.year);
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

/**
 * Trofeo de premio. La victoria va en ámbar lleno y la nominación en el mismo
 * tono apagado que el resto de iconos: la fila ya lo dice con el texto.
 */
function AwardIcon({ won }: { won: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
        won ? "bg-amber text-ink" : "bg-amber/15 text-amber"
      }`}
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
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
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

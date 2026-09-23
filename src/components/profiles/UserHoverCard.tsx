"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { Spinner } from "@/components/ui/Spinner";
import { FollowButton } from "@/components/social/FollowButton";
import { UserAvatar } from "@/components/social/UserAvatar";
import { apiFetch } from "@/lib/api/client";
import { targetHref } from "@/components/feed/feed-target";
import { IdentityCardPreviewResponseSchema, type IdentityCardPreviewDto } from "@/lib/api/schemas";

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;

type PreviewState = { status: "loading" } | { status: "error" } | { status: "ready"; preview: IdentityCardPreviewDto };

// Cache de módulo: varios comentarios/reseñas de la misma persona en una
// página no deberían disparar un fetch por cada aparición del username —
// vive mientras dure la pestaña, se descarta en un refresh (dato que cambia
// poco, no hace falta invalidación).
const previewCache = new Map<string, Promise<IdentityCardPreviewDto>>();

function fetchPreview(username: string): Promise<IdentityCardPreviewDto> {
  const cached = previewCache.get(username);
  if (cached) return cached;
  const promise = apiFetch(
    `/api/users/${encodeURIComponent(username)}/identity-card-preview`,
    IdentityCardPreviewResponseSchema,
  ).then((response) => response.preview);
  previewCache.set(username, promise);
  promise.catch(() => previewCache.delete(username));
  return promise;
}

interface UserHoverCardProps {
  username: string;
  children: ReactNode;
}

// Vista rápida del perfil al pasar el cursor (o enfocar por teclado) un
// username — en comentarios, reseñas, feed, listas, y cualquier otro lugar
// que enlace a un perfil (openspec: rework-user-profile). Contenido "Nivel 2"
// de los mockups comparados con el usuario: monograma + nombre/@username +
// botón Seguir (reutiliza `FollowButton` tal cual, misma lógica que `Placa`)
// + bio, más la Tarjeta de Identidad compacta (círculos, "Opción A") debajo
// de una línea divisoria. Sin contadores de seguidores/miembro desde — se
// descartaron por competir visualmente con la Tarjeta de Identidad, que es
// el contenido protagonista. Sin librería de posicionamiento — mismo patrón
// `relative` + `absolute` sin portal que `RowMenu`, suficiente porque el
// trigger nunca vive cerca del borde de un contenedor con overflow recortado.
export function UserHoverCard({ username, children }: UserHoverCardProps) {
  const t = useTranslations("users");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PreviewState | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function load() {
    if (state) return;
    setState({ status: "loading" });
    fetchPreview(username)
      .then((preview) => setState({ status: "ready", preview }))
      .catch(() => setState({ status: "error" }));
  }

  function show(delay: number) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (open) return;
    openTimer.current = setTimeout(() => {
      setOpen(true);
      load();
    }, delay);
  }

  function hide(delay: number) {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), delay);
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => show(OPEN_DELAY_MS)}
      onMouseLeave={() => hide(CLOSE_DELAY_MS)}
      onFocus={() => show(0)}
      onBlur={() => hide(0)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-lg border border-ink-border bg-ink-surface p-4"
        >
          {state?.status === "loading" && (
            <div className="flex items-center justify-center py-4">
              <Spinner label={t("hoverCard.loading")} />
            </div>
          )}
          {state?.status === "error" && (
            <p className="font-body text-xs text-paper-muted">{t("hoverCard.error")}</p>
          )}
          {state?.status === "ready" && (
            <HoverCardBody preview={state.preview} />
          )}
        </div>
      )}
    </span>
  );
}

function HoverCardBody({ preview }: { preview: IdentityCardPreviewDto }) {
  const t = useTranslations("users");
  const name = preview.displayName ?? preview.username;

  const { identityCard } = preview;
  const slots = identityCard
    ? [
        identityCard.artist && { key: "artist", label: t("identityCard.artistLabel"), entity: identityCard.artist },
        identityCard.album && { key: "album", label: t("identityCard.albumLabel"), entity: identityCard.album },
        identityCard.anthem && { key: "anthem", label: t("showcase.anthemHeading"), entity: identityCard.anthem },
      ].filter((slot): slot is { key: string; label: string; entity: NonNullable<typeof identityCard.artist> } =>
        Boolean(slot),
      )
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <UserAvatar
          avatarUrl={preview.avatarUrl}
          username={preview.username}
          name={name}
          size="sm"
          className="rounded-lg"
        />
        <Link href={`/users/${preview.username}`} className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm text-paper hover:text-amber">{name}</span>
          <span className="block truncate font-data text-xs text-paper-muted">@{preview.username}</span>
        </Link>
        <FollowButton
          username={preview.username}
          relation={preview.relation}
          authenticated={preview.viewerAuthenticated}
          requestId={preview.id}
        />
      </div>

      {/* La bio permite hasta 200 caracteres (spec social-profiles) — se
          recorta a 2 líneas para que un texto largo no infle el popover. */}
      {preview.bio && <p className="line-clamp-2 font-body text-xs text-paper">{preview.bio}</p>}

      <div className="border-t border-ink-border pt-3">
        {!preview.accessible ? (
          <p className="font-body text-xs text-paper-muted">{t("privateNoticeTitle")}</p>
        ) : slots.length > 0 ? (
          <div className="flex gap-3">
            {slots.map((slot) => (
              <Link
                key={slot.key}
                href={targetHref(slot.entity.type, slot.entity.id)}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
              >
                <CoverThumb
                  cover={slot.entity.coverThumbUrl}
                  label=""
                  className="size-12 shrink-0 rounded-full border border-ink-border transition-colors group-hover:border-amber"
                />
                <span className="w-full min-w-0">
                  <span className="block truncate font-data text-[0.6rem] uppercase tracking-wide text-paper-muted">
                    {slot.label}
                  </span>
                  <span className="block truncate font-display text-xs text-paper transition-colors group-hover:text-amber">
                    {slot.entity.title}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="font-body text-xs text-paper-muted">{t("hoverCard.noIdentity")}</p>
        )}
      </div>
    </div>
  );
}

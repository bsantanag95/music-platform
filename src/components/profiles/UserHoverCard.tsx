"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { Spinner } from "@/components/ui/Spinner";
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

// Vista rápida de la Tarjeta de Identidad al pasar el cursor (o enfocar por
// teclado) un username — en comentarios, reseñas, y cualquier otro lugar que
// enlace a un perfil (openspec: rework-user-profile). Reutiliza los mismos
// datos que la página de perfil ("Opción D" de los mockups: una sola tarjeta
// contenedora, letra grande) escalados para un popover, no un componente
// nuevo de diseño. Sin librería de posicionamiento — mismo patrón `relative`
// + `absolute` sin portal que `RowMenu`, suficiente porque el trigger nunca
// vive cerca del borde de un contenedor con overflow recortado.
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
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-lg border border-ink-border bg-ink-surface p-4"
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

  if (!preview.accessible) {
    return (
      <div>
        <p className="font-display text-sm text-paper">{name}</p>
        <p className="mt-1 font-body text-xs text-paper-muted">{t("privateNoticeTitle")}</p>
      </div>
    );
  }

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
      <Link href={`/users/${preview.username}`} className="font-display text-sm text-paper hover:text-amber">
        {name}
      </Link>
      {slots.length > 0 ? (
        <div className="flex gap-3">
          {slots.map((slot) => (
            <Link
              key={slot.key}
              href={targetHref(slot.entity.type, slot.entity.id)}
              className="group flex flex-1 flex-col items-center gap-1.5 text-center"
            >
              <CoverThumb
                cover={slot.entity.coverThumbUrl}
                label=""
                className="size-12 shrink-0 rounded-full border border-ink-border transition-colors group-hover:border-amber"
              />
              <span className="min-w-0">
                <span className="block font-data text-[0.6rem] uppercase tracking-wide text-paper-muted">
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
  );
}

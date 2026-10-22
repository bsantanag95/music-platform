"use client";

import { useTranslations } from "next-intl";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { DiaryAudience, ListenEntry } from "@/lib/api/schemas";

// Imagen de una escucha según el tipo de objetivo (openspec: redesign-diary-page,
// D2): la API ya trae en `coverThumbUrl` la carátula del álbum, la de un álbum
// que contiene la canción o la foto del artista. Los artistas van en círculo,
// como en el resto de la app; sin imagen, el disco de vinilo con la misma forma.
export function diaryCover(entry: Pick<ListenEntry, "target">): { src: string | null; shape: "square" | "round" } {
  return {
    src: entry.target.coverThumbUrl,
    shape: entry.target.type === "artist" ? "round" : "square",
  };
}

export function DiaryCover({ entry, className }: { entry: Pick<ListenEntry, "target">; className: string }) {
  const { src, shape } = diaryCover(entry);
  return (
    <span data-cover-shape={shape} className="contents">
      <CoverThumb cover={src} label="" className={`${className} ${shape === "round" ? "!rounded-full" : ""}`} />
    </span>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

const AUDIENCE_ICONS: Record<DiaryAudience, () => React.JSX.Element> = {
  private: LockIcon,
  followers: PeopleIcon,
  public: GlobeIcon,
};

// Audiencia de una escucha como ícono con nombre accesible (openspec:
// redesign-diary-page, D3): escribir «Privado» en cada fila ocupaba espacio sin
// aportar, porque es el valor por defecto. El nombre sigue como `aria-label` y
// como `title` al pasar el mouse. Va al final de la línea secundaria y no en la
// columna de acciones: es un dato, no un control, y en 375px esa columna solo
// alcanza para los dos controles de 44px.
export function AudienceIcon({ audience, className = "" }: { audience: DiaryAudience; className?: string }) {
  const t = useTranslations("diary");
  const Icon = AUDIENCE_ICONS[audience];
  const label = t(`audience.${audience}`);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center text-paper-muted [&>svg]:size-3.5 ${className}`}
    >
      <Icon />
    </span>
  );
}

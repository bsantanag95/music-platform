"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { activateArtistJourney, setArtistJourneySelection } from "@/lib/api/artist-journeys";
import {
  ReleaseGroupCategorySchema,
  type ReleaseGroup,
  type ReleaseGroupCategory,
} from "@/lib/api/schemas";
import { ArtistJourneyAlbumGroups } from "./ArtistJourneyAlbumGroups";

interface ArtistJourneyStartModalProps {
  artistId: string;
  artistName: string;
  albums: ReleaseGroup[];
  categoryLabels: Record<ReleaseGroupCategory, string>;
  onClose: () => void;
}

const CATEGORY_ORDER = ReleaseGroupCategorySchema.options;

// Mismo criterio de orden que `AlbumGrid` y que `sortDiscographyByYear` del
// servicio: año ascendente, sin año al final, alfabético de desempate. Copia
// local porque el servicio vive en un módulo server-only (importa `db`) y
// este componente es de cliente — mismo trade-off que ya acepta `AlbumGrid`.
function sortByYear<T extends { title: string; firstReleaseYear: number | null }>(albums: T[]): T[] {
  return [...albums].sort((a, b) => {
    if (a.firstReleaseYear === null && b.firstReleaseYear === null) {
      return a.title.localeCompare(b.title);
    }
    if (a.firstReleaseYear === null) return 1;
    if (b.firstReleaseYear === null) return -1;
    return a.firstReleaseYear - b.firstReleaseYear || a.title.localeCompare(b.title);
  });
}

// Modal de inicio (openspec: add-artist-journey-management-page, revisión
// "armar recorrido"): único punto donde se crea un recorrido. Antes, "Armar
// recorrido" activaba de inmediato — persistiendo la preselección de estudio
// — y mandaba a la página de gestión; un clic accidental ya dejaba un
// recorrido creado que había que borrar, y "Guardar" aparecía deshabilitado
// sin que el usuario hubiera hecho nada, lo que se leía como una falla.
// Ahora "Armar recorrido" solo abre este modal: activar y guardar la
// selección elegida ocurren juntos, recién al confirmar "Guardar" acá, en
// una sola acción explícita. "Cancelar" cierra sin tocar el servidor — no se
// crea ningún recorrido.
export function ArtistJourneyStartModal({
  artistId,
  artistName,
  albums,
  categoryLabels,
  onClose,
}: ArtistJourneyStartModalProps) {
  const t = useTranslations("artistJourney");
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<ReleaseGroupCategory>>(
    () => new Set(CATEGORY_ORDER.filter((c) => c !== "studio")),
  );
  const sortedAlbums = useMemo(() => sortByYear(albums), [albums]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(albums.filter((a) => a.category === "studio").map((a) => a.id)),
  );
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled])",
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  function toggleCollapsed(category: ReleaseGroupCategory) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleAlbum(albumId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  }

  function toggleCategorySelection(albumIds: string[], allSelected: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of albumIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setErrorCode(null);
    try {
      // Dos llamadas a endpoints ya existentes en vez de uno nuevo: activar
      // es idempotente y pre-puebla estudio; guardar reemplaza esa selección
      // por la elegida acá (identidad si el usuario no tocó nada).
      await activateArtistJourney(artistId);
      await setArtistJourneySelection(artistId, [...selected]);
      router.push(`/me/artist-journeys/${artistId}`);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/70 p-4 pt-16"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={titleId} className="font-display text-lg text-paper">
              {t("modalTitle", { artist: artistName })}
            </h2>
            <p className="font-body text-xs text-paper-muted">{t("startHint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={t("modalClose")}
            className="shrink-0 font-data text-sm text-paper-muted transition-colors hover:text-paper disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {t("genericError")}
          </span>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          <ArtistJourneyAlbumGroups
            albums={sortedAlbums}
            selected={selected}
            collapsed={collapsed}
            categoryLabels={categoryLabels}
            onToggleAlbum={toggleAlbum}
            onToggleCategory={toggleCategorySelection}
            onToggleCollapsed={toggleCollapsed}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <Button variant="primary" disabled={saving} onClick={() => void save()}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

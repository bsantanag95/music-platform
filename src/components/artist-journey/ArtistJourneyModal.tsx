"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { setArtistJourneySelection } from "@/lib/api/artist-journeys";
import {
  ReleaseGroupCategorySchema,
  type ArtistJourneyDetail,
  type ReleaseGroupCategory,
} from "@/lib/api/schemas";

interface ArtistJourneyModalProps {
  artistId: string;
  artistName: string;
  journey: ArtistJourneyDetail;
  categoryLabels: Record<ReleaseGroupCategory, string>;
  onSaved: (journey: ArtistJourneyDetail) => void;
  onClose: () => void;
}

const CATEGORY_ORDER = ReleaseGroupCategorySchema.options;

// Chevron de colapsar/expandir por grupo — mismo lenguaje visual que
// `DiaryActivityList` (apunta hacia abajo expandido, hacia la derecha
// colapsado).
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={`shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Casillero "maestro" del grupo: reemplaza el enlace de texto
// "Seleccionar todo" por un checkbox real, con estado indeterminado cuando
// solo parte del grupo está marcada — mismo lenguaje visual que los
// casilleros de cada álbum, en vez de una acción de texto aparte.
function GroupSelectAllCheckbox({
  allSelected,
  someSelected,
  label,
  onToggle,
}: {
  allSelected: boolean;
  someSelected: boolean;
  label: string;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allSelected}
      onChange={onToggle}
      aria-label={label}
      className="size-4 shrink-0 accent-amber"
    />
  );
}

// Modal de gestión de la selección del recorrido: grupos por categoría,
// colapsables, con estudio expandido por defecto y el resto colapsado.
// Edita un **borrador local** — marcar/desmarcar casilleros y "Seleccionar
// todo"/"Deseleccionar todo" no llaman al servidor; solo "Guardar" envía el
// conjunto final completo en una sola petición (antes cada clic disparaba
// una llamada individual, lo que se sentía lento con discografías grandes).
// Cerrar sin guardar (Escape, fondo, ✕) descarta el borrador.
export function ArtistJourneyModal({
  artistId,
  artistName,
  journey,
  categoryLabels,
  onSaved,
  onClose,
}: ArtistJourneyModalProps) {
  const t = useTranslations("artistJourney");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<ReleaseGroupCategory>>(
    () => new Set(CATEGORY_ORDER.filter((c) => c !== "studio")),
  );
  const originalSelected = useMemo(
    () => new Set(journey.albums.filter((a) => a.selected).map((a) => a.id)),
    [journey],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(originalSelected));
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const dirty =
    selected.size !== originalSelected.size ||
    [...selected].some((id) => !originalSelected.has(id));

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
      onSaved(await setArtistJourneySelection(artistId, [...selected]));
      onClose();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setSaving(false);
    }
  }

  const grouped = new Map<ReleaseGroupCategory, typeof journey.albums>();
  for (const album of journey.albums) {
    const list = grouped.get(album.category) ?? [];
    list.push(album);
    grouped.set(album.category, list);
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
          <h2 id={titleId} className="font-display text-lg text-paper">
            {t("modalTitle", { artist: artistName })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("modalClose")}
            className="shrink-0 font-data text-sm text-paper-muted transition-colors hover:text-paper"
          >
            ✕
          </button>
        </div>

        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {t("genericError")}
          </span>
        )}

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {CATEGORY_ORDER.map((category) => {
            const albums = grouped.get(category);
            if (!albums?.length) return null;
            const isCollapsed = collapsed.has(category);
            const selectedCount = albums.filter((a) => selected.has(a.id)).length;
            const allSelected = selectedCount === albums.length;
            const someSelected = selectedCount > 0 && !allSelected;

            return (
              <div key={category} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleCollapsed(category)}
                    className="flex min-w-0 items-center gap-1.5 text-paper-muted transition-colors hover:text-paper"
                  >
                    <ChevronIcon expanded={!isCollapsed} />
                    <span className="truncate font-data text-xs uppercase tracking-wider">
                      {categoryLabels[category]}
                    </span>
                    <span className="shrink-0 font-data text-xs text-paper-muted">
                      ({selectedCount}/{albums.length})
                    </span>
                  </button>
                  <GroupSelectAllCheckbox
                    allSelected={allSelected}
                    someSelected={someSelected}
                    label={t(allSelected ? "deselectAllAria" : "selectAllAria", {
                      category: categoryLabels[category],
                    })}
                    onToggle={() =>
                      toggleCategorySelection(
                        albums.map((a) => a.id),
                        allSelected,
                      )
                    }
                  />
                </div>

                {!isCollapsed && (
                  <ul className="flex flex-col divide-y divide-ink-border border-t border-ink-border">
                    {albums.map((album) => (
                      <li key={album.id} className="flex items-center gap-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={selected.has(album.id)}
                          onChange={() => toggleAlbum(album.id)}
                          aria-label={t("toggleAlbum", { title: album.title })}
                          className="size-4 shrink-0 accent-amber"
                        />
                        <span className="min-w-0 flex-1 truncate font-body text-sm text-paper">
                          {album.title}
                        </span>
                        {album.firstReleaseYear !== null && (
                          <span className="shrink-0 font-data text-xs text-paper-muted">
                            {album.firstReleaseYear}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("cancel")}
          </button>
          <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

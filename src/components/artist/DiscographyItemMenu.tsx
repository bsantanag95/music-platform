"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlbumListPicker, type PickerMembership } from "@/components/album/AlbumListPicker";
import { BookmarkIcon, HeartIcon, ToggleChip } from "@/components/album/AlbumRelationPanel";
import { formatStars } from "@/components/album/album-format";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { createListenEntry } from "@/lib/api/diary";
import { toggleFavorite } from "@/lib/api/favorites";
import { saveRating } from "@/lib/api/social";
import { toggleWantToListen } from "@/lib/api/want-to-listen";
import type { ListenEntry } from "@/lib/api/schemas";
import { isScoreCoherent } from "@/lib/rating-range";

// Menú "…" de acciones de un disco en la discografía del artista (openspec:
// add-discography-quick-actions, capability `discography-quick-actions`). Es un diálogo no
// modal y no un `role="menu"`: mezcla botones, conmutadores, estrellas, casillas de listas y el
// formulario de detalles de la escucha. Cada acción se comporta como en el panel "Tu relación"
// del álbum y actualiza las marcas del disco al confirmarse.

/** Marcas del usuario sobre un disco. */
export interface DiscMarks {
  listened: boolean;
  stars: number | null;
  detailedScore: number | null;
  favorite: boolean;
  pending: boolean;
  lists: PickerMembership[];
}

interface DiscographyItemMenuProps {
  item: { id: string; title: string };
  /** `null` para visitantes sin sesión. */
  marks: DiscMarks | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarksChange: (update: (current: DiscMarks) => DiscMarks) => void;
  /** Estilo del botón: sobre la carátula (grilla) o en la fila (tabla). */
  variant: "cover" | "row";
  className?: string;
}

/** Ancho del popover en pantallas `sm` o más (18rem), para decidir hacia dónde abre. */
const POPOVER_WIDTH = 288;

export function DiscographyItemMenu({ item, marks, open, onOpenChange, onMarksChange, variant, className = "" }: DiscographyItemMenuProps) {
  const t = useTranslations("catalog.artist.discography.menu");
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [alignLeft, setAlignLeft] = useState(false);
  // Última versión del callback, para no reinstalar los listeners en cada render.
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  // Abre hacia la izquierda salvo que se salga de la discografía (tarjetas de las primeras
  // columnas): entonces abre hacia la derecha.
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const bounds = button.current.closest("[data-menu-bounds]")?.getBoundingClientRect().left ?? 16;
    setAlignLeft(button.current.getBoundingClientRect().right - POPOVER_WIDTH < bounds);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    popover.current?.querySelector<HTMLElement>("button, a[href], input, textarea, select")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpenChangeRef.current(false);
      button.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) onOpenChangeRef.current(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const buttonClass =
    variant === "cover"
      ? "flex size-8 items-center justify-center rounded bg-ink/85 text-paper transition-colors hover:text-amber"
      : "flex size-8 items-center justify-center rounded text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper";

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("open", { title: item.title })}
        onClick={() => onOpenChange(!open)}
        className={buttonClass}
      >
        <DotsIcon />
      </button>
      {open && (
        <div
          ref={popover}
          role="dialog"
          aria-labelledby={titleId}
          className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-t-lg border border-ink-border bg-ink-surface p-4 sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-1 sm:w-72 sm:rounded ${
            alignLeft ? "sm:left-0" : "sm:right-0"
          }`}
        >
          <p id={titleId} className="truncate font-display text-sm text-paper">
            {item.title}
          </p>
          {marks ? (
            <MenuActions item={item} marks={marks} onMarksChange={onMarksChange} />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="font-body text-sm text-paper">{t("signInPrompt")}</p>
              <Link href="/auth/login" className="self-start font-display text-sm text-amber hover:underline">
                {t("signIn")}
              </Link>
            </div>
          )}
          <Link href={`/album/${item.id}`} className="self-start font-data text-xs text-amber hover:underline">
            {t("goToAlbum")} →
          </Link>
        </div>
      )}
    </div>
  );
}

function MenuActions({
  item,
  marks,
  onMarksChange,
}: {
  item: { id: string; title: string };
  marks: DiscMarks;
  onMarksChange: DiscographyItemMenuProps["onMarksChange"];
}) {
  const t = useTranslations("catalog.artist.discography.menu");
  const tAlbum = useTranslations("catalog.album.relation");
  const locale = useLocale();
  const target = { type: "release-group" as const, id: item.id };
  const [busy, setBusy] = useState<"listen" | "favorite" | "pending" | "rating" | null>(null);
  const [error, setError] = useState(false);
  const [entry, setEntry] = useState<ListenEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<void>) {
    setBusy(kind);
    setError(false);
    setNotice(null);
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  const logListen = () =>
    run("listen", async () => {
      const created = await createListenEntry(target);
      setEntry(created);
      setDetailsOpen(false);
      // Registrar una escucha retira el disco de Pendiente (spec want-to-listen).
      onMarksChange((current) => ({ ...current, listened: true, pending: false }));
    });

  const toggleFav = () =>
    run("favorite", async () => {
      const favorite = (await toggleFavorite(target)) !== null;
      onMarksChange((current) => ({ ...current, favorite }));
    });

  const togglePending = () =>
    run("pending", async () => {
      const pending = (await toggleWantToListen(target)) !== null;
      onMarksChange((current) => ({ ...current, pending }));
    });

  // Mismo criterio que el panel del álbum: el puntaje detallado se conserva solo si sigue
  // cayendo en el tramo de las nuevas estrellas; si no, se guarda sin él y se avisa.
  const rate = (value: number) =>
    run("rating", async () => {
      const score = marks.detailedScore;
      const keepScore = score !== null && isScoreCoherent(value, score);
      await saveRating("release-group", item.id, { stars: value, ...(keepScore ? { detailedScore: score } : {}) });
      onMarksChange((current) => ({ ...current, stars: value, detailedScore: keepScore ? score : null }));
      if (score !== null && !keepScore) setNotice(tAlbum("scoreDropped", { score, stars: formatStars(value, locale) }));
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={busy === "listen"}
          onClick={() => void logListen()}
          className="inline-flex min-h-10 items-center justify-center rounded border border-ink-border px-3 font-body text-sm text-paper transition-colors hover:border-amber disabled:cursor-wait disabled:opacity-60"
        >
          {busy === "listen" ? t("logging") : t("logListen")}
        </button>
        {entry && !detailsOpen && (
          <p role="status" className="font-data text-xs text-paper-muted">
            {t("listenLogged")} ·{" "}
            <button type="button" className="text-amber underline-offset-2 hover:underline" onClick={() => setDetailsOpen(true)}>
              {t("addDetails")}
            </button>
          </p>
        )}
        {entry && detailsOpen && (
          <ListenEntryForm
            entryId={entry.id}
            target={entry.target}
            initial={{ listenContext: entry.listenContext, body: entry.body, reaction: entry.reaction, audience: entry.audience }}
            onSaved={(saved) => {
              setEntry(saved);
              setDetailsOpen(false);
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ToggleChip
          pressed={marks.favorite}
          disabled={busy === "favorite"}
          onClick={() => void toggleFav()}
          icon={<HeartIcon filled={marks.favorite} />}
          label={t("favorite")}
        />
        <ToggleChip
          pressed={marks.pending}
          disabled={busy === "pending"}
          onClick={() => void togglePending()}
          icon={<BookmarkIcon filled={marks.pending} />}
          label={t("pending")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-body text-sm text-paper-muted">{t("rating")}</span>
        <StarRatingInput
          value={marks.stars}
          onChange={(value) => void rate(value)}
          legend={tAlbum("starsLegend")}
          valueLabel={(value) => tAlbum("starsValue", { stars: formatStars(value, locale) })}
          disabled={busy === "rating"}
        />
        {notice && (
          <p role="status" className="font-data text-xs text-paper-muted">
            {notice}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((value) => !value)}
          className="self-start font-data text-xs text-amber underline-offset-2 hover:underline"
        >
          {pickerOpen ? t("closeLists") : t("addToList")}
        </button>
        {pickerOpen && (
          <AlbumListPicker
            target={target}
            memberships={marks.lists}
            onMembershipsChange={(update) => onMarksChange((current) => ({ ...current, lists: update(current.lists) }))}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      )}
    </div>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

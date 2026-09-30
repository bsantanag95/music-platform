"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { AlbumListPicker, type PickerMembership } from "@/components/album/AlbumListPicker";
import { BookmarkIcon, HeartIcon, ToggleChip } from "@/components/album/AlbumRelationPanel";
import { formatStars } from "@/components/album/album-format";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { getReleaseGroupMarks } from "@/lib/api/catalog";
import { createListenEntry } from "@/lib/api/diary";
import { toggleFavorite } from "@/lib/api/favorites";
import { saveRating } from "@/lib/api/social";
import { toggleWantToListen } from "@/lib/api/want-to-listen";
import type { ListenEntry } from "@/lib/api/schemas";
import { isScoreCoherent } from "@/lib/rating-range";

// Menú "…" de acciones de un disco (openspec: add-discography-quick-actions y
// extend-album-quick-actions, capabilities `discography-quick-actions` y `album-quick-actions`).
// Es un diálogo no modal y no un `role="menu"`: mezcla botones, conmutadores, estrellas, casillas
// de listas y el formulario de detalles de la escucha. Cada acción se comporta como en el panel
// "Tu relación" del álbum. Las marcas llegan precargadas (discografía del artista) o se piden al
// abrir el menú (búsqueda, Explorar, listas ajenas, tira del álbum).

/** Marcas del usuario sobre un disco. */
export interface DiscMarks {
  listened: boolean;
  stars: number | null;
  detailedScore: number | null;
  favorite: boolean;
  pending: boolean;
  lists: PickerMembership[];
}

interface AlbumQuickActionsProps {
  item: { id: string; title: string };
  /**
   * Marcas precargadas: `null` para visitantes sin sesión. Sin esta prop, el menú las pide al
   * abrirse si hay sesión (`authenticated`).
   */
  marks?: DiscMarks | null;
  authenticated?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Avisa cada cambio de marcas confirmado (la discografía las muestra en la tarjeta). */
  onMarksChange?: (update: (current: DiscMarks) => DiscMarks) => void;
  /** Estilo del botón: sobre la carátula o en una fila. */
  variant: "cover" | "row";
  /** Acciones que solo ofrece una superficie (Explorar: "Ver en listas" y colección). */
  extraActions?: ReactNode;
  /**
   * `fixed`: en pantallas `sm` o más, el popover se ubica con coordenadas de la ventana y se
   * cierra al hacer scroll. Para botones dentro de un contenedor desplazable, que recortaría un
   * popover absoluto (la tira de la discografía del álbum).
   */
  positioning?: "absolute" | "fixed";
  className?: string;
}

/** Ancho del popover en pantallas `sm` o más (18rem), para decidir hacia dónde abre. */
const POPOVER_WIDTH = 288;

const LOADING_MARKS: DiscMarks = { listened: false, stars: null, detailedScore: null, favorite: false, pending: false, lists: [] };

export function AlbumQuickActions({
  item,
  marks: preloaded,
  authenticated = false,
  open,
  onOpenChange,
  onMarksChange,
  variant,
  extraActions,
  positioning = "absolute",
  className = "",
}: AlbumQuickActionsProps) {
  const t = useTranslations("catalog.albumActions");
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [alignLeft, setAlignLeft] = useState(false);
  const [fixedPosition, setFixedPosition] = useState<{ top: number; left: number } | null>(null);
  // Marcas pedidas al abrir (sin precarga): se conservan entre aperturas del mismo disco.
  const onDemand = preloaded === undefined;
  const [fetched, setFetched] = useState<DiscMarks | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  // Última versión del callback, para no reinstalar los listeners en cada render.
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  const loadMarks = useCallback(async () => {
    setLoadState("loading");
    try {
      setFetched(await getReleaseGroupMarks(item.id));
      setLoadState("idle");
    } catch {
      setLoadState("error");
    }
  }, [item.id]);

  // Al abrir, una sola vez por disco: con las marcas ya cargadas, o con un error a la vista
  // (se reintenta a pedido), no se vuelve a pedir.
  useEffect(() => {
    if (open && onDemand && authenticated && fetched === null && loadState === "idle") void loadMarks();
  }, [open, onDemand, authenticated, fetched, loadState, loadMarks]);

  // Abre hacia la izquierda salvo que se salga del contenedor (`data-menu-bounds`, por ejemplo
  // tarjetas de las primeras columnas): entonces abre hacia la derecha.
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const rect = button.current.getBoundingClientRect();
    const bounds = button.current.closest("[data-menu-bounds]")?.getBoundingClientRect().left ?? 16;
    const left = rect.right - POPOVER_WIDTH < bounds;
    setAlignLeft(left);
    // En móvil es una hoja inferior: no hacen falta coordenadas.
    if (positioning === "fixed" && window.matchMedia("(min-width: 640px)").matches) {
      setFixedPosition({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(left ? rect.left : rect.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 8)),
      });
    } else {
      setFixedPosition(null);
    }
  }, [open, positioning]);

  // Con coordenadas de la ventana, un scroll (de la página o del contenedor) lo dejaría flotando
  // lejos de su botón: se cierra.
  useEffect(() => {
    if (!open || !fixedPosition) return;
    const close = () => onOpenChangeRef.current(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, fixedPosition]);

  useEffect(() => {
    if (!open) return;
    popover.current?.querySelector<HTMLElement>("button:not([disabled]), a[href], input, textarea, select")?.focus();
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

  const signedIn = onDemand ? authenticated : preloaded !== null;
  const marks = onDemand ? fetched : (preloaded ?? null);
  const updateMarks = (update: (current: DiscMarks) => DiscMarks) => {
    if (onDemand) setFetched((current) => update(current ?? LOADING_MARKS));
    onMarksChange?.(update);
  };

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
          aria-busy={loadState === "loading" || undefined}
          style={
            fixedPosition
              ? {
                  position: "fixed",
                  top: fixedPosition.top,
                  left: fixedPosition.left,
                  right: "auto",
                  bottom: "auto",
                  // Cerca del borde inferior, el contenido se desplaza en vez de salirse de la ventana.
                  maxHeight: `calc(100vh - ${fixedPosition.top}px - 8px)`,
                }
              : undefined
          }
          className={`fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col gap-3 overflow-y-auto rounded-t-lg border border-ink-border bg-ink-surface p-4 text-left sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-1 sm:w-72 sm:rounded ${
            alignLeft ? "sm:left-0" : "sm:right-0"
          }`}
        >
          <p id={titleId} className="truncate font-display text-sm text-paper">
            {item.title}
          </p>
          {!signedIn ? (
            <div className="flex flex-col gap-2">
              <p className="font-body text-sm text-paper">{t("signInPrompt")}</p>
              <Link href="/auth/login" className="self-start font-display text-sm text-amber hover:underline">
                {t("signIn")}
              </Link>
            </div>
          ) : loadState === "error" ? (
            <p role="alert" className="font-data text-xs text-danger">
              {t("loadError")}{" "}
              <button type="button" onClick={() => void loadMarks()} className="text-amber underline-offset-2 hover:underline">
                {t("retry")}
              </button>
            </p>
          ) : (
            // Mientras llegan las marcas, las acciones se ven con su forma final y deshabilitadas.
            <MenuActions item={item} marks={marks ?? LOADING_MARKS} loading={marks === null} onMarksChange={updateMarks} />
          )}
          {extraActions && <div className="flex flex-col items-start gap-1.5 border-t border-ink-border pt-3">{extraActions}</div>}
          <Link href={albumHref(null, item.title, item.id)} className="self-start font-data text-xs text-amber hover:underline">
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
  loading,
  onMarksChange,
}: {
  item: { id: string; title: string };
  marks: DiscMarks;
  loading: boolean;
  onMarksChange: (update: (current: DiscMarks) => DiscMarks) => void;
}) {
  const t = useTranslations("catalog.albumActions");
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
          disabled={loading || busy === "listen"}
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
          disabled={loading || busy === "favorite"}
          onClick={() => void toggleFav()}
          icon={<HeartIcon filled={marks.favorite} />}
          label={t("favorite")}
        />
        <ToggleChip
          pressed={marks.pending}
          disabled={loading || busy === "pending"}
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
          disabled={loading || busy === "rating"}
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
          disabled={loading}
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

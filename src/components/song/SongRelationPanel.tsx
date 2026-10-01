"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { AlbumListPicker, type PickerMembership } from "@/components/album/AlbumListPicker";
import { HeartIcon } from "@/components/album/AlbumRelationPanel";
import { RatingDetailDialog } from "@/components/album/RatingDetailDialog";
import { formatStars } from "@/components/album/album-format";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createListenEntry } from "@/lib/api/diary";
import { toggleFavorite } from "@/lib/api/favorites";
import { deleteRating, getRatings, saveRating } from "@/lib/api/social";
import { isScoreCoherent } from "@/lib/rating-range";
import type { ListenEntry, ListenReaction, RatingsResponse } from "@/lib/api/schemas";

// Panel "Tu relación" de la página de canción (openspec: redesign-song-page, capability
// `song-personal-panel`). Mismo lenguaje que el panel del álbum, con las filas que aplican a
// una canción: Nota (estrellas siempre visibles), Escuchas (la reacción se elige al
// registrar, en el diario; el historial es una línea), Favorita y Listas. Sin reseña,
// Pendiente ni colección.

export interface SongRelationState {
  ratings: RatingsResponse;
  listens: { count: number; lastAt: string | null; lastReaction: ListenReaction | null };
  favorited: boolean;
  ownListMemberships: PickerMembership[];
}

interface SongRelationPanelProps {
  recordingId: string;
  /** `null` para visitantes anónimos. */
  state: SongRelationState | null;
}

const panelClass = "flex flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4";
const linkButton =
  "font-data text-xs text-amber underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50";
const divider = "border-t border-ink-border";

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="font-body text-sm text-paper-muted">{label}</span>
      <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">{children}</span>
    </div>
  );
}

export function SongRelationPanel({ recordingId, state }: SongRelationPanelProps) {
  const t = useTranslations("catalog.song.relation");
  const tAlbum = useTranslations("catalog.album.relation");

  if (!state) {
    return (
      <aside aria-label={tAlbum("heading")} className={panelClass}>
        <h2 className="font-display text-sm text-paper-muted">{tAlbum("heading")}</h2>
        <p className="font-body text-sm text-paper">{t("signInPrompt")}</p>
        <Link href="/auth/login" className="self-start font-display text-sm text-amber hover:underline">
          {tAlbum("signIn")}
        </Link>
      </aside>
    );
  }

  return <AuthenticatedPanel recordingId={recordingId} state={state} />;
}

function AuthenticatedPanel({ recordingId, state }: { recordingId: string; state: SongRelationState }) {
  const t = useTranslations("catalog.song.relation");
  const tAlbum = useTranslations("catalog.album.relation");
  const tReaction = useTranslations("diary.reaction");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const target = { type: "recording" as const, id: recordingId };

  const [own, setOwn] = useState(state.ratings.own);
  const [stars, setStars] = useState(state.ratings.own?.stars ?? null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingNotice, setRatingNotice] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [listens, setListens] = useState(state.listens);
  const [loggedEntry, setLoggedEntry] = useState<ListenEntry | null>(null);
  const [favorited, setFavorited] = useState(state.favorited);
  const [memberships, setMemberships] = useState(state.ownListMemberships);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<"listen" | "favorite" | null>(null);
  const [error, setError] = useState(false);
  const listsChanged = useRef(false);
  const listsButton = useRef<HTMLButtonElement>(null);
  // Solo la última valoración enviada aplica su respuesta (como en el panel del álbum).
  const ratingSeq = useRef(0);

  async function run(kind: "listen" | "favorite", action: () => Promise<void>) {
    setBusy(kind);
    setError(false);
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  const applyRatings = (updated: RatingsResponse) => {
    setOwn(updated.own);
    setStars(updated.own?.stars ?? null);
    // La media del bloque de comunidad se recalcula en el servidor.
    router.refresh();
  };

  async function rate(value: number) {
    const seq = ++ratingSeq.current;
    const previous = own?.stars ?? null;
    const score = own?.detailedScore ?? null;
    const keepScore = score !== null && isScoreCoherent(value, score);
    setStars(value);
    setRatingBusy(true);
    setRatingNotice(null);
    setError(false);
    try {
      await saveRating("recording", recordingId, { stars: value, ...(keepScore ? { detailedScore: score } : {}) });
      const updated = await getRatings("recording", recordingId);
      if (seq !== ratingSeq.current) return;
      applyRatings(updated);
      if (score !== null && !keepScore) {
        setRatingNotice(tAlbum("scoreDropped", { score, stars: formatStars(value, locale) }));
      }
    } catch {
      if (seq !== ratingSeq.current) return;
      setStars(previous);
      setError(true);
    } finally {
      if (seq === ratingSeq.current) setRatingBusy(false);
    }
  }

  // Borra la valoración propia (estrellas y puntuación detallada) como si nunca se hubiera hecho.
  function clearRating() {
    setClearOpen(false);
    const seq = ++ratingSeq.current;
    setRatingBusy(true);
    setRatingNotice(null);
    setError(false);
    void (async () => {
      try {
        await deleteRating("recording", recordingId);
        const updated = await getRatings("recording", recordingId);
        if (seq !== ratingSeq.current) return;
        applyRatings(updated);
      } catch {
        if (seq !== ratingSeq.current) return;
        setError(true);
      } finally {
        if (seq === ratingSeq.current) setRatingBusy(false);
      }
    })();
  }

  // Registrar abre el formulario del diario en seguida: ahí se elige la reacción.
  const logListen = () =>
    run("listen", async () => {
      const entry = await createListenEntry(target);
      setLoggedEntry(entry);
      setListens((current) => ({ count: current.count + 1, lastAt: entry.createdAt, lastReaction: entry.reaction }));
    });

  const toggleFav = () =>
    run("favorite", async () => {
      setFavorited((await toggleFavorite(target)) !== null);
    });

  const closePicker = () => {
    setPickerOpen(false);
    listsButton.current?.focus();
    if (listsChanged.current) {
      listsChanged.current = false;
      router.refresh();
    }
  };

  const detailedScore = own?.detailedScore ?? null;
  const lastDate = listens.lastAt
    ? format.dateTime(new Date(listens.lastAt), { day: "numeric", month: "short" })
    : null;

  return (
    <aside aria-label={tAlbum("heading")} className={panelClass}>
      <h2 className="font-display text-sm text-paper-muted">{tAlbum("heading")}</h2>

      <div className="flex flex-col gap-1">
        <Row label={tAlbum("rating")}>
          <StarRatingInput
            value={stars}
            onChange={(value) => void rate(value)}
            legend={tAlbum("starsLegend")}
            valueLabel={(value) => tAlbum("starsValue", { stars: formatStars(value, locale) })}
          />
          <button
            type="button"
            disabled={ratingBusy}
            aria-label={detailedScore !== null ? tAlbum("detailEdit", { score: detailedScore }) : tAlbum("detailAdd")}
            onClick={() => setDetailOpen(true)}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded border border-ink-border px-1.5 font-data text-xs text-paper transition-colors hover:border-amber disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:min-w-8"
          >
            {detailedScore !== null ? tAlbum("detailScale", { score: detailedScore }) : "+"}
          </button>
          {own && (
            <button
              type="button"
              disabled={ratingBusy}
              onClick={() => setClearOpen(true)}
              className="font-data text-xs text-danger underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tAlbum("clearRating")}
            </button>
          )}
        </Row>
        {ratingNotice && (
          <p role="status" className="font-data text-xs text-paper-muted">
            {ratingNotice}
          </p>
        )}
        {detailOpen && (
          <RatingDetailDialog
            open
            onClose={() => setDetailOpen(false)}
            target={target}
            own={own ?? undefined}
            onChange={(updated) => {
              setRatingNotice(null);
              applyRatings(updated);
            }}
          />
        )}
        <ConfirmDialog
          open={clearOpen}
          title={tAlbum("clearRatingTitle")}
          message={tAlbum("clearRatingMessage")}
          confirmLabel={tAlbum("clearRatingConfirm")}
          cancelLabel={tAlbum("detail.cancel")}
          danger
          onConfirm={clearRating}
          onCancel={() => setClearOpen(false)}
        />
      </div>

      <div className={`flex flex-col gap-2 pt-3 ${divider}`}>
        <Row label={tAlbum("listens")}>
          <button type="button" className={linkButton} disabled={busy === "listen"} onClick={() => void logListen()}>
            {busy === "listen" ? tAlbum("logging") : t("logListen")}
          </button>
        </Row>
        {/* Segunda línea fija: el historial a la izquierda y el diario a la derecha. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-body text-sm text-paper">
            {listens.count === 0
              ? tAlbum("listensNone")
              : listens.lastReaction && lastDate
                ? t("historyWithReaction", {
                    count: listens.count,
                    reaction: tReaction(listens.lastReaction),
                    date: lastDate,
                  })
                : lastDate
                  ? t("history", { count: listens.count, date: lastDate })
                  : t("historyCount", { count: listens.count })}
          </span>
          {listens.count > 0 && (
            <Link href="/me/diary" className={linkButton}>
              {t("diaryLink")} →
            </Link>
          )}
        </div>
        {loggedEntry && (
          <ListenEntryForm
            entryId={loggedEntry.id}
            target={loggedEntry.target}
            initial={{
              listenContext: loggedEntry.listenContext,
              body: loggedEntry.body,
              reaction: loggedEntry.reaction,
              audience: loggedEntry.audience,
            }}
            onSaved={(saved) => {
              setLoggedEntry(null);
              setListens((current) => ({ ...current, lastReaction: saved.reaction }));
            }}
          />
        )}

      </div>

      {/* Favorita como fila compacta, con el mismo ritmo que las demás (polish-song-header). */}
      <div className={`pt-3 ${divider}`}>
        <Row label={<span className={favorited ? "text-paper" : undefined}>{t("favorite")}</span>}>
          <button
            type="button"
            aria-pressed={favorited}
            aria-label={t("favorite")}
            disabled={busy === "favorite"}
            onClick={() => void toggleFav()}
            className="inline-flex size-10 items-center justify-center rounded border border-ink-border text-paper-muted transition-colors hover:border-amber hover:text-paper aria-pressed:border-amber aria-pressed:text-amber disabled:cursor-wait disabled:opacity-60 sm:size-8"
          >
            <HeartIcon filled={favorited} />
          </button>
        </Row>
      </div>

      <div className={`flex flex-col gap-1 pt-3 ${divider}`}>
        <Row
          label={
            <span className={memberships.length > 0 ? "text-paper" : undefined}>
              {tAlbum("lists", { count: memberships.length })}
            </span>
          }
        >
          <button
            ref={listsButton}
            type="button"
            className={linkButton}
            aria-expanded={pickerOpen}
            onClick={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
          >
            {pickerOpen ? tAlbum("close") : tAlbum("chooseLists")}
          </button>
        </Row>
        {pickerOpen && (
          <AlbumListPicker
            target={target}
            memberships={memberships}
            onMembershipsChange={(update) => {
              listsChanged.current = true;
              setMemberships(update);
            }}
            onClose={closePicker}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="font-data text-xs text-danger">
          {tAlbum("saveError")}
        </p>
      )}
    </aside>
  );
}

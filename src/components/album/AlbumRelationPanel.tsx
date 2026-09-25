"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link, useRouter, useSearchParams } from "@/i18n/navigation";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { CollectionAlbumAction } from "@/components/collection/CollectionAlbumAction";
import { REVIEW_COMPOSER_ANCHOR, revealReviewComposer } from "@/components/album/ReviewComposer";
import { AlbumListPicker, type PickerMembership } from "@/components/album/AlbumListPicker";
import { RatingDetailDialog } from "@/components/album/RatingDetailDialog";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { createListenEntry } from "@/lib/api/diary";
import { toggleFavorite } from "@/lib/api/favorites";
import { getRatings, saveRating } from "@/lib/api/social";
import { toggleWantToListen } from "@/lib/api/want-to-listen";
import { isScoreCoherent } from "@/lib/rating-range";
import type { CollectionEntry, ListenEntry, RatingsResponse, WantedEntry } from "@/lib/api/schemas";
import { formatStars } from "./album-format";

// Panel "Tu relación" de la página de álbum (openspec: redesign-album-page, rehecho en
// rework-album-relation-panel). Reúne todas las acciones personales sobre el álbum y
// muestra estado en lugar de botones sueltos: cada fila dice qué hiciste y es su propia
// acción. Todas las filas están siempre visibles, también en móvil: no hay "Más acciones".

export interface AlbumRelationState {
  ratings: RatingsResponse;
  ownReviewId: string | null;
  listens: { count: number; lastAt: string | null };
  favorited: boolean;
  pending: boolean;
  collectionEntries: CollectionEntry[];
  wantedEntries: WantedEntry[];
  /** Listas y Caminos propios que contienen el álbum (sin recorridos de artista). */
  ownListMemberships: PickerMembership[];
}

interface AlbumRelationPanelProps {
  releaseGroupId: string;
  /** `null` para visitantes anónimos. */
  state: AlbumRelationState | null;
}

/** Deep-link `?collection=have|want` desde el menú "···" de `AlbumCard`. */
function parseCollectionChoice(value: string | null): "have" | "want" | undefined {
  return value === "have" || value === "want" ? value : undefined;
}

const panelClass = "flex flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4";

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="font-body text-sm text-paper-muted">{label}</span>
      <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">{children}</span>
    </div>
  );
}

const linkButton =
  "font-data text-xs text-amber underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50";

const divider = "border-t border-ink-border";

export function AlbumRelationPanel({ releaseGroupId, state }: AlbumRelationPanelProps) {
  const t = useTranslations("catalog.album.relation");

  if (!state) {
    return (
      <aside aria-label={t("heading")} className={panelClass}>
        <h2 className="font-display text-sm text-paper-muted">{t("heading")}</h2>
        <p className="font-body text-sm text-paper">{t("signInPrompt")}</p>
        <Link href="/auth/login" className="self-start font-display text-sm text-amber hover:underline">
          {t("signIn")}
        </Link>
      </aside>
    );
  }

  return <AuthenticatedPanel releaseGroupId={releaseGroupId} state={state} />;
}

function AuthenticatedPanel({
  releaseGroupId,
  state,
}: AlbumRelationPanelProps & { state: AlbumRelationState }) {
  const t = useTranslations("catalog.album.relation");
  const tCollection = useTranslations("collection");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const initialCollectionChoice = parseCollectionChoice(useSearchParams().get("collection"));
  const target = { type: "release-group" as const, id: releaseGroupId };

  const [own, setOwn] = useState(state.ratings.own);
  const [stars, setStars] = useState(state.ratings.own?.stars ?? null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingNotice, setRatingNotice] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [listens, setListens] = useState(state.listens);
  const [loggedEntry, setLoggedEntry] = useState<ListenEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [favorited, setFavorited] = useState(state.favorited);
  const [pending, setPending] = useState(state.pending);
  const [entries, setEntries] = useState(state.collectionEntries);
  const [wanted, setWanted] = useState(state.wantedEntries);
  const [collectionOpen, setCollectionOpen] = useState(initialCollectionChoice !== undefined);
  const [memberships, setMemberships] = useState(state.ownListMemberships);
  const [pickerOpen, setPickerOpen] = useState(false);
  const listsChanged = useRef(false);
  // Solo la última valoración enviada aplica su respuesta: las estrellas no se deshabilitan
  // mientras se guarda (perderían el foco del teclado), así que puede haber varias en vuelo.
  const ratingSeq = useRef(0);
  const listsButton = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<"listen" | "favorite" | "pending" | null>(null);
  const [error, setError] = useState(false);

  async function run(kind: "listen" | "favorite" | "pending", action: () => Promise<void>) {
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
    // La media y el histograma del bloque de comunidad se recalculan en el servidor.
    router.refresh();
  };

  // Un clic guarda (spec: valoración en línea). Si el puntaje detallado vigente deja de
  // caer en el tramo de las nuevas estrellas, se guarda sin él y se avisa: el `CHECK` de
  // `rating` rechazaría la combinación.
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
      await saveRating("release-group", releaseGroupId, {
        stars: value,
        ...(keepScore ? { detailedScore: score } : {}),
      });
      const updated = await getRatings("release-group", releaseGroupId);
      if (seq !== ratingSeq.current) return;
      applyRatings(updated);
      if (score !== null && !keepScore) {
        setRatingNotice(t("scoreDropped", { score, stars: formatStars(value, locale) }));
      }
    } catch {
      if (seq !== ratingSeq.current) return;
      setStars(previous);
      setError(true);
    } finally {
      if (seq === ratingSeq.current) setRatingBusy(false);
    }
  }

  const logListen = () =>
    run("listen", async () => {
      const entry = await createListenEntry(target);
      setLoggedEntry(entry);
      setDetailsOpen(false);
      setListens((current) => ({ count: current.count + 1, lastAt: entry.createdAt }));
      // Registrar una escucha retira el álbum de Pendiente (spec want-to-listen).
      setPending(false);
    });

  const toggleFav = () =>
    run("favorite", async () => {
      setFavorited((await toggleFavorite(target)) !== null);
    });

  const togglePending = () =>
    run("pending", async () => {
      setPending((await toggleWantToListen(target)) !== null);
    });

  const closePicker = () => {
    setPickerOpen(false);
    listsButton.current?.focus();
    // El conteo de listas visibles del bloque de comunidad sale del servidor.
    if (listsChanged.current) {
      listsChanged.current = false;
      router.refresh();
    }
  };

  const hasCollection = entries.length > 0 || wanted.length > 0;
  const formats = [...new Set(entries.map((entry) => tCollection(`format.${entry.format}`)))].join(", ");
  const detailedScore = own?.detailedScore ?? null;

  return (
    <aside aria-label={t("heading")} className={panelClass}>
      <h2 className="font-display text-sm text-paper-muted">{t("heading")}</h2>

      <div className="flex flex-col gap-1">
        <Row label={t("rating")}>
          <StarRatingInput
            value={stars}
            onChange={(value) => void rate(value)}
            legend={t("starsLegend")}
            valueLabel={(value) => t("starsValue", { stars: formatStars(value, locale) })}
          />
          <button
            type="button"
            disabled={!own || ratingBusy}
            title={own ? undefined : t("detailNeedsStars")}
            aria-label={
              !own ? t("detailNeedsStars") : detailedScore !== null ? t("detailEdit", { score: detailedScore }) : t("detailAdd")
            }
            onClick={() => setDetailOpen(true)}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded border border-ink-border px-1.5 font-data text-xs text-paper transition-colors hover:border-amber disabled:cursor-not-allowed disabled:opacity-40"
          >
            {detailedScore ?? "+"}
          </button>
        </Row>
        {ratingNotice && (
          <p role="status" className="font-data text-xs text-paper-muted">
            {ratingNotice}
          </p>
        )}
        {detailOpen && own && (
          <RatingDetailDialog
            open
            onClose={() => setDetailOpen(false)}
            releaseGroupId={releaseGroupId}
            own={own}
            onChange={(updated) => {
              setRatingNotice(null);
              applyRatings(updated);
            }}
          />
        )}
      </div>

      <Row label={t("review")}>
        {state.ownReviewId && <span className="font-body text-sm text-paper">{t("reviewWritten")}</span>}
        <Link
          href={`/album/${releaseGroupId}/reviews#${REVIEW_COMPOSER_ANCHOR}`}
          scroll={false}
          onClick={(event) => {
            if (revealReviewComposer()) event.preventDefault();
          }}
          className={linkButton}
        >
          {state.ownReviewId ? t("editReview") : t("writeReview")}
        </Link>
      </Row>

      <div className={`flex flex-col gap-2 pt-3 ${divider}`}>
        <Row label={t("listens")}>
          <span className="font-body text-sm text-paper">
            {listens.count === 0
              ? t("listensNone")
              : listens.lastAt
                ? t("listensSummary", {
                    count: listens.count,
                    date: format.dateTime(new Date(listens.lastAt), { day: "numeric", month: "short" }),
                  })
                : listens.count}
          </span>
          <button type="button" className={linkButton} disabled={busy === "listen"} onClick={() => void logListen()}>
            {busy === "listen" ? t("logging") : t("logListen")}
          </button>
        </Row>
        {loggedEntry && !detailsOpen && (
          <p role="status" className="font-data text-xs text-paper-muted">
            {t("listenLogged")} ·{" "}
            <button type="button" className={linkButton} onClick={() => setDetailsOpen(true)}>
              {t("addDetails")}
            </button>
          </p>
        )}
        {loggedEntry && detailsOpen && (
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
              setLoggedEntry(saved);
              setDetailsOpen(false);
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <ToggleChip
            pressed={favorited}
            disabled={busy === "favorite"}
            onClick={() => void toggleFav()}
            icon={<HeartIcon filled={favorited} />}
            label={t("favorite")}
          />
          <ToggleChip
            pressed={pending}
            disabled={busy === "pending"}
            onClick={() => void togglePending()}
            icon={<BookmarkIcon filled={pending} />}
            label={t("pending")}
          />
        </div>
      </div>

      <div className={`flex flex-col gap-2 pt-3 ${divider}`}>
        <div className="flex flex-col gap-1">
          <Row
            label={
              hasCollection ? (
                <span className="flex flex-col text-paper">
                  {entries.length > 0 && <span>{t("haveFormats", { formats })}</span>}
                  {wanted.length > 0 && <span>{t("seeking")}</span>}
                </span>
              ) : (
                t("collection")
              )
            }
          >
            <button
              type="button"
              className={linkButton}
              aria-expanded={collectionOpen}
              onClick={() => setCollectionOpen((open) => !open)}
            >
              {collectionOpen ? t("close") : hasCollection ? t("manageCollection") : t("addToCollection")}
            </button>
          </Row>
          {collectionOpen && (
            <CollectionAlbumAction
              releaseGroupId={releaseGroupId}
              authenticated
              initialEntries={entries}
              initialWantedEntries={wanted}
              initialChoice={initialCollectionChoice}
              onEntriesChange={(nextEntries, nextWanted) => {
                setEntries(nextEntries);
                setWanted(nextWanted);
              }}
            />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Row label={<span className={memberships.length > 0 ? "text-paper" : undefined}>{t("lists", { count: memberships.length })}</span>}>
            <button
              ref={listsButton}
              type="button"
              className={linkButton}
              aria-expanded={pickerOpen}
              onClick={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
            >
              {pickerOpen ? t("close") : t("chooseLists")}
            </button>
          </Row>
          {pickerOpen && (
            <AlbumListPicker
              releaseGroupId={releaseGroupId}
              memberships={memberships}
              onMembershipsChange={(update) => {
                listsChanged.current = true;
                setMemberships(update);
              }}
              onClose={closePicker}
            />
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      )}
    </aside>
  );
}

function ToggleChip({
  pressed,
  disabled,
  onClick,
  icon,
  label,
}: {
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-ink-border px-3 font-body text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper aria-pressed:border-amber aria-pressed:bg-amber/10 aria-pressed:text-amber disabled:cursor-wait disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path
        d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path
        d="M6.5 3.5h11v17l-5.5-4-5.5 4z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

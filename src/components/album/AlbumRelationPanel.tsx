"use client";

import { useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link, useRouter, useSearchParams } from "@/i18n/navigation";
import { DualRating } from "@/components/social/DualRating";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { ListsContainingItemPanel } from "@/components/lists/ListsContainingItemPanel";
import { CollectionAlbumAction } from "@/components/collection/CollectionAlbumAction";
import { REVIEW_COMPOSER_ANCHOR, revealReviewComposer } from "@/components/album/ReviewComposer";
import { createListenEntry } from "@/lib/api/diary";
import { toggleFavorite } from "@/lib/api/favorites";
import { toggleWantToListen } from "@/lib/api/want-to-listen";
import type { CollectionEntry, ListenEntry, RatingsResponse, WantedEntry } from "@/lib/api/schemas";

// Panel "Tu relación" de la página de álbum (openspec: redesign-album-page, capability
// `album-personal-panel`). Reúne todas las acciones personales sobre el álbum y muestra
// estado en lugar de botones sueltos: cada línea dice qué hiciste y es su propia acción.
// Colección y listas sin estado quedan detrás de "Más acciones"; en móvil también la
// reseña y Pendiente, para que el panel sea compacto.

export interface AlbumRelationState {
  ratings: RatingsResponse;
  ownReviewId: string | null;
  listens: { count: number; lastAt: string | null };
  favorited: boolean;
  pending: boolean;
  collectionEntries: CollectionEntry[];
  wantedEntries: WantedEntry[];
  ownListCount: number;
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

function Row({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 ${className}`}>
      {children}
    </div>
  );
}

const linkButton =
  "font-data text-xs text-amber underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50";

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

  return (
    <AuthenticatedPanel releaseGroupId={releaseGroupId} state={state} />
  );
}

function AuthenticatedPanel({
  releaseGroupId,
  state,
}: AlbumRelationPanelProps & { state: AlbumRelationState }) {
  const t = useTranslations("catalog.album.relation");
  const tCollection = useTranslations("collection");
  const format = useFormatter();
  const router = useRouter();
  const initialCollectionChoice = parseCollectionChoice(useSearchParams().get("collection"));
  const target = { type: "release-group" as const, id: releaseGroupId };

  const [ratingOpen, setRatingOpen] = useState(false);
  const [ownStars, setOwnStars] = useState(state.ratings.own?.stars ?? null);
  const [ownDetailed, setOwnDetailed] = useState(state.ratings.own?.detailedScore ?? null);
  const [listens, setListens] = useState(state.listens);
  const [loggedEntry, setLoggedEntry] = useState<ListenEntry | null>(null);
  const [favorited, setFavorited] = useState(state.favorited);
  const [pending, setPending] = useState(state.pending);
  const [entries, setEntries] = useState(state.collectionEntries);
  const [wanted, setWanted] = useState(state.wantedEntries);
  const [collectionOpen, setCollectionOpen] = useState(initialCollectionChoice !== undefined);
  const [listPanel, setListPanel] = useState<"add" | "show" | null>(null);
  const [moreOpen, setMoreOpen] = useState(initialCollectionChoice !== undefined);
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

  const logListen = () =>
    run("listen", async () => {
      const entry = await createListenEntry(target);
      setLoggedEntry(entry);
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

  const hasCollection = entries.length > 0 || wanted.length > 0;
  const hasLists = state.ownListCount > 0;
  const showCollection = hasCollection || moreOpen;
  const showLists = hasLists || moreOpen;
  // En móvil, reseña y Pendiente también esperan a "Más acciones".
  const mobileSecondary = moreOpen ? "flex" : "hidden sm:flex";

  const formats = [...new Set(entries.map((entry) => tCollection(`format.${entry.format}`)))].join(", ");

  return (
    <aside aria-label={t("heading")} className={panelClass}>
      <h2 className="font-display text-sm text-paper-muted">{t("heading")}</h2>

      <div className="flex flex-col gap-1">
        <Row>
          <span className="font-body text-sm text-paper">
            {t("rating")}
            {ownStars !== null && (
              <span className="ml-2 font-data text-amber">
                ★ {ownStars}
                {ownDetailed !== null && <span className="ml-1 text-paper-muted">· {ownDetailed}</span>}
              </span>
            )}
          </span>
          <button
            type="button"
            className={linkButton}
            aria-expanded={ratingOpen}
            onClick={() => setRatingOpen((open) => !open)}
          >
            {ratingOpen ? t("close") : ownStars !== null ? t("editRating") : t("rate")}
          </button>
        </Row>
        {ratingOpen && (
          <DualRating
            target="release-group"
            targetId={releaseGroupId}
            initial={state.ratings}
            authenticated
            variant="panel"
            onChange={(updated) => {
              setOwnStars(updated.own?.stars ?? null);
              setOwnDetailed(updated.own?.detailedScore ?? null);
              router.refresh();
            }}
          />
        )}
      </div>

      <Row className={mobileSecondary}>
        <span className="font-body text-sm text-paper">{t("review")}</span>
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

      <div className="flex flex-col gap-1 border-t border-ink-border pt-3">
        <Row>
          <span className="font-body text-sm text-paper">
            {t("listens", { count: listens.count })}
            {listens.lastAt && (
              <span className="ml-2 font-data text-xs text-paper-muted">
                {t("lastListen", {
                  date: format.dateTime(new Date(listens.lastAt), { day: "numeric", month: "short" }),
                })}
              </span>
            )}
          </span>
          <button type="button" className={linkButton} disabled={busy === "listen"} onClick={() => void logListen()}>
            {busy === "listen" ? t("logging") : listens.count > 0 ? t("logAnother") : t("logListen")}
          </button>
        </Row>
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
            onSaved={setLoggedEntry}
          />
        )}
      </div>

      <Row>
        <span className="font-body text-sm text-paper">
          <span aria-hidden="true" className={favorited ? "text-amber" : "text-paper-muted"}>
            {favorited ? "♥" : "♡"}{" "}
          </span>
          {t("favorite")}
        </span>
        <button
          type="button"
          className={linkButton}
          disabled={busy === "favorite"}
          onClick={() => void toggleFav()}
        >
          {busy === "favorite" ? t("saving") : favorited ? t("remove") : t("add")}
        </button>
      </Row>

      <Row className={mobileSecondary}>
        <span className="font-body text-sm text-paper">
          <span aria-hidden="true" className={pending ? "text-amber" : "text-paper-muted"}>
            {pending ? "●" : "○"}{" "}
          </span>
          {t("pending")}
        </span>
        <button
          type="button"
          className={linkButton}
          disabled={busy === "pending"}
          onClick={() => void togglePending()}
        >
          {busy === "pending" ? t("saving") : pending ? t("remove") : t("add")}
        </button>
      </Row>

      {showCollection && (
        <div className="flex flex-col gap-1 border-t border-ink-border pt-3">
          <Row>
            <span className="flex flex-col font-body text-sm text-paper">
              {entries.length > 0 ? <span>{t("haveFormats", { formats })}</span> : null}
              {wanted.length > 0 ? <span>{t("seeking")}</span> : null}
              {!hasCollection && <span>{t("collection")}</span>}
            </span>
            <button
              type="button"
              className={linkButton}
              aria-expanded={collectionOpen}
              onClick={() => setCollectionOpen((open) => !open)}
            >
              {collectionOpen ? t("close") : t("manageCollection")}
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
      )}

      {showLists && (
        <div className="flex flex-col gap-1 border-t border-ink-border pt-3">
          <Row>
            <span className="font-body text-sm text-paper">{t("lists", { count: state.ownListCount })}</span>
            <span className="flex gap-3">
              <button
                type="button"
                className={linkButton}
                aria-expanded={listPanel === "add"}
                onClick={() => setListPanel((panel) => (panel === "add" ? null : "add"))}
              >
                {t("addToList")}
              </button>
              <button
                type="button"
                className={linkButton}
                aria-expanded={listPanel === "show"}
                onClick={() => setListPanel((panel) => (panel === "show" ? null : "show"))}
              >
                {t("showInLists")}
              </button>
            </span>
          </Row>
          {listPanel === "add" && (
            <AddToListPanel
              target={target}
              onClose={() => {
                setListPanel(null);
                router.refresh();
              }}
            />
          )}
          {listPanel === "show" && (
            <ListsContainingItemPanel target={target} canSave onClose={() => setListPanel(null)} />
          )}
        </div>
      )}

      <button
        type="button"
        className={`${linkButton} self-start ${!moreOpen && hasCollection && hasLists ? "sm:hidden" : ""}`}
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen((open) => !open)}
      >
        {moreOpen ? t("close") : t("more")}
      </button>

      {error && (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      )}
    </aside>
  );
}

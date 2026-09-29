"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { AlbumListPicker, type PickerMembership } from "@/components/album/AlbumListPicker";
import { HeartIcon, ToggleChip } from "@/components/album/AlbumRelationPanel";
import { ArtistJourneyStartModal } from "@/components/artist-journey/ArtistJourneyStartModal";
import { followArtist, unfollowArtist } from "@/lib/api/catalog";
import { createListenEntry } from "@/lib/api/diary";
import { toggleFavorite } from "@/lib/api/favorites";
import { toggleWantToListen } from "@/lib/api/want-to-listen";
import type { ListenEntry, ReleaseGroup, ReleaseGroupCategory } from "@/lib/api/schemas";

// Panel "Tu relación" de la página de artista (openspec: redesign-artist-page, capability
// `artist-personal-panel`). Mismo lenguaje que el panel del álbum, con las filas que aplican
// a un artista: Siguiendo, Favorito y Pendiente como conmutadores; Escuchas y Colección
// calculadas desde sus discos (nunca con el total de la discografía, que la regla de
// recorridos prohíbe fuera de su gestión); Listas; y Recorrido (barra sin cifras). Sin
// estrellas ni reseña del artista.

export interface ArtistRelationState {
  following: boolean;
  favorited: boolean;
  pending: boolean;
  listens: { albumCount: number; last: { title: string | null; at: string } | null };
  collection: { have: number; seeking: number };
  ownListMemberships: PickerMembership[];
  journey: { state: "in_progress" | "complete" | "archived"; progress: number } | null;
}

interface ArtistRelationPanelProps {
  artistId: string;
  artistName: string;
  /** `null` para visitantes anónimos. */
  state: ArtistRelationState | null;
  /** Discografía propia para el modal de inicio del recorrido. */
  journeyAlbums: ReleaseGroup[];
  categoryLabels: Record<ReleaseGroupCategory, string>;
}

const panelClass = "flex flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4";
const linkButton =
  "font-data text-xs text-amber underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50";
const divider = "border-t border-ink-border";

/**
 * Fila del panel: la etiqueta y su acción en la primera línea, el valor debajo. En la columna
 * angosta del panel, un valor largo ("2 discos · Man’s Best Friend, hace 4 días") no empuja la
 * acción a una línea suelta ni desalinea las filas entre sí.
 */
function Field({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-body text-sm text-paper-muted">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Valor de una fila: atenuado cuando dice que no hay nada ("Sin escuchas"). */
function Value({ empty, children }: { empty: boolean; children: ReactNode }) {
  return <p className={`font-body text-sm ${empty ? "text-paper-muted" : "text-paper"}`}>{children}</p>;
}

export function ArtistRelationPanel(props: ArtistRelationPanelProps) {
  const t = useTranslations("catalog.artist.relation");
  if (!props.state) {
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
  return <AuthenticatedPanel {...props} state={props.state} />;
}

function AuthenticatedPanel({
  artistId,
  artistName,
  state,
  journeyAlbums,
  categoryLabels,
}: ArtistRelationPanelProps & { state: ArtistRelationState }) {
  const t = useTranslations("catalog.artist.relation");
  const format = useFormatter();
  const router = useRouter();
  const target = { type: "artist" as const, id: artistId };

  const [following, setFollowing] = useState(state.following);
  const [favorited, setFavorited] = useState(state.favorited);
  const [pending, setPending] = useState(state.pending);
  const [last, setLast] = useState(state.listens.last);
  const [loggedEntry, setLoggedEntry] = useState<ListenEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [memberships, setMemberships] = useState(state.ownListMemberships);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [journeyModalOpen, setJourneyModalOpen] = useState(false);
  const listsChanged = useRef(false);
  const listsButton = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<"follow" | "favorite" | "pending" | "listen" | null>(null);
  const [error, setError] = useState(false);

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<void>) {
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

  const toggleFollow = () =>
    run("follow", async () => {
      const next = !following;
      await (next ? followArtist(artistId) : unfollowArtist(artistId));
      setFollowing(next);
      // El conteo de seguidores del bloque de comunidad sale del servidor.
      router.refresh();
    });

  const toggleFav = () =>
    run("favorite", async () => {
      setFavorited((await toggleFavorite(target)) !== null);
      router.refresh();
    });

  const togglePending = () =>
    run("pending", async () => {
      setPending((await toggleWantToListen(target)) !== null);
    });

  const logListen = () =>
    run("listen", async () => {
      const entry = await createListenEntry(target);
      setLoggedEntry(entry);
      setDetailsOpen(false);
      setLast({ title: null, at: entry.createdAt });
      // Registrar una escucha retira al artista de Pendiente (spec want-to-listen).
      setPending(false);
    });

  const closePicker = () => {
    setPickerOpen(false);
    listsButton.current?.focus();
    if (listsChanged.current) {
      listsChanged.current = false;
      router.refresh();
    }
  };

  const relativeDate = (iso: string) => format.relativeTime(new Date(iso), new Date());
  const noListens = !last && state.listens.albumCount === 0;
  const listensSummary = (() => {
    if (noListens) return t("listensNone");
    const parts: string[] = [];
    if (state.listens.albumCount > 0) parts.push(t("listensAlbums", { count: state.listens.albumCount }));
    if (last) parts.push(last.title ? t("listensLast", { title: last.title, date: relativeDate(last.at) }) : relativeDate(last.at));
    return parts.join(" · ");
  })();

  const { have, seeking } = state.collection;
  const noCollection = have === 0 && seeking === 0;
  const collectionSummary =
    noCollection
      ? t("collectionNone")
      : [have > 0 ? t("collectionHave", { count: have }) : null, seeking > 0 ? t("collectionSeeking", { count: seeking }) : null]
          .filter(Boolean)
          .join(" · ");

  return (
    <aside aria-label={t("heading")} className={panelClass}>
      <h2 className="font-display text-sm text-paper-muted">{t("heading")}</h2>

      <div className="grid grid-cols-3 gap-2">
        <ToggleChip
          pressed={following}
          disabled={busy === "follow"}
          onClick={() => void toggleFollow()}
          icon={<FollowIcon active={following} />}
          label={following ? t("following") : t("follow")}
          stacked
        />
        <ToggleChip
          pressed={favorited}
          disabled={busy === "favorite"}
          onClick={() => void toggleFav()}
          icon={<HeartIcon filled={favorited} />}
          label={t("favorite")}
          stacked
        />
        <ToggleChip
          pressed={pending}
          disabled={busy === "pending"}
          onClick={() => void togglePending()}
          icon={<BookmarkIcon filled={pending} />}
          label={t("pending")}
          stacked
        />
      </div>

      <div className={`flex flex-col gap-3 pt-3 ${divider}`}>
        <Field
          label={t("listens")}
          action={
            <button type="button" className={linkButton} disabled={busy === "listen"} onClick={() => void logListen()}>
              {busy === "listen" ? t("logging") : t("logListen")}
            </button>
          }
        >
          <Value empty={noListens}>{listensSummary}</Value>
        </Field>
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
        <Field label={t("collection")}>
          <Value empty={noCollection}>{collectionSummary}</Value>
        </Field>
      </div>

      <div className={`flex flex-col gap-3 pt-3 ${divider}`}>
        <div className="flex flex-col gap-1">
          <Field
            label={t("listsLabel")}
            action={
              <button
                ref={listsButton}
                type="button"
                className={linkButton}
                aria-expanded={pickerOpen}
                onClick={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
              >
                {pickerOpen ? t("close") : t("chooseLists")}
              </button>
            }
          >
            <Value empty={memberships.length === 0}>{t("lists", { count: memberships.length })}</Value>
          </Field>
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

        <Field
          label={t("journey")}
          action={
            state.journey ? (
              <Link href={`/me/artist-journeys/${artistId}`} className={linkButton}>
                {t("journeyManage")} →
              </Link>
            ) : (
              <button type="button" className={linkButton} onClick={() => setJourneyModalOpen(true)}>
                {t("journeyStart")}
              </button>
            )
          }
        >
          {state.journey ? (
            <div className="flex items-center gap-3">
              <span className="font-body text-sm text-paper">{t(`journeyStates.${state.journey.state}`)}</span>
              {state.journey.state !== "archived" && (
                // Señal discreta sin fracción numérica (spec artist-journey).
                <span
                  role="progressbar"
                  aria-label={t("journeyProgress")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(state.journey.progress * 100)}
                  className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-border"
                >
                  <span className="block h-full rounded-full bg-petrol" style={{ width: `${Math.round(state.journey.progress * 100)}%` }} />
                </span>
              )}
            </div>
          ) : (
            <Value empty>{t("journeyNone")}</Value>
          )}
        </Field>
        {journeyModalOpen && (
          <ArtistJourneyStartModal
            artistId={artistId}
            artistName={artistName}
            albums={journeyAlbums}
            categoryLabels={categoryLabels}
            onClose={() => setJourneyModalOpen(false)}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      )}
    </aside>
  );
}

function FollowIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      {active ? (
        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

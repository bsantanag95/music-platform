"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { RelativeDate, TargetTitle } from "@/components/feed/feed-row-parts";
import { targetHref } from "@/components/feed/feed-target";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListenEntryForm } from "./ListenEntryForm";
import { ReactionBadge } from "./ReactionBadge";
import { deleteListenEntry, getMyDiary } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import type { DiaryListResponse, ListenEntry } from "@/lib/api/schemas";

interface DiaryActivityListProps {
  initial: DiaryListResponse;
  loadMore?: (page: number, pageSize: number) => Promise<DiaryListResponse>;
  empty?: { title: string; description: string };
}

// Presentación en fila del diario propio: la misma anatomía que /me/feed (celda
// de carátula/disco, título como ancla, fecha relativa) — no la variante compacta
// "self" sin celda, pensada para un aside dentro de Inicio, no para la página
// dedicada. Editable, a diferencia de `FeedActivityList`, que es de solo lectura
// en sus tres superficies. Cada entrada es siempre su propia fila: nunca se
// agrupan escuchas, porque acá hay que poder editar o borrar una entrada puntual
// (ver openspec/changes/redesign-diary, design.md decisiones 1 y 2).
function coverForEntry(entry: ListenEntry): string | null {
  return entry.target.type === "release-group" ? entry.target.coverThumbUrl : null;
}

// La impresión escrita como cita, no como card: sin fondo ni caja bordeada — una
// regla neutra a la izquierda (el mismo `ink-border` que separa todo en este
// sistema, nunca un color nuevo) y el texto indentado, en Source Serif cursiva
// con comillas tipográficas. Es lo que distingue "tu voz" de un panel de UI más.
// `border-l-2` (no el hairline de 1px que usan cards y divisores): acá la regla
// no separa dos bloques, tiene que leerse como el marcador de una cita — con 1px
// el indent se sentía un margen accidental, no un gesto editorial deliberado.
// Tratamiento propio del diario: `ProsePanel` (con caja) sigue siendo el de
// `/me/feed`, donde una nota compite por peso con ratings y favoritos vecinos.
function ImpressionQuote({ body }: { body: string }) {
  return (
    <p className="mt-3 border-l-2 border-ink-border pl-3 font-body text-sm text-paper italic">
      “{body}”
    </p>
  );
}

export function DiaryActivityList({ initial, loadMore, empty }: DiaryActivityListProps) {
  const t = useTranslations("diary");
  const [entries, setEntries] = useState<ListenEntry[]>(initial.entries);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Confirmación de guardado: sin texto ("Guardado"), un destello ámbar que se
  // apaga solo — el cierre automático del formulario ya dice "esto se guardó";
  // el destello es el refuerzo visual para quien no estaba mirando el botón.
  // Anuncio accesible aparte (`sr-only`) para quien usa lector de pantalla.
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!savedId) return;
    const timeout = window.setTimeout(() => setSavedId(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [savedId]);

  if (entries.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? t("emptyTitle")}
        description={empty?.description ?? t("emptyDescription")}
      />
    );
  }

  const handleDelete = async (entry: ListenEntry) => {
    setLoading(true);
    setLoadError(false);
    try {
      await deleteListenEntry(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setPendingDeleteId(null);
      if (expandedId === entry.id) setExpandedId(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === "LISTEN_ENTRY_NOT_FOUND") {
        setEntries((current) => current.filter((item) => item.id !== entry.id));
        setPendingDeleteId(null);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const fetcher = loadMore ?? getMyDiary;
      const next = await fetcher(page + 1, 20);
      setEntries((current) => [...current, ...next.entries]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <span role="status" aria-live="polite" className="sr-only">
        {savedId ? t("savedAnnouncement") : null}
      </span>
      <ul className="divide-y divide-ink-border">
        {entries.map((entry) => {
          const body = entry.body != null && entry.body.trim() !== "" ? entry.body : null;
          const expanded = expandedId === entry.id;
          const pendingDelete = pendingDeleteId === entry.id;

          return (
            <li
              key={entry.id}
              className={`${body ? "py-4" : "py-3"} first:pt-0 last:pb-0 transition-colors duration-1000 ${
                savedId === entry.id ? "bg-amber/10" : "bg-transparent"
              }`}
            >
              <div className="flex gap-3 sm:gap-4">
                <CoverThumb cover={coverForEntry(entry)} label="" className="size-11 sm:size-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="flex min-w-0 items-baseline gap-1 font-data text-xs text-paper-muted">
                      <span>{t(`context.${entry.listenContext}`)}</span>
                      {entry.reaction ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <ReactionBadge reaction={entry.reaction} />
                        </>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-data text-xs text-paper-muted">
                        {t(`audience.${entry.audience}`)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <RelativeDate iso={entry.createdAt} />
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
                        onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                      >
                        {expanded ? t("collapse") : t("edit")}
                      </button>
                      {!pendingDelete && (
                        <>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            className="font-data text-xs text-paper-muted transition-colors hover:text-danger"
                            onClick={() => setPendingDeleteId(entry.id)}
                          >
                            {t("delete")}
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                  {pendingDelete && (
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span role="alert" className="min-w-0 font-data text-xs text-danger">
                        {loading ? t("deleting") : t("deleteConfirm")}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={loading}
                          className="font-data text-xs text-paper-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => void handleDelete(entry)}
                        >
                          {t("delete")}
                        </button>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          disabled={loading}
                          className="font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setPendingDeleteId(null)}
                        >
                          {t("collapse")}
                        </button>
                      </span>
                    </div>
                  )}
                  <div className="mt-1">
                    <TargetTitle
                      href={targetHref(entry.target.type, entry.target.id)}
                      label={entry.target.title}
                      artist={null}
                      layout="inline"
                    />
                  </div>
                  {body ? <ImpressionQuote body={body} /> : null}
                  {expanded && (
                    <div className="mt-3">
                      <ListenEntryForm
                        entryId={entry.id}
                        initial={{
                          listenContext: entry.listenContext,
                          body: entry.body,
                          reaction: entry.reaction,
                          audience: entry.audience,
                        }}
                        onCancel={() => setExpandedId(null)}
                        onSaved={(updated) => {
                          setEntries((current) =>
                            current.map((item) => (item.id === updated.id ? updated : item)),
                          );
                          setExpandedId(null);
                          setSavedId(updated.id);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {hasNext && (
        <Button variant="secondary" disabled={loading} onClick={() => void handleLoadMore()} className="self-center">
          {loading ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
      {loadError && (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
    </div>
  );
}

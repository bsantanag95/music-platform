"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/errors";
import { castGenreVote, getAlbumGenreVotes, removeGenreVote, searchGenres } from "@/lib/api/genres";
import type { AlbumGenreVotesResponse } from "@/lib/api/schemas";
import { queryKeys } from "@/lib/query/keys";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";

// Panel de votación de géneros del álbum (openspec: add-genre-votes y
// move-genre-votes-to-relation-panel, capability `genre-vote-panel`). Es el contenido que
// "Tu relación" despliega desde su fila "Géneros": la lista de géneros del álbum con ▲/▼
// conmutables (pulsar de nuevo el voto activo lo retira) y un buscador para proponer uno nuevo
// (se vota +1 al elegirlo). Las cifras de votos llegan de la API solo con suficientes votantes.
// Quien no puede votar ve los controles desactivados y el motivo. `interacted` (valoración,
// escuchas o colección de la persona, según el panel) va en la clave de la consulta: cuando cambia
// se vuelve a pedir el acceso sin cerrar el panel. Tras cada voto refresca la página para que los
// chips de la cabecera reflejen el nuevo orden.

const DEBOUNCE_MS = 200;

function errorKey(error: unknown): "blocked.no_interaction" | "blocked.suspended" | "limit" | "error" {
  if (error instanceof ApiError) {
    if (error.code === "GENRE_VOTE_NO_INTERACTION") return "blocked.no_interaction";
    if (error.code === "SOCIAL_SUSPENSION_ACTIVE") return "blocked.suspended";
    if (error.code === "VALIDATION_ERROR") return "limit";
  }
  return "error";
}

function Proposer({ existing, disabled, onPick }: { existing: Set<string>; disabled: boolean; onPick: (slug: string) => void }) {
  const t = useTranslations("catalog.genres.votes");
  const locale = genreLocaleOf(useLocale());
  const inputId = useId();
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const search = useQuery({
    queryKey: queryKeys.genreSearch(debounced),
    queryFn: () => searchGenres(debounced),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled: debounced.length > 0,
  });
  const results = (search.data?.genres ?? []).filter((g) => !existing.has(g.slug)).slice(0, 6);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-data text-xs uppercase tracking-wide text-paper-muted">
        {t("proposeLabel")}
      </label>
      <input
        id={inputId}
        type="search"
        autoComplete="off"
        value={text}
        disabled={disabled}
        placeholder={t("proposePlaceholder")}
        onChange={(e) => setText(e.target.value)}
        className="rounded border border-ink-border bg-transparent px-2.5 py-1.5 font-body text-sm text-paper placeholder:text-paper-muted/60 disabled:opacity-50"
      />
      {debounced.length > 0 && !disabled && (
        <ul aria-label={t("proposeLabel")} className="flex flex-col">
          {results.length === 0 && !search.isFetching && <li className="px-1 py-1 font-body text-xs text-paper-muted">{t("proposeEmpty")}</li>}
          {results.map((g) => {
            const name = genreDisplayName(g, locale);
            return (
              <li key={g.slug}>
                <button
                  type="button"
                  aria-label={t("proposeAdd", { genre: name })}
                  onClick={() => {
                    setText("");
                    onPick(g.slug);
                  }}
                  className="w-full rounded px-2 py-1 text-left font-body text-sm text-paper hover:bg-ink-border/40"
                >
                  {name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VoteButton({ label, pressed, disabled, onClick, children }: { label: string; pressed: boolean; disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`size-7 rounded border font-data text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed ? "border-amber bg-amber/20 text-paper" : "border-ink-border text-paper-muted hover:border-amber"
      }`}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

export function GenreVotePanel({ releaseGroupId, interacted }: { releaseGroupId: string; interacted: boolean }) {
  const t = useTranslations("catalog.genres.votes");
  const locale = genreLocaleOf(useLocale());
  const router = useRouter();
  const queryClient = useQueryClient();

  const queryKey = [...queryKeys.genreVotes(releaseGroupId), interacted] as const;
  const votes = useQuery({
    queryKey,
    queryFn: () => getAlbumGenreVotes(releaseGroupId),
    // El acceso a votar depende de la valoración, el diario y la colección, que cambian fuera de
    // este componente: nunca se da por fresco (el staleTime global lo haría).
    staleTime: 0,
  });

  const mutation = useMutation<AlbumGenreVotesResponse, unknown, { slug: string; value: 1 | -1 | null }>({
    mutationFn: ({ slug, value }) => (value === null ? removeGenreVote(releaseGroupId, slug) : castGenreVote(releaseGroupId, slug, value)),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      router.refresh();
    },
  });

  const data = votes.data;
  const canVote = data?.canVote ?? false;
  const busy = mutation.isPending;
  const hasInherited = data?.genres.some((g) => g.inherited) ?? false;

  function vote(slug: string, current: 1 | -1 | null, value: 1 | -1) {
    mutation.mutate({ slug, value: current === value ? null : value });
  }

  return (
    <section aria-label={t("title")} className="flex flex-col gap-3">
      <p className="font-body text-xs text-paper-muted">{t("hint")}</p>

      {votes.isPending && <p className="font-body text-sm text-paper-muted">{t("loading")}</p>}
      {votes.isError && <p role="alert" className="font-body text-sm text-danger">{t("loadError")}</p>}

      {data && !data.canVote && (
        <div className="flex flex-col gap-1">
          <p className="font-body text-sm text-paper">
            {data.reason === "signed_out" ? t("signInPrompt") : t(`blocked.${data.reason ?? "no_interaction"}`)}
          </p>
          {data.reason === "signed_out" && (
            <Link href="/auth/login" className="self-start font-display text-sm text-amber hover:underline">
              {t("signIn")}
            </Link>
          )}
        </div>
      )}

      {data && (
        <>
          {data.genres.length === 0 && <p className="font-body text-sm text-paper-muted">{t("empty")}</p>}
          <ul className="flex flex-col gap-1.5">
            {data.genres.map((g) => {
              const name = genreDisplayName(g, locale);
              return (
                <li key={g.slug} data-inherited={g.inherited ? "true" : undefined} className={`flex items-center gap-2 ${g.inherited ? "opacity-70" : ""}`}>
                  <span className="min-w-0 flex-1 font-body text-sm text-paper [overflow-wrap:anywhere]">
                    {name}
                    {g.rank !== "other" && (
                      <span className="ml-2 font-data text-xs text-amber">{g.rank === "primary" ? t("rankPrimary") : t("rankSecondary")}</span>
                    )}
                  </span>
                  {data.showCounts && g.up !== null && g.down !== null && (
                    <span className="font-data text-xs text-paper-muted">{t("score", { up: g.up, down: g.down })}</span>
                  )}
                  <VoteButton label={t("voteUp", { genre: name })} pressed={g.mine === 1} disabled={!canVote || busy} onClick={() => vote(g.slug, g.mine, 1)}>
                    ▲
                  </VoteButton>
                  <VoteButton label={t("voteDown", { genre: name })} pressed={g.mine === -1} disabled={!canVote || busy} onClick={() => vote(g.slug, g.mine, -1)}>
                    ▼
                  </VoteButton>
                </li>
              );
            })}
          </ul>
          {hasInherited && <p className="font-body text-xs text-paper-muted">{t("inheritedNote")}</p>}
          <Proposer
            existing={new Set(data.genres.map((g) => g.slug))}
            disabled={!canVote || busy}
            onPick={(slug) => mutation.mutate({ slug, value: 1 })}
          />
        </>
      )}

      {mutation.isError && (
        <p role="alert" className="font-body text-sm text-danger">
          {t(errorKey(mutation.error))}
        </p>
      )}
    </section>
  );
}

"use client";

import { useState, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { useTargetSearch } from "@/components/quick-actions/use-target-search";
import { useRouter } from "@/i18n/navigation";
import { createTierListFromDiscography } from "@/lib/api/laminas";

// Alta de una tier list (spec tier-laminas): se elige un artista y sus discos caen en el nivel de la nota de la persona; los que no
// valoró, en la bandeja. Nace privada.

const field = "rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper";

export function TierListCreateForm() {
  const t = useTranslations("laminas.tier");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [artist, setArtist] = useState<{ id: string; name: string } | null>(null);
  // `null` mientras la persona no lo toca: hasta entonces sigue al artista.
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const { candidates, searchable } = useTargetSearch("artist", artist ? "" : query);

  const title = editedTitle ?? (artist ? t("create.suggestedTitle", { artist: artist.name }) : "");
  const ready = Boolean(artist && title.trim());

  const submit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!artist || !ready) return;
    setPending(true);
    setFailed(false);
    try {
      const created = await createTierListFromDiscography({ title: title.trim(), artistId: artist.id });
      router.push(`/me/laminas/${created.id}`);
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-base text-paper">{t("create.heading")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("create.description")}</p>
      </header>
      {artist ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-sm text-paper">{artist.name}</span>
          <button
            type="button"
            onClick={() => {
              setArtist(null);
              setEditedTitle(null);
            }}
            className="min-h-9 font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("create.changeArtist")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            {t("create.artist")}
            <input type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} className={field} />
          </label>
          {searchable && candidates.length > 0 ? (
            <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setArtist({ id: candidate.id, name: candidate.title });
                      setQuery("");
                    }}
                    className="flex min-h-11 w-full flex-col justify-center rounded px-2 py-1.5 text-left transition-colors hover:bg-ink"
                  >
                    <span className="truncate font-display text-sm text-paper">{candidate.title}</span>
                    {candidate.subtitle ? <span className="truncate font-data text-xs text-paper-muted">{candidate.subtitle}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      {artist ? (
        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("fields.title")}
          <input value={title} maxLength={100} onChange={(event) => setEditedTitle(event.target.value)} className={field} />
        </label>
      ) : null}
      <p className="font-data text-xs text-paper-muted">{t("create.privateNote")}</p>
      {failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("create.failed")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!ready || pending}
        className="self-start rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover disabled:opacity-50"
      >
        {pending ? t("create.pending") : t("create.submit")}
      </button>
    </form>
  );
}

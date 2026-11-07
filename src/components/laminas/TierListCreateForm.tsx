"use client";

import { useState, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { useTargetSearch } from "@/components/quick-actions/use-target-search";
import { useRouter } from "@/i18n/navigation";
import { createTierList, type TierListSourceInput } from "@/lib/api/laminas";
import { suggestTierTitle, type TierTitleSource, type TierTitleTranslator } from "@/lib/laminas/tier-title";
import { TIER_LIST_MAX_ITEMS } from "@/lib/laminas/tiers";
import { LaminaSourcePanel } from "./LaminaSourcePanel";
import { useLaminaSource } from "./use-lamina-source";

// Alta de una tier list (spec tier-laminas): de discos o de canciones, desde la discografía de un artista, las canciones de un disco, tus
// valoraciones con filtros o una lista propia. Cada ítem cae en el nivel de tu nota y lo que no valoraste, en la bandeja. Nace privada.

type EntityType = "release-group" | "recording";
type TierSource = "discography" | "album" | "ratings" | "list";

const SOURCES: Record<EntityType, readonly TierSource[]> = {
  "release-group": ["discography", "ratings", "list"],
  recording: ["album", "ratings", "list"],
};
const field = "rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper";
const segment = (active: boolean) =>
  `min-h-9 flex-1 rounded px-3 py-1 font-data text-xs transition-colors ${active ? "bg-ink-border text-paper" : "text-paper-muted hover:text-paper"}`;

export function TierListCreateForm() {
  const t = useTranslations("laminas.tier");
  const router = useRouter();
  const [entityType, setEntityType] = useState<EntityType>("release-group");
  const [source, setSourceChoice] = useState<TierSource>("discography");
  const [query, setQuery] = useState("");
  // El artista o el disco elegido en el buscador, para las fuentes que lo piden.
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  // `null` mientras la persona no lo toca: hasta entonces sigue a la fuente.
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const preview = useLaminaSource({ entityType, slots: TIER_LIST_MAX_ITEMS, limit: TIER_LIST_MAX_ITEMS });
  const searches = source === "discography" || source === "album";
  const { candidates, searchable } = useTargetSearch(source === "discography" ? "artist" : "album", searches && !picked ? query : "");

  function chooseSource(next: TierSource) {
    setSourceChoice(next);
    setPicked(null);
    setQuery("");
    setEditedTitle(null);
    preview.setSource(next === "ratings" || next === "list" ? next : "manual");
  }

  function chooseType(next: EntityType) {
    if (next === entityType) return;
    setEntityType(next);
    chooseSource(SOURCES[next][0]!);
  }

  const titleSource: TierTitleSource | null =
    source === "discography"
      ? picked && { type: "discography", artist: picked.name }
      : source === "album"
        ? picked && { type: "album", album: picked.name }
        : source === "list"
          ? { type: "list", listTitle: preview.labels.listTitle }
          : { type: "ratings", kind: entityType, ...preview.labels };
  const suggestion = titleSource ? suggestTierTitle(t as unknown as TierTitleTranslator, titleSource) : "";
  const title = editedTitle ?? suggestion;
  const sourceInput: TierListSourceInput | null =
    source === "discography"
      ? picked && { type: "discography", artistId: picked.id }
      : source === "album"
        ? picked && { type: "album", releaseGroupId: picked.id }
        : preview.selected.length > 0
          ? { type: "picked", targetIds: preview.selected.map((candidate) => candidate.target.id) }
          : null;
  const ready = Boolean(sourceInput && title.trim());

  const submit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!sourceInput || !ready) return;
    setPending(true);
    setFailed(false);
    try {
      const created = await createTierList({ title: title.trim(), entityType, source: sourceInput });
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

      <fieldset className="flex flex-col gap-1">
        <legend className="font-data text-xs text-paper-muted">{t("create.type")}</legend>
        <div className="flex gap-1 rounded border border-ink-border p-0.5">
          {(["release-group", "recording"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={entityType === option} onClick={() => chooseType(option)} className={segment(entityType === option)}>
              {t(`create.types.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="font-data text-xs text-paper-muted">{t("create.source")}</legend>
        <div className="flex flex-wrap gap-1 rounded border border-ink-border p-0.5">
          {SOURCES[entityType].map((option) => (
            <button key={option} type="button" aria-pressed={source === option} onClick={() => chooseSource(option)} className={segment(source === option)}>
              {t(`sources.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {searches ? (
        picked ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-sm text-paper">{picked.name}</span>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setEditedTitle(null);
              }}
              className="min-h-9 font-data text-xs text-paper-muted transition-colors hover:text-paper"
            >
              {t("create.change")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
              {t(`create.search.${source}`)}
              <input type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} className={field} />
            </label>
            {searchable && candidates.length > 0 ? (
              <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked({ id: candidate.id, name: candidate.title });
                        setQuery("");
                      }}
                      className="flex min-h-11 w-full flex-col justify-center rounded px-2 py-1.5 text-left transition-colors hover:bg-ink"
                    >
                      <span className="truncate font-display text-sm text-paper">{candidate.title}</span>
                      {candidate.subtitle || candidate.year ? (
                        <span className="truncate font-data text-xs text-paper-muted">{[candidate.subtitle, candidate.year].filter(Boolean).join(" · ")}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      ) : (
        <LaminaSourcePanel state={preview} rankStart={null} />
      )}

      {sourceInput ? (
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

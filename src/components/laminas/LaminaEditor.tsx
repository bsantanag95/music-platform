"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { useTargetSearch } from "@/components/quick-actions/use-target-search";
import { OwnShareButton } from "@/components/share/OwnShareSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Link, useRouter } from "@/i18n/navigation";
import { addLaminaItem, deleteLamina, removeLaminaItem, reorderLamina, updateLamina } from "@/lib/api/laminas";
import type { LaminaDetail, UpdateLaminaRequest } from "@/lib/api/schemas";

// Editor de una Lámina (spec top-laminas): el orden es el ranking, así que se mueve con botones operables con teclado y
// toque. Bajar a un formato con menos lugares avisa qué se pierde antes de guardar.

const CAPACITY = { top5: 5, top10: 10, grid9: 9 } as const;
const FORMATS = ["top5", "top10", "grid9"] as const;
const AUDIENCES = ["private", "followers", "public"] as const;
const iconButton =
  "grid size-9 place-items-center rounded border border-ink-border font-data text-sm text-paper-muted transition-colors hover:text-paper disabled:opacity-40 [@media(pointer:coarse)]:size-11";

export function LaminaEditor({ initial, ownerUsername }: { initial: LaminaDetail; ownerUsername: string }) {
  const t = useTranslations("laminas");
  const router = useRouter();
  const [lamina, setLamina] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<LaminaDetail["format"] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const capacity = CAPACITY[lamina.format];
  const full = lamina.items.length >= capacity;
  const pickerType = lamina.entityType === "recording" ? "song" : "album";
  const { candidates, searchable } = useTargetSearch(pickerType, query);
  const chosen = new Set(lamina.items.map((item) => item.target.id));

  async function run(action: () => Promise<LaminaDetail>) {
    setBusy(true);
    setFailed(false);
    try {
      setLamina(await action());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const save = (changes: UpdateLaminaRequest) => run(() => updateLamina(lamina.id, changes));

  function move(index: number, delta: number) {
    const ids = lamina.items.map((item) => item.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved!);
    void run(() => reorderLamina(lamina.id, ids));
  }

  function chooseFormat(format: LaminaDetail["format"]) {
    if (format === lamina.format) return;
    if (lamina.items.length > CAPACITY[format]) setPendingFormat(format);
    else void save({ format });
  }

  const lost = pendingFormat ? lamina.items.slice(CAPACITY[pendingFormat]).map((item) => item.target.title) : [];

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/me/laminas" className="font-data text-xs text-paper-muted transition-colors hover:text-amber">
          {t("back")}
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/users/${encodeURIComponent(ownerUsername)}/laminas/${lamina.id}`} className="font-data text-xs text-paper-muted transition-colors hover:text-paper">
            {t("viewPage")}
          </Link>
          <OwnShareButton kind="top" refId={lamina.id} />
        </div>
      </div>

      <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
        {t("fields.title")}
        <input
          value={title}
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title.trim() && title.trim() !== lamina.title) void save({ title: title.trim() });
          }}
          className="rounded border border-ink-border bg-ink px-3 py-2 font-display text-xl text-paper"
        />
      </label>

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <fieldset className="flex flex-col gap-1">
          <legend className="font-data text-xs text-paper-muted">{t("fields.format")}</legend>
          <div className="flex gap-1 rounded border border-ink-border p-0.5">
            {FORMATS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={lamina.format === option}
                disabled={busy}
                onClick={() => chooseFormat(option)}
                className={`rounded px-3 py-1 font-data text-xs transition-colors ${lamina.format === option ? "bg-ink-border text-paper" : "text-paper-muted hover:text-paper"}`}
              >
                {t(`formats.${option}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("fields.audience")}
          <select
            value={lamina.audience}
            disabled={busy}
            onChange={(event) => void save({ audience: event.target.value as LaminaDetail["audience"] })}
            className="rounded border border-ink-border bg-ink px-2 py-1 font-data text-xs text-paper"
          >
            {AUDIENCES.map((option) => (
              <option key={option} value={option}>
                {t(`audience.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex max-w-xs items-start gap-2 font-data text-xs text-paper">
          <input
            type="checkbox"
            checked={lamina.showScores}
            disabled={busy}
            onChange={(event) => void save({ showScores: event.target.checked })}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            {t("fields.showScores")}
            <span className="text-paper-muted">{t("showScoresHint")}</span>
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-sm text-paper-muted">{t("itemsHeading", { count: lamina.items.length, capacity })}</h2>
        {lamina.items.length === 0 ? (
          <p className="font-body text-sm text-paper-muted">{t("empty")}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {lamina.items.map((item, index) => (
              <li key={item.id} className="flex items-center gap-3 rounded border border-ink-border bg-ink-surface p-2">
                <span className="w-6 text-center font-data text-sm text-paper-muted">{lamina.format === "grid9" ? "" : index + 1}</span>
                <CoverThumb cover={item.target.coverThumbUrl} label="" className="size-12 shrink-0 rounded" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-display text-sm text-paper">{item.target.title}</span>
                  {item.target.artistName ? <span className="truncate font-data text-xs text-paper-muted">{item.target.artistName}</span> : null}
                </span>
                {item.score ? (
                  <span className="font-data text-xs text-paper-muted">
                    {item.score.detailedScore != null ? `${item.score.detailedScore}/100` : `${Number(item.score.stars)}★`}
                  </span>
                ) : null}
                <button type="button" className={iconButton} disabled={busy || index === 0} aria-label={t("moveUp", { title: item.target.title })} onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  className={iconButton}
                  disabled={busy || index === lamina.items.length - 1}
                  aria-label={t("moveDown", { title: item.target.title })}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={iconButton}
                  disabled={busy}
                  aria-label={t("remove", { title: item.target.title })}
                  onClick={() => void run(() => removeLaminaItem(lamina.id, item.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {full ? (
        <p className="font-data text-xs text-paper-muted">{t("full")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            {t(`search.${lamina.entityType}`)}
            <input
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper"
            />
          </label>
          {searchable ? (
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
              {candidates
                .filter((candidate) => !chosen.has(candidate.id))
                .map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setQuery("");
                        void run(() => addLaminaItem(lamina.id, candidate.id));
                      }}
                      className="flex w-full flex-col rounded px-2 py-1.5 text-left transition-colors hover:bg-ink-surface"
                    >
                      <span className="truncate font-display text-sm text-paper">{candidate.title}</span>
                      <span className="truncate font-data text-xs text-paper-muted">
                        {[candidate.subtitle, candidate.year].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      )}

      {failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      ) : null}

      <button type="button" onClick={() => setConfirmDelete(true)} className="self-start font-data text-xs text-danger underline-offset-2 hover:underline">
        {t("delete")}
      </button>

      <ConfirmDialog
        open={pendingFormat !== null}
        title={t("formatLossTitle")}
        message={t("formatLossMessage", { titles: lost.join(", ") })}
        confirmLabel={t("formatLossConfirm")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={() => {
          const format = pendingFormat;
          setPendingFormat(null);
          if (format) void save({ format });
        }}
        onCancel={() => setPendingFormat(null)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("deleteTitle")}
        message={t("deleteMessage")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          void deleteLamina(lamina.id).then(() => router.push("/me/laminas"));
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}

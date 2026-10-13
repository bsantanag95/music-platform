"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  EditorialListMutationResponseSchema,
  FeaturedAdminResponseSchema,
  NoContentResponseSchema,
} from "@/lib/api/schemas";
import type { FeaturedAdminResponse, FeaturedAdminRow } from "@/lib/api/schemas";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { collectionTitle } from "@/services/discovery/collections/titles";
import { AUTOMATIC_RAIL_LIMIT, EDITORIAL_RAIL_LIMIT } from "@/services/discovery/constants";

type Group = FeaturedAdminRow["group"];
const GROUPS: Group[] = ["curated", "automatic"];
const GROUP_LIMIT: Record<Group, number> = { curated: EDITORIAL_RAIL_LIMIT, automatic: AUTOMATIC_RAIL_LIMIT };

const JSON_HEADERS = { "Content-Type": "application/json" };

/** ISO → valor de `<input type="datetime-local">` (hora local). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valor de `<input type="datetime-local">` → ISO (o `null` si está vacío). */
function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

// Panel "Destacadas en Explorar" (openspec: manage-explore-featured-console). Cualquiera con
// `editorial.author` lo ve; destacar, reordenar, programar y quitar exigen `editorial.publish`
// (el servidor lo impone igualmente).
export function FeaturedPanel({ initial, canPublish }: { initial: FeaturedAdminResponse; canPublish: boolean }) {
  const t = useTranslations("common.adminConsole");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<FeaturedAdminRow | null>(null);
  const [scheduling, setScheduling] = useState<{ listId: string; startsAt: string; expiresAt: string } | null>(null);
  const [addId, setAddId] = useState("");
  const [addStartsAt, setAddStartsAt] = useState("");
  const [addExpiresAt, setAddExpiresAt] = useState("");

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const orderableOf = (group: Group) => data.featured.filter((row) => row.group === group && row.orderable);
  const expired = data.featured.filter((row) => !row.orderable);
  const inRailOf = (group: Group) => data.featured.filter((row) => row.group === group && row.status === "in_rail").length;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setData(await apiFetch("/api/admin/editorial/featured", FeaturedAdminResponseSchema));
    } catch (caught) {
      setError(caught instanceof ApiError ? tErrors(`${caught.code}.description`) : tErrors("INTERNAL_ERROR.description"));
      // Un conflicto de orden deja la pantalla desactualizada: se recarga el estado vigente.
      if (caught instanceof ApiError && caught.code === "FEATURED_ORDER_CONFLICT") {
        setData(await apiFetch("/api/admin/editorial/featured", FeaturedAdminResponseSchema).catch(() => data));
      }
    } finally {
      setBusy(false);
    }
  };

  // El orden es por grupo: reordenar la selección editorial no mueve las automáticas.
  const move = (group: Group, index: number, delta: -1 | 1) => {
    const ids = orderableOf(group).map((row) => row.listId);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    void run(() =>
      apiFetch("/api/admin/editorial/featured/order", EditorialListMutationResponseSchema, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ group, listIds: ids }),
      }),
    );
  };

  const saveSchedule = () => {
    if (!scheduling) return;
    const { listId, startsAt, expiresAt } = scheduling;
    const body: Record<string, string | null> = { expiresAt: fromLocalInput(expiresAt) };
    if (startsAt) body.startsAt = fromLocalInput(startsAt);
    setScheduling(null);
    void run(() =>
      apiFetch(`/api/admin/editorial/featured/${listId}`, EditorialListMutationResponseSchema, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      }),
    );
  };

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!addId) return;
    const body: Record<string, string | null> = { listId: addId };
    if (addStartsAt) body.startsAt = fromLocalInput(addStartsAt);
    if (addExpiresAt) body.expiresAt = fromLocalInput(addExpiresAt);
    void run(async () => {
      await apiFetch("/api/admin/editorial/featured", EditorialListMutationResponseSchema, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      setAddId("");
      setAddStartsAt("");
      setAddExpiresAt("");
    });
  };

  const confirmRemove = () => {
    if (!removing) return;
    const { listId } = removing;
    setRemoving(null);
    void run(() => apiFetch(`/api/admin/editorial/featured/${listId}`, NoContentResponseSchema, { method: "DELETE" }));
  };

  // Las colecciones generadas se muestran con el título del idioma de la consola (openspec: localize-collection-titles).
  const titleOf = (row: FeaturedAdminRow) =>
    row.source === "template" ? collectionTitle(row.templateKey, row.periodKey, locale, row.title) : row.title;

  const renderRow = (row: FeaturedAdminRow, index: number | null, size = 0) => (
    <li key={row.listId} className="rounded border border-ink-border bg-ink-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg text-paper">{titleOf(row)}</h3>
          <p className="mt-1 font-data text-xs text-paper-muted">
            {row.source === "curated" ? t("featured.sourceCurated") : t("featured.sourceTemplate")}
            {" · "}
            {t("featured.items", { count: row.itemCount })}
            {row.periodKey && row.periodKey !== "evergreen" ? ` · ${t("featured.period", { period: row.periodKey })}` : ""}
          </p>
          <p className="mt-1 font-data text-xs text-paper-muted">
            {t("featured.startsAt")}: {dateFormat.format(new Date(row.startsAt))}
            {row.expiresAt ? ` · ${t("featured.expiresAt")}: ${dateFormat.format(new Date(row.expiresAt))}` : ""}
          </p>
        </div>
        <span
          className={`font-data text-xs ${row.status === "in_rail" ? "text-amber" : "text-paper-muted"}`}
          data-status={row.status}
        >
          {t(`featured.status.${row.status}`)}
        </span>
      </div>

      {canPublish && index !== null ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={t("featured.moveUp", { title: titleOf(row) })}
            disabled={busy || index === 0}
            onClick={() => move(row.group, index, -1)}
            className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={t("featured.moveDown", { title: titleOf(row) })}
            disabled={busy || index === size - 1}
            onClick={() => move(row.group, index, 1)}
            className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
          >
            ↓
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setScheduling(
                scheduling?.listId === row.listId
                  ? null
                  : { listId: row.listId, startsAt: toLocalInput(row.startsAt), expiresAt: toLocalInput(row.expiresAt) },
              )
            }
            className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted hover:text-paper disabled:opacity-50"
          >
            {t("featured.schedule")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setRemoving(row)}
            className="rounded border border-danger/40 px-3 py-2 font-data text-xs text-danger disabled:opacity-50"
          >
            {t("featured.remove")}
          </button>
        </div>
      ) : null}

      {scheduling?.listId === row.listId ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            <span>{t("featured.startsAt")}</span>
            <input
              type="datetime-local"
              value={scheduling.startsAt}
              onChange={(event) => setScheduling({ ...scheduling, startsAt: event.target.value })}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-xs text-paper"
            />
          </label>
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            <span>{t("featured.expiresAt")}</span>
            <input
              type="datetime-local"
              value={scheduling.expiresAt}
              onChange={(event) => setScheduling({ ...scheduling, expiresAt: event.target.value })}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-xs text-paper"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={saveSchedule}
            className="rounded bg-amber px-3 py-2 font-data text-xs text-ink disabled:opacity-50"
          >
            {t("featured.save")}
          </button>
        </div>
      ) : null}
    </li>
  );

  return (
    <section aria-labelledby="featured-heading" className="flex flex-col gap-4">
      <header>
        <h2 id="featured-heading" className="font-display text-xl text-paper">
          {t("featured.title")}
        </h2>
        <p className="mt-1 font-body text-sm text-paper-muted">{t("featured.description")}</p>
        {!canPublish ? <p className="mt-2 font-data text-xs text-paper-muted">{t("featured.readOnly")}</p> : null}
      </header>

      {error ? (
        <p role="alert" className="rounded border border-danger/40 bg-danger/10 p-3 font-data text-sm text-danger">
          {error}
        </p>
      ) : null}

      {canPublish ? (
        <form
          onSubmit={add}
          aria-label={t("featured.addTitle")}
          className="flex flex-wrap items-end gap-3 rounded border border-ink-border bg-ink-surface p-4"
        >
          {data.eligible.length === 0 ? (
            <p className="font-data text-xs text-paper-muted">{t("featured.addEmpty")}</p>
          ) : (
            <>
              <label className="flex min-w-48 flex-1 flex-col gap-1 font-data text-xs text-paper-muted">
                <span>{t("featured.addSelect")}</span>
                <select
                  value={addId}
                  onChange={(event) => setAddId(event.target.value)}
                  className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-xs text-paper"
                >
                  <option value="">{t("featured.addPlaceholder")}</option>
                  {data.eligible.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
                <span>{t("featured.startsAt")}</span>
                <input
                  type="datetime-local"
                  value={addStartsAt}
                  onChange={(event) => setAddStartsAt(event.target.value)}
                  className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-xs text-paper"
                />
              </label>
              <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
                <span>{t("featured.expiresAt")}</span>
                <input
                  type="datetime-local"
                  value={addExpiresAt}
                  onChange={(event) => setAddExpiresAt(event.target.value)}
                  className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-xs text-paper"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !addId}
                className="rounded bg-amber px-3 py-2 font-data text-xs text-ink disabled:opacity-50"
              >
                {t("featured.add")}
              </button>
            </>
          )}
        </form>
      ) : null}

      {GROUPS.map((group) => {
        const rows = orderableOf(group);
        return (
          <section key={group} aria-labelledby={`featured-group-${group}`} className="flex flex-col gap-3">
            <div>
              <h3 id={`featured-group-${group}`} className="font-display text-lg text-paper">
                {t(`featured.group.${group}`)}
              </h3>
              <p className="mt-0.5 font-body text-xs text-paper-muted">{t(`featured.groupHint.${group}`)}</p>
              <p className="mt-0.5 font-data text-xs text-amber">
                {t("featured.railSummary", { count: inRailOf(group), limit: GROUP_LIMIT[group] })}
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="rounded border border-ink-border bg-ink-surface p-6 text-center font-body text-sm text-paper-muted">
                {t(`featured.empty.${group}`)}
              </p>
            ) : (
              <ol className="flex flex-col gap-3">{rows.map((row, index) => renderRow(row, index, rows.length))}</ol>
            )}
          </section>
        );
      })}

      {expired.length > 0 ? (
        <details className="rounded border border-ink-border bg-ink-surface p-4">
          <summary className="cursor-pointer font-data text-xs text-paper-muted">
            {t("featured.expiredHeading")} ({expired.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">{expired.map((row) => renderRow(row, null))}</ul>
        </details>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        title={t("featured.remove")}
        message={t("featured.confirmRemove")}
        confirmLabel={t("featured.remove")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}

"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { useTargetSearch } from "@/components/quick-actions/use-target-search";
import { OwnShareButton } from "@/components/share/OwnShareSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Link, useRouter } from "@/i18n/navigation";
import { addTierListItem, arrangeTierList, deleteLamina, fetchTierList, removeTierListItem, updateTierList } from "@/lib/api/laminas";
import type { TierListDetail, TierListItem, UpdateTierListRequest } from "@/lib/api/schemas";
import { TRAY_GROUP, locateItem, moveItem, removeFromArrangement, shiftItem, type TierArrangement } from "@/lib/laminas/tier-arrangement";
import { TIER_COUNT, TIER_LABEL_MAX, TIER_LIST_MAX_ITEMS, tierBand } from "@/lib/laminas/tiers";
import { scaleScore } from "@/lib/share/score-scale";

// Editor de una tier list (spec tier-laminas): cada disco se mueve arrastrándolo (escritorio) o con su menú "Mover a…", que funciona con
// teclado y con toque: es el camino accesible, no un extra. Cada movimiento se ve al instante y guarda la disposición completa, en orden.
// Nunca cambia una valoración: la nota real del dueño se ve, discreta, en el menú de cada disco.

const AUDIENCES = ["private", "followers", "public"] as const;
const MENU_WIDTH = 240;

function arrangementOf(tierList: TierListDetail): TierArrangement {
  return { tiers: tierList.tiers.map((items) => items.map((item) => item.id)), tray: tierList.tray.map((item) => item.id) };
}

function withArrangement(tierList: TierListDetail, arrangement: TierArrangement): TierListDetail {
  const byId = new Map([...tierList.tiers.flat(), ...tierList.tray].map((item) => [item.id, item]));
  const pick = (ids: string[]) => ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  return { ...tierList, tiers: arrangement.tiers.map(pick), tray: pick(arrangement.tray) };
}

/** Tamaño de la etiqueta según su largo, como en la imagen: una letra grande, una palabra o dos más chicas. */
function labelSize(label: string): string {
  const length = Array.from(label.trim()).length;
  return length <= 2 ? "text-xl sm:text-2xl" : length <= 5 ? "text-sm sm:text-base" : "text-xs sm:text-sm";
}

function scoreLabel(item: TierListItem): string | null {
  return item.score ? scaleScore({ stars: Number(item.score.stars), detailedScore: item.score.detailedScore }).label : null;
}

interface MenuState {
  itemId: string;
  anchor: DOMRect;
}

export function TierListEditor({ initial, ownerUsername }: { initial: TierListDetail; ownerUsername: string }) {
  const t = useTranslations("laminas");
  const tt = useTranslations("laminas.tier");
  const router = useRouter();
  const [tierList, setTierList] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [labels, setLabels] = useState(initial.labels);
  const [labelError, setLabelError] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [query, setQuery] = useState("");
  const focusAfter = useRef<string | null>(null);
  const seq = useRef(0);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const groupLabel = (group: number) => (group === TRAY_GROUP ? tt("tray") : (tierList.labels[group] ?? ""));
  const itemsById = useMemo(() => new Map([...tierList.tiers.flat(), ...tierList.tray].map((item) => [item.id, item])), [tierList]);

  useEffect(() => {
    const itemId = focusAfter.current;
    if (!itemId) return;
    focusAfter.current = null;
    document.querySelector<HTMLElement>(`[data-tier-item="${itemId}"]`)?.focus();
  }, [tierList]);

  /** Aplica al instante y guarda en orden; solo la respuesta del último cambio pisa lo que se ve. */
  function arrange(next: TierArrangement, itemId: string, message: string) {
    setTierList((current) => withArrangement(current, next));
    setAnnouncement(message);
    focusAfter.current = itemId;
    setFailed(false);
    const mine = ++seq.current;
    chain.current = chain.current
      .then(() => arrangeTierList(tierList.id, next))
      .then((detail) => {
        if (mine === seq.current) setTierList(detail);
      })
      .catch(async () => {
        // Otra pestaña pudo cambiarla: se recarga lo guardado.
        setFailed(true);
        const fresh = await fetchTierList(tierList.id).catch(() => null);
        if (fresh && mine === seq.current) setTierList(fresh);
      });
  }

  function moveTo(itemId: string, group: number, beforeId: string | null = null) {
    const current = arrangementOf(tierList);
    const from = locateItem(current, itemId);
    if (!from || (from.group === group && !beforeId)) return;
    const item = itemsById.get(itemId);
    arrange(moveItem(current, itemId, group, beforeId), itemId, tt("moved", { title: item?.target.title ?? "", group: groupLabel(group) }));
  }

  function shift(itemId: string, delta: -1 | 1) {
    const next = shiftItem(arrangementOf(tierList), itemId, delta);
    const to = locateItem(next, itemId);
    if (!to) return;
    const item = itemsById.get(itemId);
    arrange(next, itemId, tt("shifted", { title: item?.target.title ?? "", position: to.index + 1, group: groupLabel(to.group) }));
  }

  async function run(action: () => Promise<TierListDetail>) {
    setBusy(true);
    setFailed(false);
    try {
      setTierList(await action());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const save = (changes: UpdateTierListRequest) => run(() => updateTierList(tierList.id, changes));

  /**
   * Agrega a mano (add-tier-list-lamina-phase2): el servidor lo ubica por la nota del dueño. Va en la misma cola que la disposición, así una
   * disposición vieja no lo pisa.
   */
  function add(targetId: string, title: string) {
    setQuery("");
    setFailed(false);
    const mine = ++seq.current;
    chain.current = chain.current
      .then(() => addTierListItem(tierList.id, targetId))
      .then((detail) => {
        if (mine === seq.current) setTierList(detail);
        const tier = detail.tiers.findIndex((items) => items.some((item) => item.target.id === targetId));
        setAnnouncement(tt("added", { title, group: tier >= 0 ? (detail.labels[tier] ?? "") : tt("tray") }));
      })
      .catch(() => setFailed(true));
  }

  function remove(itemId: string) {
    const item = itemsById.get(itemId);
    setTierList((current) => withArrangement(current, removeFromArrangement(arrangementOf(current), itemId)));
    setAnnouncement(tt("removed", { title: item?.target.title ?? "" }));
    void run(() => removeTierListItem(tierList.id, itemId));
  }

  function saveLabel(index: number) {
    const value = (labels[index] ?? "").trim();
    if (value === tierList.labels[index]) return;
    if (value.length === 0 || Array.from(value).length > TIER_LABEL_MAX) {
      setLabelError(true);
      setLabels(tierList.labels);
      return;
    }
    setLabelError(false);
    const next = labels.map((label, i) => (i === index ? value : label.trim() || tierList.labels[i]!));
    void save({ tierLabels: next });
  }

  function onDrop(event: DragEvent<HTMLElement>, group: number) {
    event.preventDefault();
    setDragOver(null);
    const itemId = event.dataTransfer.getData("text/plain");
    if (!itemsById.has(itemId)) return;
    const over = (event.target as Element).closest("[data-tier-item]")?.getAttribute("data-tier-item") ?? null;
    moveTo(itemId, group, over && over !== itemId ? over : null);
  }

  const dropZone = (group: number) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (dragOver !== group) setDragOver(group);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(null);
    },
    onDrop: (event: DragEvent<HTMLElement>) => onDrop(event, group),
  });

  // Una función y no un componente: un componente declarado acá se volvería a montar en cada render y perdería el foco y el arrastre.
  function renderTile(item: TierListItem, group: number) {
    const score = scoreLabel(item);
    return (
      <li key={item.id}>
        <button
          type="button"
          draggable
          data-tier-item={item.id}
          aria-haspopup="menu"
          aria-expanded={menu?.itemId === item.id}
          aria-label={tt("itemLabel", { title: item.target.title, group: groupLabel(group) })}
          title={score ? `${item.target.title} · ${score}` : item.target.title}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", item.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => setDragOver(null)}
          onClick={(event) => setMenu({ itemId: item.id, anchor: event.currentTarget.getBoundingClientRect() })}
          className="block size-14 cursor-grab rounded outline-offset-2 active:cursor-grabbing"
        >
          <CoverThumb cover={item.target.coverThumbUrl} label="" className="size-14 rounded" />
        </button>
      </li>
    );
  }

  const present = new Set([...itemsById.values()].map((item) => item.target.id));
  const full = itemsById.size >= TIER_LIST_MAX_ITEMS;
  const { candidates, searchable } = useTargetSearch(tierList.entityType === "recording" ? "song" : "album", full ? "" : query);

  const menuItem = menu ? itemsById.get(menu.itemId) : undefined;
  const menuFrom = menu ? locateItem(arrangementOf(tierList), menu.itemId) : null;

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/me/cards" className="font-data text-xs text-paper-muted transition-colors hover:text-amber">
          {t("back")}
        </Link>
        <div className="flex items-center gap-4">
          <Link href={`/users/${encodeURIComponent(ownerUsername)}/cards/${tierList.id}`} className="font-data text-xs text-paper-muted transition-colors hover:text-paper">
            {t("viewPage")}
          </Link>
          <OwnShareButton kind="tier" refId={tierList.id} />
        </div>
      </div>

      <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
        {t("fields.title")}
        <input
          value={title}
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title.trim() && title.trim() !== tierList.title) void save({ title: title.trim() });
          }}
          className="rounded border border-ink-border bg-ink px-3 py-2 font-display text-xl text-paper"
        />
      </label>

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("fields.audience")}
          <select
            value={tierList.audience}
            disabled={busy}
            onChange={(event) => void save({ audience: event.target.value as TierListDetail["audience"] })}
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
            checked={tierList.showScores}
            disabled={busy}
            onChange={(event) => void save({ showScores: event.target.checked })}
            className="form-check mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            {t("fields.showScores")}
            <span className="text-paper-muted">{tt("showScoresHint")}</span>
          </span>
        </label>
      </div>

      <p className="font-body text-sm text-paper-muted">{tt("howTo")}</p>

      <div className="flex flex-col gap-1.5">
        {Array.from({ length: TIER_COUNT }, (_, group) => {
          const band = tierBand(group);
          const items = tierList.tiers[group] ?? [];
          return (
            <div
              key={group}
              {...dropZone(group)}
              className={`flex min-h-[4.5rem] items-stretch gap-2 rounded border bg-ink-surface p-1.5 transition-colors ${dragOver === group ? "border-amber" : "border-ink-border"}`}
            >
              <label className="flex w-16 shrink-0 items-center justify-center rounded sm:w-20" style={{ backgroundColor: band.background, color: band.foreground }}>
                <span className="sr-only">{tt("labelField", { n: group + 1 })}</span>
                {/* Dos renglones: una etiqueta de hasta 12 caracteres no entra en una sola línea de 64 px. Enter guarda, no agrega un renglón. */}
                <textarea
                  rows={Array.from((labels[group] ?? "").trim()).length > 5 ? 2 : 1}
                  value={labels[group] ?? ""}
                  maxLength={TIER_LABEL_MAX}
                  onChange={(event) => setLabels((current) => current.map((label, i) => (i === group ? event.target.value.replace(/\n/g, "") : label)))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  onBlur={() => saveLabel(group)}
                  className={`w-full resize-none overflow-hidden bg-transparent px-1 text-center font-display font-bold leading-tight text-inherit outline-offset-2 ${labelSize(labels[group] ?? "")}`}
                />
              </label>
              <ul className="flex flex-1 flex-wrap content-start gap-1.5" aria-label={tt("tierItems", { group: groupLabel(group), count: items.length, kind: tierList.entityType })}>
                {items.map((item) => renderTile(item, group))}
              </ul>
            </div>
          );
        })}
      </div>
      {labelError ? (
        <p role="alert" className="font-data text-xs text-danger">
          {tt("labelInvalid", { max: TIER_LABEL_MAX })}
        </p>
      ) : null}

      {full ? (
        <p className="font-data text-xs text-paper-muted">{tt("full", { max: TIER_LIST_MAX_ITEMS })}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            {tt(`addSearch.${tierList.entityType}`)}
            <input
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper"
            />
          </label>
          {searchable ? (
            <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {candidates
                .filter((candidate) => !present.has(candidate.id))
                .map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => add(candidate.id, candidate.title)}
                      className="flex min-h-11 w-full flex-col justify-center rounded px-2 py-1.5 text-left transition-colors hover:bg-ink-surface"
                    >
                      <span className="truncate font-display text-sm text-paper">{candidate.title}</span>
                      <span className="truncate font-data text-xs text-paper-muted">{[candidate.subtitle, candidate.year].filter(Boolean).join(" · ")}</span>
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      )}

      <div {...dropZone(TRAY_GROUP)} className={`flex flex-col gap-2 rounded border border-dashed p-3 transition-colors ${dragOver === TRAY_GROUP ? "border-amber" : "border-ink-border"}`}>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-sm text-paper">{tt("tray")}</h2>
          <p className="font-data text-xs text-paper-muted">{tt("trayHint")}</p>
        </div>
        {tierList.tray.length === 0 ? (
          <p className="font-data text-xs text-paper-muted">{tt("trayEmpty")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label={tt("tierItems", { group: tt("tray"), count: tierList.tray.length, kind: tierList.entityType })}>
            {tierList.tray.map((item) => renderTile(item, TRAY_GROUP))}
          </ul>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      ) : null}

      <button type="button" onClick={() => setConfirmDelete(true)} className="self-start font-data text-xs text-danger underline-offset-2 hover:underline">
        {t("delete")}
      </button>

      {menu && menuItem && menuFrom ? (
        <TierItemMenu
          anchor={menu.anchor}
          item={menuItem}
          current={menuFrom.group}
          canLeft={menuFrom.index > 0}
          canRight={menuFrom.index < (menuFrom.group === TRAY_GROUP ? tierList.tray : tierList.tiers[menuFrom.group]!).length - 1}
          groupLabel={groupLabel}
          onClose={() => {
            const itemId = menu.itemId;
            setMenu(null);
            document.querySelector<HTMLElement>(`[data-tier-item="${itemId}"]`)?.focus();
          }}
          onMove={(group) => {
            setMenu(null);
            moveTo(menu.itemId, group);
          }}
          onShift={(delta) => {
            setMenu(null);
            shift(menu.itemId, delta);
          }}
          onRemove={() => {
            setMenu(null);
            remove(menu.itemId);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title={t("deleteTitle")}
        message={t("deleteMessage")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          void deleteLamina(tierList.id).then(() => router.push("/me/cards"));
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}

interface TierItemMenuProps {
  anchor: DOMRect;
  item: TierListItem;
  current: number;
  canLeft: boolean;
  canRight: boolean;
  groupLabel: (group: number) => string;
  onClose: () => void;
  onMove: (group: number) => void;
  onShift: (delta: -1 | 1) => void;
  onRemove: () => void;
}

/** Menú "Mover a…" de un disco: flechas, Inicio, Fin y Escape, como un menú del sistema. Se ubica junto al disco sin salir de la pantalla. */
function TierItemMenu({ anchor, item, current, canLeft, canRight, groupLabel, onClose, onMove, onShift, onRemove }: TierItemMenuProps) {
  const tt = useTranslations("laminas.tier");
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const score = scoreLabel(item);

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - MENU_WIDTH - 8));
    const below = anchor.bottom + 4;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, anchor.top - height - 4) : below;
    setPosition({ left, top });
  }, [anchor]);

  // Recién visible: un elemento con `visibility: hidden` no recibe el foco, así que se enfoca después de ubicarlo. Sin desplazar: el
  // menú se cierra al desplazarse.
  const placed = position !== null;
  useEffect(() => {
    if (placed) ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
  }, [placed]);

  useEffect(() => {
    const close = (event: Event) => {
      if (event.type === "pointerdown" && ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focus = (next: number) => items[(next + items.length) % items.length]?.focus({ preventScroll: true });
    if (event.key === "ArrowDown") focus(index + 1);
    else if (event.key === "ArrowUp") focus(index - 1);
    else if (event.key === "Home") focus(0);
    else if (event.key === "End") focus(items.length - 1);
    else if (event.key === "Escape" || event.key === "Tab") onClose();
    else return;
    event.preventDefault();
  }

  const entry = "flex min-h-9 w-full items-center gap-2 rounded px-2 text-left font-data text-xs text-paper transition-colors hover:bg-ink-border focus:bg-ink-border disabled:opacity-40 [@media(pointer:coarse)]:min-h-11";
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={tt("menuLabel", { title: item.target.title })}
      onKeyDown={onKeyDown}
      style={{ left: position?.left ?? anchor.left, top: position?.top ?? anchor.bottom, width: MENU_WIDTH, visibility: position ? "visible" : "hidden" }}
      className="fixed z-50 flex flex-col gap-0.5 rounded border border-ink-border bg-ink p-1.5 shadow-lg"
    >
      <div className="flex flex-col px-2 pb-1">
        <span className="truncate font-display text-sm text-paper">{item.target.title}</span>
        {item.target.artistName ? <span className="truncate font-data text-xs text-paper-muted">{item.target.artistName}</span> : null}
        <span className="font-data text-xs text-paper-muted">{score ? tt("yourScore", { score }) : tt("unrated")}</span>
      </div>
      <span className="px-2 font-data text-[0.6875rem] uppercase tracking-wider text-paper-muted">{tt("moveTo")}</span>
      {Array.from({ length: TIER_COUNT }, (_, group) => {
        const band = tierBand(group);
        return (
          <button key={group} type="button" role="menuitem" disabled={group === current} onClick={() => onMove(group)} className={entry}>
            <span className="grid h-5 min-w-5 place-items-center rounded px-1 font-display text-xs font-bold" style={{ backgroundColor: band.background, color: band.foreground }}>
              {groupLabel(group)}
            </span>
          </button>
        );
      })}
      <button type="button" role="menuitem" disabled={current === TRAY_GROUP} onClick={() => onMove(TRAY_GROUP)} className={entry}>
        {tt("tray")}
      </button>
      <hr className="my-1 border-ink-border" />
      <button type="button" role="menuitem" disabled={!canLeft} onClick={() => onShift(-1)} className={entry}>
        {tt("left")}
      </button>
      <button type="button" role="menuitem" disabled={!canRight} onClick={() => onShift(1)} className={entry}>
        {tt("right")}
      </button>
      <hr className="my-1 border-ink-border" />
      <button type="button" role="menuitem" onClick={onRemove} className={`${entry} text-danger`}>
        {tt("remove")}
      </button>
    </div>
  );
}

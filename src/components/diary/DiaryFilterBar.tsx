"use client";

import { useId, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DiaryMonth } from "@/lib/api/schemas";
import { DIARY_AUDIENCES, DIARY_TARGET_TYPES, LISTEN_CONTEXTS } from "@/services/diary/types";
import { REACTION_ICONS } from "./ReactionIcons";
import {
  REACTION_FILTER_VALUES,
  activeFilterCount,
  dateValue,
  hasActiveFilters,
  parseDateValue,
  type DiaryFiltersState,
} from "./diary-filters";

const TYPE_KEY = { artist: "artist", "release-group": "album", recording: "song" } as const;

// Nombre local del mes N (1-12). La fecha es un vehículo sintético: se formatea
// en UTC para que el nombre no se corra al mes anterior al oeste de UTC.
function monthName(month: number, locale: string): string {
  const label = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 font-data text-xs transition-colors [&>svg]:size-3.5 ${
        pressed
          ? "border-amber/60 bg-amber/10 text-amber"
          : "border-ink-border text-paper-muted hover:border-paper-muted hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span aria-hidden="true" className="font-data text-xs uppercase tracking-wide text-paper-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface DiaryFilterBarProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filters: DiaryFiltersState;
  onChange: (next: DiaryFiltersState) => void;
  onClear: () => void;
  months: DiaryMonth[];
}

// Barra de filtros compacta del diario propio (openspec: redesign-diary-page,
// D6): una sola línea con el buscador y «Filtros · N», que despliega un panel
// en el flujo (no flotante) con chips de selección única por grupo. Los filtros
// activos se ven fuera del panel como etiquetas que se quitan de a una. Fecha es
// un único `<select>` con los meses con escuchas agrupados por año.
export function DiaryFilterBar({ searchInput, onSearchChange, filters, onChange, onClear, months }: DiaryFilterBarProps) {
  const t = useTranslations("diary");
  const locale = useLocale();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);

  const set = (patch: Partial<DiaryFiltersState>) => onChange({ ...filters, ...patch });
  // Un chip ya elegido, pulsado de nuevo, quita el filtro de su grupo.
  const toggle = <K extends "reaction" | "context" | "audience" | "type">(key: K, value: DiaryFiltersState[K]) =>
    set({ [key]: filters[key] === value ? "" : value } as Partial<DiaryFiltersState>);

  const years = Array.from(new Set(months.map((m) => m.year))).sort((a, b) => b - a);
  const monthsOf = (year: number) =>
    months
      .filter((m) => m.year === year)
      .map((m) => m.month)
      .sort((a, b) => b - a);

  const reactionLabel = (value: (typeof REACTION_FILTER_VALUES)[number]) => t(`reaction.${value}`);
  const dateLabel = filters.year
    ? filters.month
      ? `${monthName(Number(filters.month), locale)} ${filters.year}`
      : t("filterWholeYear", { year: filters.year })
    : "";

  const activeChips: { key: string; label: string; clear: () => void }[] = [
    filters.reaction && { key: "reaction", label: reactionLabel(filters.reaction), clear: () => set({ reaction: "" }) },
    filters.context && { key: "context", label: t(`context.${filters.context}`), clear: () => set({ context: "" }) },
    filters.audience && { key: "audience", label: t(`audience.${filters.audience}`), clear: () => set({ audience: "" }) },
    filters.type && { key: "type", label: t(`targetTypePlural.${TYPE_KEY[filters.type]}`), clear: () => set({ type: "" }) },
    filters.year && { key: "date", label: dateLabel, clear: () => set({ year: "", month: "" }) },
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => Boolean(chip));

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          autoComplete="off"
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="min-h-11 min-w-0 flex-1 rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted sm:min-h-0"
        />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 font-data text-sm transition-colors sm:min-h-0 ${
            count > 0 || open
              ? "border-amber/60 text-amber"
              : "border-ink-border text-paper-muted hover:border-paper-muted hover:text-paper"
          }`}
        >
          {count > 0 ? t("filtersActive", { count }) : t("filters")}
        </button>
      </div>

      {open && (
        <div id={panelId} className="flex flex-col gap-4 rounded-md border border-ink-border bg-ink-surface p-4">
          <ChipGroup label={t("filterAllReaction")}>
            {REACTION_FILTER_VALUES.map((value) => (
              <Chip key={value} pressed={filters.reaction === value} onClick={() => toggle("reaction", value)}>
                {value !== "none" ? REACTION_ICONS[value] : null}
                {reactionLabel(value)}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup label={t("filterAllContext")}>
            {LISTEN_CONTEXTS.map((value) => (
              <Chip key={value} pressed={filters.context === value} onClick={() => toggle("context", value)}>
                {t(`context.${value}`)}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup label={t("filterAllAudience")}>
            {DIARY_AUDIENCES.map((value) => (
              <Chip key={value} pressed={filters.audience === value} onClick={() => toggle("audience", value)}>
                {t(`audience.${value}`)}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup label={t("typeLabel")}>
            {DIARY_TARGET_TYPES.map((value) => (
              <Chip key={value} pressed={filters.type === value} onClick={() => toggle("type", value)}>
                {t(`targetTypePlural.${TYPE_KEY[value]}`)}
              </Chip>
            ))}
          </ChipGroup>
          <label className="flex flex-col gap-1.5">
            <span className="font-data text-xs uppercase tracking-wide text-paper-muted">{t("dateLabel")}</span>
            <select
              value={dateValue(filters)}
              onChange={(event) => set(parseDateValue(event.target.value))}
              className="min-h-11 rounded-md border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper sm:min-h-0 sm:max-w-xs"
            >
              <option value="">{t("filterAnyDate")}</option>
              {years.map((year) => (
                <optgroup key={year} label={String(year)}>
                  <option value={String(year)}>{t("filterWholeYear", { year: String(year) })}</option>
                  {monthsOf(year).map((month) => (
                    <option key={month} value={`${year}-${month}`}>
                      {monthName(month, locale)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      )}

      {(activeChips.length > 0 || hasActiveFilters(filters)) && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              aria-label={t("removeFilter", { label: chip.label })}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-amber/60 bg-amber/10 px-3 py-0.5 font-data text-xs text-amber transition-colors hover:bg-amber/15"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="min-h-8 px-1 font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
          >
            {t("clearFilters")}
          </button>
        </div>
      )}
    </div>
  );
}

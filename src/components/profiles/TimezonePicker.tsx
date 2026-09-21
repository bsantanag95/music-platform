"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { TIMEZONES } from "@/lib/music-identity";

interface TimezonePickerProps {
  id: string;
  label: string;
  /** Zona elegida; cadena vacía = sin zona. */
  value: string;
  onChange: (zone: string) => void;
}

// Sin tildes, en minúsculas y con `_` y `/` como espacios: "Buenos Aires" encuentra
// `America/Argentina/Buenos_Aires` y "sao paulo" encuentra `America/Sao_Paulo`.
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_/]/g, " ");

const regionOf = (zone: string) => (zone.includes("/") ? zone.slice(0, zone.indexOf("/")) : zone);
const cityOf = (zone: string) => zone.slice(zone.lastIndexOf("/") + 1);

// Todas las zonas con su texto de búsqueda precalculado (se hace una sola vez).
const INDEX = TIMEZONES.map((zone) => ({ zone, haystack: normalize(zone), city: normalize(cityOf(zone)) }));

/**
 * Zonas que coinciden con la búsqueda: cada palabra escrita tiene que aparecer en
 * el nombre. Las que EMPIEZAN por la búsqueda en la ciudad van primero ("par"
 * pone Paris antes que las que solo lo contienen); el resto conserva el orden
 * alfabético.
 */
export function filterTimezones(query: string): string[] {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return INDEX.map((entry) => entry.zone);
  const joined = words.join(" ");
  const matches = INDEX.filter((entry) => words.every((word) => entry.haystack.includes(word)));
  const rank = (entry: (typeof INDEX)[number]) => (entry.city.startsWith(joined) ? 0 : 1);
  return matches
    .map((entry, order) => ({ entry, order }))
    .sort((a, b) => rank(a.entry) - rank(b.entry) || a.order - b.order)
    .map(({ entry }) => entry.zone);
}

type Row = { kind: "none" } | { kind: "zone"; zone: string };

// Selector de zona horaria con buscador (spec profile-identity: la zona se elige de
// una lista, y la lista tiene ~400 zonas). Combobox ARIA con la lista en línea, no
// flotante: dentro del panel lateral de edición una lista absoluta quedaría
// recortada por su scroll. Se filtra al escribir; las flechas mueven la opción
// activa, Enter elige, Escape cierra la lista (sin cerrar el panel que la aloja).
export function TimezonePicker({ id, label, value, onChange }: TimezonePickerProps) {
  const t = useTranslations("users");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const zones = useMemo(() => filterTimezones(query), [query]);
  // "Sin zona horaria" solo se ofrece sin búsqueda: filtrando, buscar es lo que importa.
  const rows: Row[] = useMemo(
    () => [...(query.trim() === "" ? [{ kind: "none" } as Row] : []), ...zones.map((zone): Row => ({ kind: "zone", zone }))],
    [query, zones],
  );

  // Al abrir, la opción activa es la elegida (o la primera).
  useEffect(() => {
    if (!open) return;
    const selected = rows.findIndex((row) => (row.kind === "none" ? value === "" : row.zone === value));
    setActive(selected >= 0 && query === "" ? selected : 0);
    // Solo al abrir o al cambiar la búsqueda, no cada vez que cambia `value`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  // Mantiene visible la opción activa dentro de la lista con scroll.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function choose(row: Row | undefined) {
    if (!row) return;
    onChange(row.kind === "none" ? "" : row.zone);
    close();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const last = rows.length - 1;
      setActive((current) => (event.key === "ArrowDown" ? Math.min(current + 1, last) : Math.max(current - 1, 0)));
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActive(rows.length - 1);
    } else if (event.key === "Enter" && open) {
      // Enter elige la opción activa; no debe enviar el formulario que aloja el selector.
      event.preventDefault();
      choose(rows[active]);
    } else if (event.key === "Escape" && open) {
      // Cierra solo la lista: el panel de edición también escucha Escape. En Next el
      // listener de React está en `document` (la raíz se hidrata sobre él), el mismo
      // nodo donde escucha el panel, así que `stopPropagation` no basta: hace falta
      // `stopImmediatePropagation` para que los listeners posteriores no lo reciban.
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      close();
    }
  }

  const activeId = open && rows[active] ? `${listId}-opt-${active}` : undefined;
  const resultCount = zones.length;

  // Encabezados de región solo entre zonas (nunca antes de "Sin zona").
  let lastRegion = "";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display text-sm text-paper-muted">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        spellCheck={false}
        value={open ? query : value}
        placeholder={open ? (value === "" ? t("edit.timezoneSearch") : value) : t("edit.timezoneNone")}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
        }}
        onBlur={() => close()}
        onKeyDown={onKeyDown}
        className="rounded border border-ink-border bg-ink-surface px-3 py-2 font-body text-paper placeholder:text-paper-muted"
      />

      {open && (
        <>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            // Evita que el clic en una opción quite el foco al campo (y cierre la lista) antes de elegir.
            onMouseDown={(event) => event.preventDefault()}
            className="themed-scrollbar max-h-64 overflow-y-auto rounded border border-ink-border bg-ink-surface py-1"
          >
            {rows.map((row, index) => {
              const selected = row.kind === "none" ? value === "" : row.zone === value;
              const region = row.kind === "zone" ? regionOf(row.zone) : "";
              const header = row.kind === "zone" && region !== lastRegion ? region : null;
              if (row.kind === "zone") lastRegion = region;
              return (
                <li key={row.kind === "none" ? "none" : row.zone} role="presentation">
                  {header && (
                    <div aria-hidden="true" className="px-3 pb-0.5 pt-2 font-data text-[11px] uppercase tracking-wide text-paper-muted">
                      {header}
                    </div>
                  )}
                  <div
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={selected}
                    data-active={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(row)}
                    className={`cursor-pointer px-3 py-1.5 font-body text-sm ${
                      index === active ? "bg-amber/15 text-paper" : "text-paper-muted"
                    } ${selected ? "font-semibold text-paper" : ""}`}
                  >
                    {row.kind === "none" ? t("edit.timezoneNone") : row.zone}
                  </div>
                </li>
              );
            })}
          </ul>
          <p role="status" className="font-data text-xs text-paper-muted">
            {resultCount === 0 ? t("edit.timezoneNoResults", { query: query.trim() }) : t("edit.timezoneResults", { count: resultCount })}
          </p>
        </>
      )}
    </div>
  );
}

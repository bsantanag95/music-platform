"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

// Sin tildes, en minúsculas y con `_` y `/` como espacios: "Buenos Aires" encuentra
// `America/Argentina/Buenos_Aires` y "mexico" encuentra "México".
export const normalizeSearch = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_/]/g, " ");

export interface PickerOption {
  /** Valor que se guarda ("America/Santiago", "CL"). */
  value: string;
  /** Texto que se ve en la lista y en el campo cerrado. */
  label: string;
  /** Texto de búsqueda ya normalizado (`normalizeSearch`). */
  haystack: string;
  /** Texto ya normalizado por el que se priorizan las coincidencias que EMPIEZAN con la búsqueda. */
  rankText?: string;
  /** Encabezado de grupo (p. ej. la región de una zona); se muestra al cambiar de grupo. */
  group?: string;
}

/**
 * Opciones que coinciden con la búsqueda: cada palabra escrita tiene que aparecer en
 * el texto de búsqueda. Las que EMPIEZAN por la búsqueda en `rankText` van primero
 * ("par" pone Paris antes que las que solo lo contienen); el resto conserva el orden.
 */
export function filterPickerOptions(options: readonly PickerOption[], query: string): PickerOption[] {
  const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...options];
  const joined = words.join(" ");
  const matches = options.filter((option) => words.every((word) => option.haystack.includes(word)));
  const rank = (option: PickerOption) => ((option.rankText ?? option.haystack).startsWith(joined) ? 0 : 1);
  return matches
    .map((option, order) => ({ option, order }))
    .sort((a, b) => rank(a.option) - rank(b.option) || a.order - b.order)
    .map(({ option }) => option);
}

export interface SearchablePickerTexts {
  /** Opción y texto del campo cerrado cuando no hay valor ("Sin zona horaria", "Sin país"). */
  none: string;
  /** Placeholder del campo abierto cuando no hay valor. */
  searchPlaceholder: string;
  noResults: (query: string) => string;
  results: (count: number) => string;
}

interface SearchablePickerProps {
  id: string;
  label: string;
  /** Valor elegido; cadena vacía = sin valor. */
  value: string;
  onChange: (value: string) => void;
  options: readonly PickerOption[];
  texts: SearchablePickerTexts;
}

type Row = { kind: "none" } | { kind: "option"; option: PickerOption };

// Selector con buscador para listas largas cerradas (zonas horarias, países). Combobox
// ARIA con la lista en línea, no flotante: dentro del panel lateral de edición una lista
// absoluta quedaría recortada por su scroll. Se filtra al escribir; las flechas mueven la
// opción activa, Enter elige, Escape cierra la lista (sin cerrar el panel que la aloja).
export function SearchablePicker({ id, label, value, onChange, options, texts }: SearchablePickerProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const matches = useMemo(() => filterPickerOptions(options, query), [options, query]);
  // «Sin valor» solo se ofrece sin búsqueda: filtrando, buscar es lo que importa.
  const rows: Row[] = useMemo(
    () => [
      ...(query.trim() === "" ? [{ kind: "none" } as Row] : []),
      ...matches.map((option): Row => ({ kind: "option", option })),
    ],
    [query, matches],
  );
  const valueLabel = options.find((option) => option.value === value)?.label ?? "";

  // Al abrir, la opción activa es la elegida (o la primera).
  useEffect(() => {
    if (!open) return;
    const selected = rows.findIndex((row) => (row.kind === "none" ? value === "" : row.option.value === value));
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
    onChange(row.kind === "none" ? "" : row.option.value);
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
  const resultCount = matches.length;

  // Encabezados de grupo solo entre opciones (nunca antes de «sin valor»).
  let lastGroup = "";

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
        value={open ? query : valueLabel}
        placeholder={open ? (value === "" ? texts.searchPlaceholder : valueLabel) : texts.none}
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
              const selected = row.kind === "none" ? value === "" : row.option.value === value;
              const group = row.kind === "option" ? (row.option.group ?? "") : "";
              const header = row.kind === "option" && group !== "" && group !== lastGroup ? group : null;
              if (row.kind === "option") lastGroup = group;
              return (
                <li key={row.kind === "none" ? "none" : row.option.value} role="presentation">
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
                    {row.kind === "none" ? texts.none : row.option.label}
                  </div>
                </li>
              );
            })}
          </ul>
          <p role="status" className="font-data text-xs text-paper-muted">
            {resultCount === 0 ? texts.noResults(query.trim()) : texts.results(resultCount)}
          </p>
        </>
      )}
    </div>
  );
}

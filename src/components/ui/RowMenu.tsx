"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Primitivo genérico de menú "···" para una fila (openspec: redesign-diary-row).
// Sin dependencia nueva: botón `aria-haspopup="menu"` + `<ul role="menu">`
// posicionado `absolute` bajo el trigger, sin portal (a diferencia de
// `RegisterListenDialog`, que sí lo necesita por ser un modal de pantalla
// completa — una fila no tiene ese problema de recorte). Cierra con `Escape`,
// al elegir un ítem, o con un click fuera.
const RowMenuContext = createContext<{ close: () => void } | null>(null);

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

interface RowMenuProps {
  label: string;
  children: ReactNode;
}

export function RowMenu({ label, children }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const first = listRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className="flex size-6 items-center justify-center rounded text-paper-muted transition-colors hover:text-paper"
      >
        <KebabIcon />
      </button>
      {open && (
        <ul
          ref={listRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-10 mt-1 flex min-w-[11rem] flex-col overflow-hidden rounded-md border border-ink-border bg-ink-surface py-1 font-data text-xs shadow-none"
        >
          <RowMenuContext.Provider value={{ close: () => setOpen(false) }}>{children}</RowMenuContext.Provider>
        </ul>
      )}
    </div>
  );
}

interface RowMenuItemProps {
  onSelect: () => void;
  danger?: boolean;
  children: ReactNode;
}

export function RowMenuItem({ onSelect, danger = false, children }: RowMenuItemProps) {
  const ctx = useContext(RowMenuContext);
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          ctx?.close();
          onSelect();
        }}
        className={`w-full px-3 py-1.5 text-left leading-relaxed transition-colors hover:bg-ink ${
          danger ? "text-danger" : "text-paper"
        }`}
      >
        {children}
      </button>
    </li>
  );
}

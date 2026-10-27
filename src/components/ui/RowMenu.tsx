"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Primitivo genérico de menú "···" para una fila (openspec: redesign-diary-row).
// Sin dependencia nueva: botón `aria-haspopup="menu"` + `<ul role="menu">`
// posicionado `absolute` bajo el trigger, sin portal (a diferencia de
// `RegisterListenDialog`, que sí lo necesita por ser un modal de pantalla
// completa — una fila no tiene ese problema de recorte). Cierra con `Escape`,
// al elegir un ítem, o con un click fuera. Si a la izquierda no hay lugar (la primera columna de una estantería en un
// teléfono), se abre hacia la derecha; Escape devuelve el foco al disparador (openspec: redesign-me-lists-views, D8).
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
  /** Tamaño del control; por defecto 24 px. La tracklist lo agranda para el área táctil. */
  triggerClassName?: string;
}

export function RowMenu({ label, children, triggerClassName = "size-6" }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setAlignLeft(false);
      return;
    }
    const rect = listRef.current?.getBoundingClientRect();
    if (rect && rect.left < 8) setAlignLeft(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
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
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className={`flex ${triggerClassName} items-center justify-center rounded text-paper-muted transition-colors hover:text-paper`}
      >
        <KebabIcon />
      </button>
      {open && (
        <ul
          ref={listRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className={`absolute ${alignLeft ? "left-0" : "right-0"} z-10 mt-1 flex min-w-[11rem] flex-col overflow-hidden rounded-md border border-ink-border bg-ink-surface py-1 font-data text-xs shadow-none`}
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
        className={`w-full whitespace-nowrap px-3 py-1.5 text-left leading-relaxed transition-colors hover:bg-ink [@media(pointer:coarse)]:min-h-11 ${
          danger ? "text-danger" : "text-paper"
        }`}
      >
        {children}
      </button>
    </li>
  );
}

// Separador entre grupos de opciones (openspec: redesign-diary-page, D4): por
// ejemplo, para apartar «Eliminar» del resto. Decorativo para el lector de
// pantalla: `role="separator"` dentro de un `menu` es válido y no recibe foco.
export function RowMenuSeparator() {
  return <li role="separator" className="my-1 border-t border-ink-border" />;
}

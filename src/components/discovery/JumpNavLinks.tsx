"use client";

import { useEffect, useRef, useState } from "react";
import type { JumpItem } from "./ExploreJumpNav";

/**
 * Sección "a la vista": la última cuyo borde superior ya pasó la línea que dejan la cabecera global y la barra.
 * Al llegar al final de la página gana la última sección, aunque sea corta y su borde no alcance la línea.
 */
export function pickActiveSection(
  sections: { id: string; top: number }[],
  line: number,
  atBottom: boolean,
): string | null {
  if (sections.length === 0) return null;
  if (atBottom) return sections[sections.length - 1]!.id;
  let active: string | null = null;
  for (const section of sections) {
    if (section.top - 1 <= line) active = section.id;
  }
  return active;
}

// Enlaces de la barra de pasillos de Explorar (openspec: redesign-explore-phase1). Marca con `aria-current` el de la
// sección a la vista, recalculando al desplazar (con `requestAnimationFrame`, una vez por cuadro) y al cambiar el tamaño.
// En pantallas angostas desplaza la fila —no la página— para que el enlace marcado quede visible. Sin JavaScript se ven
// los mismos enlaces, sin marca.
export function JumpNavLinks({ items }: { items: JumpItem[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bar = listRef.current?.closest("div.sticky");
      const line = (bar?.getBoundingClientRect().bottom ?? 0) + 24;
      const sections = items.flatMap((item) => {
        const el = document.getElementById(item.id);
        return el ? [{ id: item.id, top: el.getBoundingClientRect().top }] : [];
      });
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(pickActiveSection(sections, line, atBottom));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [items]);

  useEffect(() => {
    const list = listRef.current;
    if (!active || !list || list.scrollWidth <= list.clientWidth) return;
    const link = list.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`);
    if (!link) return;
    // Solo la fila: centrar el enlace sin tocar el desplazamiento vertical de la página.
    const left = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "auto" });
  }, [active]);

  return (
    <ul ref={listRef} className="-ml-3 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const current = item.id === active;
        return (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              aria-current={current ? "true" : undefined}
              className={`relative inline-flex h-11 items-center px-3 font-display text-[0.9375rem] transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-amber after:transition-transform after:duration-200 ${
                current ? "text-paper after:scale-x-100" : "text-paper-muted after:scale-x-0 hover:text-paper"
              }`}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

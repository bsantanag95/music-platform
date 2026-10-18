"use client";

import { useEffect, useState } from "react";

export interface StickyJumpItem {
  /** Ancla de la sección (`id` del elemento al que salta). */
  id: string;
  label: string;
}

/**
 * Navegación por grupos de la página de una ceremonia: queda fija bajo la cabecera del sitio al bajar y marca el grupo que
 * se está viendo. La página es muy larga (decenas de categorías) y las píldoras solo estaban arriba: para pasar de Pop a Rock
 * había que volver al principio. Son enlaces `#ancla` normales (sin JavaScript también saltan); el grupo activo se calcula al
 * desplazarse, por la posición de cada ancla. Tiene que ser hija directa del contenedor largo de la página para quedar fija.
 */
export function StickyJumpNav({ label, items }: { label: string; items: StickyJumpItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    // Activo: el último grupo cuyo título ya pasó la franja superior (bajo la cabecera y la propia barra).
    const update = () => {
      let current: string | null = null;
      for (const el of targets) {
        if (el.getBoundingClientRect().top <= 160) current = el.id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  if (items.length < 2) return null;
  return (
    <nav
      aria-label={label}
      className="sticky top-16 z-20 -mx-4 w-[calc(100%+2rem)] border-b border-ink-border bg-ink/90 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-ink/75"
    >
      <ul className="flex w-full gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const current = item.id === active;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                className={`inline-flex items-center rounded-full border px-3 py-1 font-data text-xs transition-colors focus-visible:border-amber ${
                  current
                    ? "border-amber bg-ink-surface text-paper"
                    : "border-ink-border text-paper-muted hover:border-paper-muted/60 hover:text-paper"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

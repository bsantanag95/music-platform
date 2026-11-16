"use client";

import { useEffect, useState } from "react";

export interface ProfileAnchor {
  /** `id` de la sección a la que salta (`perfil` para «Resumen»). */
  id: string;
  label: string;
  /** Recuento visible junto al nombre, si la sección lo tiene. */
  count?: number;
}

// Barra de anclas del perfil (spec social-profiles, "Cabecera del perfil";
// openspec: redesign-user-profile-phase1): queda fija bajo la cabecera del
// sitio al bajar y marca la sección que se está viendo. Son enlaces `#ancla`
// normales —sin JavaScript también saltan—; quien la compone pasa solo las
// secciones con contenido visible. La sección activa se calcula al desplazarse
// por la posición de cada ancla, igual que `StickyJumpNav` en las ceremonias.
// Tiene que ser hija directa del contenedor largo de la página para quedar fija.
export function ProfileAnchors({ label, items }: { label: string; items: ProfileAnchor[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    // Activa: la última sección cuyo inicio ya pasó bajo la cabecera del sitio y esta barra. Las
    // secciones llegan en streaming después de montar la barra: se buscan en cada cálculo, no una vez.
    const update = () => {
      let current = items[0]?.id ?? null;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 140) current = item.id;
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
      className="sticky top-[var(--site-header-h)] z-20 w-full border-b border-ink-border bg-ink/95 backdrop-blur-md supports-[backdrop-filter]:bg-ink/85"
    >
      <ul className="mx-auto flex h-[var(--profile-anchors-h)] w-full max-w-7xl gap-1 overflow-x-auto px-4 [scrollbar-width:none] xl:px-6 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const current = item.id === active;
          return (
            <li key={item.id} className="flex shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 font-display text-[0.9375rem] transition-colors ${
                  current ? "border-amber text-paper" : "border-transparent text-paper-muted hover:text-paper"
                }`}
              >
                {item.label}
                {item.count != null && <span className="font-data text-xs text-paper-muted">{item.count}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

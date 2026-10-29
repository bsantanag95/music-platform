"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useUnsavedChanges } from "./UnsavedChangesGuard";

interface SettingsSectionIndexProps {
  sections: { id: string; label: string }[];
}

// Índice de la pantalla Perfil (openspec: refine-settings-editing, D2): una fila de enlaces a cada tarjeta que se queda
// bajo la cabecera del sitio al desplazarse, marca la sección visible y lleva un punto en las que tienen cambios sin
// guardar. En un teléfono es una fila con scroll horizontal.
export function SettingsSectionIndex({ sections }: SettingsSectionIndexProps) {
  const t = useTranslations("users");
  const guard = useUnsavedChanges();
  const [active, setActive] = useState(sections[0]?.id ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id.replace(/^settings-/, "");
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
          else visible.delete(id);
        }
        // La primera sección (en el orden de la página) que está en la franja superior.
        const first = sections.find((section) => visible.has(section.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    for (const section of sections) {
      const element = document.getElementById(`settings-${section.id}`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label={t("settings.profile.indexLabel")}
      className="sticky top-16 z-10 -mx-1 flex gap-1 overflow-x-auto bg-ink px-1 py-2 [scrollbar-width:none]"
    >
      {sections.map((section) => {
        const current = section.id === active;
        const dirty = guard?.dirty.has(section.id) ?? false;
        return (
          <a
            key={section.id}
            href={`#settings-${section.id}`}
            aria-current={current ? "location" : undefined}
            onClick={() => setActive(section.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-data text-xs transition-colors [@media(pointer:coarse)]:min-h-11 ${
              current
                ? "border-amber text-amber"
                : "border-ink-border text-paper-muted hover:border-amber/60 hover:text-paper"
            }`}
          >
            {section.label}
            {dirty ? (
              <span aria-label={t("settings.unsaved.badge")} className="size-1.5 rounded-full bg-amber" />
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}

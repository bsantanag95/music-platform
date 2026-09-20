import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

// Encabezado y contenedor común de una pantalla del área de ajustes. Síncrono
// (recibe el texto ya traducido) para poder anidarse en pruebas de Server
// Components sin resolver componentes async dentro de otros.
export function SettingsSection({ title, intro, children }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-paper">{title}</h2>
        {intro && <p className="font-body text-sm text-paper-muted">{intro}</p>}
      </header>
      {children}
    </section>
  );
}

/** Tarjeta que aloja un editor o un grupo de controles dentro de una pantalla. */
export function SettingsCard({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-ink-border bg-ink-surface p-5">{children}</div>;
}

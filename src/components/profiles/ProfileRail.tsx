import type { ReactNode } from "react";

interface ProfileRailProps {
  label: string;
  /** Conteo visible junto al título (mono, apagado). */
  count?: number;
  /** Ancla para los enlaces de Nivel 3 del perfil (spec `social-profiles`). */
  id?: string;
  children: ReactNode;
}

// Encabezado uniforme de cada estante del perfil (diario, favoritos, listas,
// colección): título en display + conteo en mono. El cuerpo lo aporta el
// componente de lectura existente (`DiaryList`, `FavoritesWall`, ...). Un
// estante vacío no se renderiza: esa decisión vive en cada sección de la
// página, no acá.
export function ProfileRail({ label, count, id, children }: ProfileRailProps) {
  return (
    <section id={id} className="flex w-full max-w-2xl scroll-mt-8 flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-xl text-paper">{label}</h2>
        {count != null && <span className="font-data text-xs text-paper-muted">{count}</span>}
      </div>
      {children}
    </section>
  );
}

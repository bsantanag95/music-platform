import type { ReactNode } from "react";
import { ProfileSectionHeading } from "./ProfileSectionHeading";

interface ProfileRailProps {
  label: string;
  /** Conteo visible junto al título (mono, apagado). */
  count?: number;
  /** Ancla para la barra de anclas del perfil (spec `social-profiles`). */
  id?: string;
  /** Vista completa de Nivel 3 («Ver todo →»). */
  more?: { href: string; label: string } | null;
  children: ReactNode;
}

// Estante del cuerpo del perfil (diario, favoritos, listas, colección,
// conciertos): el encabezado común —título, conteo y «Ver todo →»— y el cuerpo
// que aporta cada vista previa. Un estante vacío no se renderiza: esa decisión
// vive en cada sección de la página, no acá. Reserva la altura de la cabecera
// del sitio y de la barra de anclas al saltar a su ancla.
export function ProfileRail({ label, count, id, more, children }: ProfileRailProps) {
  return (
    <section
      id={id}
      className="flex w-full scroll-mt-[calc(var(--site-header-h,0px)+var(--profile-anchors-h,0px)+1rem)] flex-col gap-4"
    >
      <ProfileSectionHeading title={label} count={count} more={more} />
      {children}
    </section>
  );
}

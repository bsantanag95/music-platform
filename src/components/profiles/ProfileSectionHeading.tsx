import { Link } from "@/i18n/navigation";

interface ProfileSectionHeadingProps {
  title: string;
  /** Recuento visible junto al título (mono, apagado). */
  count?: number | null;
  /** Vista completa de Nivel 3, enlazada a la derecha del título. */
  more?: { href: string; label: string } | null;
  /** `id` del `h2`, para `aria-labelledby` de la sección. */
  id?: string;
}

// Encabezado común de las secciones del cuerpo del perfil (spec social-profiles,
// "Cuerpo del perfil en filas"; openspec: redesign-user-profile-phase2): título,
// recuento y el enlace «Ver todo →» a la vista completa cuando existe. Sin
// subtítulos ni numeración. Reemplaza al bloque de enlaces de Nivel 3 que antes
// cerraba el perfil.
export function ProfileSectionHeading({ title, count, more, id }: ProfileSectionHeadingProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="flex items-baseline gap-2 font-display text-xl text-paper">
        {title}
        {count != null && <span className="font-data text-xs text-paper-muted">{count}</span>}
      </h2>
      {more && (
        <Link
          href={more.href}
          className="shrink-0 font-data text-xs text-paper-muted transition-colors hover:text-amber"
        >
          {more.label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

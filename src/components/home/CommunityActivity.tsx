import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CompactActivityRow, type CompactActivityEntry } from "@/components/feed/CompactActivityRow";

interface CommunityActivityProps {
  entries: CompactActivityEntry[];
  /**
   * Acceso contextual a `/users` ("Conoce a quienes escuchan") para visitantes sin sesión:
   * reemplaza al botón suelto que había entre secciones (redesign-anon-home-phase1). Con
   * sesión se llega a Usuarios desde el buscador por ámbito.
   */
  showPeopleLink?: boolean;
}

// Ratings, comentarios y reseñas públicos recientes de cualquier usuario con
// perfil público, sin requerir seguimiento — ver docs/05-features/home.md.
// Bloque de prueba social: siempre en layout denso (filas con hairline). La
// fila (`CompactActivityRow`) es cliente y se reusa en la sección "Recientes"
// paginada de `/activity`.
export async function CommunityActivity({ entries, showPeopleLink = false }: CommunityActivityProps) {
  if (entries.length === 0) return null;

  const tHome = await getTranslations("home");

  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-xl text-paper">{tHome("communityActivityTitle")}</h2>
        <div className="flex items-baseline gap-4">
          {showPeopleLink ? (
            <Link
              href="/users"
              className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
            >
              {tHome("communityPeopleLink")}
            </Link>
          ) : null}
          <Link
            href="/activity"
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {tHome("feedPreviewSeeAll")}
          </Link>
        </div>
      </div>

      <ul className="divide-y divide-ink-border">
        {entries.map((entry) => (
          <CompactActivityRow key={`${entry.kind}-${entry.id}`} entry={entry} />
        ))}
      </ul>
    </section>
  );
}

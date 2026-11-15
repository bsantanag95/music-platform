import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CompactActivityRow, type CompactActivityEntry } from "@/components/feed/CompactActivityRow";
import { ActivityCard } from "./ActivityCard";

interface CommunityActivityProps {
  entries: CompactActivityEntry[];
  /**
   * `rows` (por defecto, Inicio con sesión): sección propia con título y filas densas.
   * `cards` (portada sin sesión, redesign-anon-home-phase2): solo la rejilla de tarjetas, dentro de
   * la sección de la comunidad, que ya tiene su encabezado; la primera tarjeta va a lo ancho.
   */
  layout?: "rows" | "cards";
  /** Nombre accesible de la rejilla de tarjetas (el título de la sección que la contiene). */
  label?: string;
}

// Ratings, comentarios y reseñas públicos recientes de cualquier usuario con
// perfil público, sin requerir seguimiento — ver docs/05-features/home.md.
// Con sesión es un bloque de prueba social en layout denso (filas con hairline,
// `CompactActivityRow`, cliente); sin sesión, tarjetas (`ActivityCard`).
export async function CommunityActivity({ entries, layout = "rows", label }: CommunityActivityProps) {
  if (entries.length === 0) return null;

  if (layout === "cards") {
    return (
      <ul aria-label={label} className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry, index) => (
          <ActivityCard key={`${entry.kind}-${entry.id}`} entry={entry} wide={index === 0} />
        ))}
      </ul>
    );
  }

  const tHome = await getTranslations("home");

  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-paper">{tHome("communityActivityTitle")}</h2>
        <Link
          href="/activity"
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {tHome("feedPreviewSeeAll")}
        </Link>
      </div>

      <ul className="divide-y divide-ink-border">
        {entries.map((entry) => (
          <CompactActivityRow key={`${entry.kind}-${entry.id}`} entry={entry} />
        ))}
      </ul>
    </section>
  );
}

import type { ThresholdedCount } from "@/services/catalog/album-community-shared";
import { countryName } from "@/lib/personal-info";

// Formato de un concierto compartido (openspec: add-shared-concerts-phase1). Funciones puras.

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** "3 personas estuvieron" / "Menos de 5 personas estuvieron"; `null` si nadie estuvo. */
export function attendeesLabel(attendees: ThresholdedCount | null, t: Translate): string | null {
  if (!attendees) return null;
  return attendees.kind === "exact"
    ? t("attendeesExact", { count: attendees.value })
    : t("attendeesFewer", { threshold: attendees.threshold });
}

/** "Estadio Nacional · Santiago, Chile", omitiendo lo que falte; `null` si no hay nada. */
export function sharedConcertPlace(
  concert: { venue: string | null; city: string | null; country: string | null },
  locale: string,
): string | null {
  const area = [concert.city, concert.country ? countryName(concert.country, locale) : null].filter(Boolean).join(", ");
  const place = [concert.venue, area || null].filter(Boolean).join(" · ");
  return place || null;
}

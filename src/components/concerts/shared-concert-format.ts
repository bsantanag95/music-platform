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

/** Rango de un festival de varios días: "26–30 de junio de 2019" (add-shared-concerts-phase3). */
export function formatConcertRange(start: string, end: string, locale: string): string {
  const toDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day));
  };
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).formatRange(
    toDate(start),
    toDate(end),
  );
}

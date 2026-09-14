import type { useTranslations } from "next-intl";
import type { ArtistJourneySummary } from "@/lib/api/schemas";

export interface ArtistJourneyListActions {
  busyId: string | null;
  remove: (artistId: string) => void;
  archive: (artistId: string) => void;
}

export interface ArtistJourneyRendererProps {
  journeys: ArtistJourneySummary[];
  actions: ArtistJourneyListActions;
}

// `\p{M}` (Unicode general category "Mark") captura toda marca combinable,
// diacríticos incluidos.
const DIACRITIC_MARKS = /\p{M}/gu;

// Normaliza para comparar sin distinguir may/minúsculas ni diacríticos (á, ä,
// ñ, etc.): el buscador debe encontrar "Sábado" con "sabado" y viceversa.
// NFD separa cada letra de su marca diacrítica en un carácter combinable
// aparte, que luego se descarta.
export function normalizeForSearch(value: string): string {
  return value.normalize("NFD").replace(DIACRITIC_MARKS, "").toLowerCase();
}

export function stateLabel(
  state: ArtistJourneySummary["state"],
  t: ReturnType<typeof useTranslations>,
): string {
  if (state === "archived") return t("stateArchived");
  if (state === "complete") return t("stateComplete");
  return t("stateInProgress");
}

export function StateLabel({ state, label }: { state: ArtistJourneySummary["state"]; label: string }) {
  const colorClass = state === "complete" ? "border-petrol/50 text-petrol" : "border-ink-border text-paper-muted";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 font-data text-[0.65rem] uppercase tracking-wider ${colorClass}`}
    >
      {label}
    </span>
  );
}

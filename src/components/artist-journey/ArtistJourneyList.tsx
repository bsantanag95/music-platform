import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { ArtistJourneySummary } from "@/lib/api/schemas";

interface ArtistJourneyListProps {
  journeys: ArtistJourneySummary[];
}

// Listado propio de `/me/artist-journeys` (openspec: add-artist-journey):
// punto de entrada desde el menú de usuario. Solo lectura — gestionar la
// selección de cada recorrido sigue ocurriendo en la página de su artista
// (`ArtistJourneySection`/`ArtistJourneyModal`). Sin progreso ni fracciones,
// mismo criterio que la faceta de perfil (§6.4.1): solo el estado.
export async function ArtistJourneyList({ journeys }: ArtistJourneyListProps) {
  const t = await getTranslations("artistJourney");

  if (journeys.length === 0) {
    return (
      <div className="flex max-w-md flex-col items-center gap-1 text-center">
        <p className="font-body text-sm text-paper-muted">{t("myJourneysEmpty")}</p>
        <p className="font-data text-xs text-paper-muted">{t("myJourneysEmptyHint")}</p>
      </div>
    );
  }

  return (
    <ul className="flex w-full max-w-2xl flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
      {journeys.map((journey) => (
        <li key={journey.artistId} className="flex items-center gap-3 px-3 py-2">
          {journey.artistPhotoUrl ? (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
              <Image src={journey.artistPhotoUrl} alt="" fill sizes="2.5rem" className="object-cover" />
            </div>
          ) : (
            <DiscPlaceholder alt="" className="size-10 shrink-0 rounded-full" />
          )}
          <Link
            href={`/artist/${journey.artistId}`}
            className="min-w-0 flex-1 truncate font-display text-sm text-paper hover:text-amber"
          >
            {journey.artistName}
          </Link>
          <StateLabel state={journey.state} label={stateLabel(journey.state, t)} />
        </li>
      ))}
    </ul>
  );
}

function stateLabel(
  state: ArtistJourneySummary["state"],
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  if (state === "archived") return t("stateArchived");
  if (state === "complete") return t("stateComplete");
  return t("stateInProgress");
}

function StateLabel({ state, label }: { state: ArtistJourneySummary["state"]; label: string }) {
  const colorClass = state === "complete" ? "border-petrol/50 text-petrol" : "border-ink-border text-paper-muted";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 font-data text-[0.65rem] uppercase tracking-wider ${colorClass}`}
    >
      {label}
    </span>
  );
}

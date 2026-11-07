import { CoverThumb } from "@/components/catalog/CoverThumb";
import { Link } from "@/i18n/navigation";
import type { TierListDetail } from "@/lib/api/schemas";
import { albumHref } from "@/lib/catalog-links";
import { tierBand } from "@/lib/laminas/tiers";
import { ScoreBadge } from "./ScoreBadge";

// Vista pública de una tier list (spec tier-laminas): los seis niveles, vacíos incluidos, con el color de su tramo. Nunca la bandeja.
// Con las notas encendidas, cada disco lleva la suya como una insignia chica: tocarlo lleva a su página, así que la nota no depende de
// tocarlo.

export function TierListView({ tierList, tierItemsLabel }: { tierList: TierListDetail; tierItemsLabel: (label: string, count: number) => string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {tierList.tiers.map((items, tier) => {
        const band = tierBand(tier);
        const label = tierList.labels[tier] ?? "";
        return (
          <div key={tier} className="flex min-h-[4.5rem] items-stretch gap-2 rounded border border-ink-border bg-ink-surface p-1.5">
            <div
              className="flex w-16 shrink-0 items-center justify-center rounded px-1 text-center font-display text-lg font-bold break-words sm:w-20 sm:text-xl"
              style={{ backgroundColor: band.background, color: band.foreground }}
            >
              {label}
            </div>
            <ul className="flex flex-1 flex-wrap content-start gap-1.5" aria-label={tierItemsLabel(label, items.length)}>
              {items.map((item) => {
                const score = tierList.showScores && item.score ? { stars: Number(item.score.stars), detailedScore: item.score.detailedScore } : null;
                return (
                  <li key={item.id}>
                    <Link href={albumHref(null, item.target.title, item.target.id)} title={item.target.title} className="relative block size-14 rounded transition-opacity hover:opacity-80 sm:size-16">
                      <CoverThumb cover={item.target.coverThumbUrl} label={item.target.title} className="size-14 rounded sm:size-16" />
                      {score ? <ScoreBadge score={score} className="absolute right-0.5 top-0.5 px-1 py-0 text-[0.625rem]" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

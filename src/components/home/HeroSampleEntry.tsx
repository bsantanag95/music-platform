import { getTranslations } from "next-intl/server";
import { HERO_SAMPLE_ENTRY, HERO_WALL, heroWallTilePosition } from "@/lib/config/hero-covers";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import { ScoreBadge } from "@/components/laminas/ScoreBadge";

// Entrada de ejemplo del hero sin sesión (openspec: redesign-anon-home-phase1): enseña en el
// primer viewport lo que distingue al producto —una escucha con su contexto, las estrellas y el
// puntaje detallado de 1 a 100— sin datos de ningún usuario real. Es fija e ilustrativa: lleva
// un rótulo visible de ejemplo y no enlaza al álbum. La carátula sale del mismo mosaico del hero.
export async function HeroSampleEntry() {
  const t = await getTranslations("home");
  const entry = HERO_SAMPLE_ENTRY;
  const starsText = t("sampleStars", { stars: entry.stars });

  return (
    <figure
      aria-label={t("sampleAria", { title: entry.title, stars: starsText, score: entry.detailedScore })}
      className="absolute bottom-[6%] left-[4%] z-10 w-[min(22rem,88%)] rounded-2xl border border-ink-border bg-ink-surface/90 p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-md"
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="block size-16 shrink-0 rounded-md bg-ink"
          style={{
            backgroundImage: `url(${HERO_WALL.src})`,
            backgroundSize: `${HERO_WALL.cols * 100}% ${HERO_WALL.rows * 100}%`,
            backgroundPosition: heroWallTilePosition(entry.coverIndex),
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-display text-lg leading-tight text-paper">{entry.title}</p>
            <span className="shrink-0 rounded border border-ink-border px-1.5 py-0.5 font-data text-[11px] uppercase tracking-wide text-paper-muted">
              {t("sampleLabel")}
            </span>
          </div>
          <p className="truncate font-body text-sm text-paper-muted">
            {entry.artist} · {entry.year}
          </p>
          <p className="mt-1.5 font-data text-xs text-amber">{t("sampleContext")}</p>
        </div>
      </div>
      <figcaption className="mt-3.5 flex items-center justify-between gap-3 border-t border-ink-border pt-3.5">
        <StarRatingDisplay value={entry.stars} label={starsText} starClassName="size-4" decorative />
        <ScoreBadge
          score={{ stars: entry.stars, detailedScore: entry.detailedScore }}
          className="px-2.5 py-1 !text-base"
        />
      </figcaption>
    </figure>
  );
}

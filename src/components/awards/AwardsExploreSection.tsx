import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import type { RecentCeremony } from "@/services/awards/read";
import { awardsIndexHref, ceremonyHref } from "./award-links";
import { NomineeVisual } from "./NominationItem";

// Sección "Premios" de la portada de Explorar (openspec: add-music-awards, design D6): una tarjeta por cada una de
// las últimas ceremonias cargadas y "Ver todos" al índice. Sin ceremonias no se renderiza, como las demás secciones.
//
// Cada tarjeta lleva el ganador destacado de la ceremonia (la categoría general de álbum, en los Grammy Álbum del
// año) con su carátula: cinco tarjetas que solo repetían "PREMIOS GRAMMY" y un año no invitaban a entrar. El nombre
// del premio pasa a una línea apagada junto a la edición; el ámbar queda para el rótulo del ganador.
//
// La carátula del ganador también tiñe la tarjeta (difuminada de fondo, como la cabecera de la ceremonia): cinco tarjetas
// iguales en gris se distinguían solo por el texto. Categoría y título pueden ocupar dos líneas ("Álbum británico del
// año" o "DeBÍ TiRAR MáS FOTos" se cortaban a la mitad).

function Trophy() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3 shrink-0"
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </svg>
  );
}

export function AwardsExploreSection({ ceremonies }: { ceremonies: RecentCeremony[] }) {
  const t = useTranslations("awards");
  const locale = useLocale();
  if (ceremonies.length === 0) return null;
  const awardName = (slug: string) => (t.has(`names.${slug}`) ? t(`names.${slug}`) : slug);

  return (
    <section id="premios" aria-labelledby="premios-heading" className="flex w-full scroll-mt-24 flex-col gap-3">
      <SectionHeader
        heading={t("exploreHeading")}
        description={t("exploreDescription")}
        seeAll={{ href: awardsIndexHref(), label: t("exploreSeeAll") }}
        headingId="premios-heading"
      />
      <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {ceremonies.map((ceremony) => {
          const headline = ceremony.headline;
          const subject = headline?.winner.subject;
          // Con el álbum resuelto en el catálogo, título y artista por separado (el texto curado los junta:
          // "Midnights — Taylor Swift"); sin resolver, el texto curado y su crédito.
          const album = subject?.kind === "release_group" ? subject.album : null;
          const title = album?.title ?? headline?.winner.text;
          const credit = album ? album.artistName : headline?.winner.credit;
          const backdrop =
            album?.cover.coverThumbUrl ??
            (subject?.kind === "recording" && subject.anchor ? subject.anchor.cover.coverThumbUrl : null);
          const category = headline ? (locale === "en" ? headline.category.en : headline.category.es) : null;
          return (
            <li key={`${ceremony.awardSlug}-${ceremony.year}`}>
              <Link
                href={ceremonyHref(ceremony.awardSlug, ceremony.year)}
                className="group relative isolate flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber focus-visible:border-amber"
              >
                {backdrop ? (
                  <span aria-hidden="true" className="absolute inset-0 -z-10">
                    <AppImage
                      src={backdrop}
                      alt=""
                      fill
                      sizes="320px"
                      className="scale-150 object-cover opacity-25 blur-2xl saturate-150 transition-opacity group-hover:opacity-35"
                    />
                    <span className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink-surface/80 to-ink-surface" />
                  </span>
                ) : null}
                <span className="flex flex-col gap-0.5">
                  <span className="truncate font-body text-sm text-paper">{awardName(ceremony.awardSlug)}</span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-3xl text-paper transition-colors group-hover:text-amber">
                      {ceremony.year}
                    </span>
                    <span className="shrink-0 font-data text-xs text-paper-muted">
                      {t("edition", { edition: ceremony.edition })}
                    </span>
                  </span>
                </span>
                {headline ? (
                  <span className="mt-auto flex items-center gap-3 border-t border-ink-border/70 pt-3">
                    <NomineeVisual nomination={headline.winner} size="size-14 shrink-0 rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.45)]" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-start gap-1 font-data text-[0.65rem] uppercase leading-tight tracking-wide text-amber">
                        <span className="mt-px">
                          <Trophy />
                        </span>
                        <span className="line-clamp-2">{category}</span>
                      </span>
                      <span className="line-clamp-2 font-display text-sm leading-snug text-paper">{title}</span>
                      {credit ? <span className="truncate font-data text-xs text-paper-muted">{credit}</span> : null}
                    </span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { TitleTile } from "@/components/catalog/TitleTile";
import { DiscographyScroller } from "./DiscographyScroller";
import { StripItemActions } from "./StripItemActions";
import type {
  DiscographyItem,
  DiscographyStrip as DiscographyStripData,
} from "@/services/catalog/album-neighbors";

// Franja de discografía al pie de la página de álbum (openspec: redesign-album-page, D15):
// álbumes del artista principal del mismo tipo, en orden cronológico, con el actual
// resaltado y accesos directos al anterior y al siguiente. Cada disco, salvo el actual, lleva el
// menú de acciones en la esquina de la portada (openspec: extend-album-quick-actions). Proporciones del mockup A
// Portada (openspec: modernize-album-page-phase1): portadas de 128 px, título de sección grande y vecinos en una línea.

interface DiscographyStripProps {
  artistName: string;
  strip: DiscographyStripData;
  /** Hay sesión: el menú de acciones de cada disco pide sus marcas. */
  authenticated?: boolean;
}

export function DiscographyStrip({ artistName, strip, authenticated = false }: DiscographyStripProps) {
  const t = useTranslations("catalog.album.discography");
  const { previous, next } = strip;

  return (
    <section
      aria-labelledby="discography-heading"
      className="flex w-full flex-col gap-5 pt-6 sm:pt-10"
    >
      <div className="flex flex-col items-start gap-x-6 gap-y-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <h2
          id="discography-heading"
          className="font-display text-[clamp(1.625rem,2.4vw,2.125rem)] font-bold leading-[1.05] tracking-[-0.02em] text-paper"
        >
          {t("heading", { artist: artistName })}
        </h2>
        {(previous || next) && (
          <nav
            aria-label={t("neighbors")}
            className="flex min-w-0 max-w-full items-center gap-x-2 py-1.5 font-data text-[0.8125rem] text-paper-muted"
          >
            {previous && <NeighborLink item={previous} label={t("previous")} side="previous" artistName={artistName} />}
            {previous && next && <span aria-hidden="true">·</span>}
            {next && <NeighborLink item={next} label={t("next")} side="next" artistName={artistName} />}
          </nav>
        )}
      </div>
      <DiscographyScroller>
        {strip.items.map((item, index) => {
          const current = index === strip.currentIndex;
          const body = (
            <>
              <span
                className={`relative block aspect-square w-28 overflow-hidden rounded-md bg-ink-surface sm:w-32 ${
                  current ? "outline outline-2 outline-offset-[3px] outline-amber" : ""
                }`}
              >
                {item.coverThumbUrl ? (
                  <CoverThumb cover={item.coverThumbUrl} label="" className="size-full" />
                ) : (
                  <TitleTile title={item.title} year={item.firstReleaseYear} className="size-full border-0" />
                )}
              </span>
              {/* Dos líneas reservadas siempre, para que los años queden alineados entre álbumes. */}
              <span
                className={`mt-1 line-clamp-2 min-h-[2lh] w-28 font-display text-sm font-semibold leading-snug sm:w-32 ${
                  current ? "text-paper" : "text-paper group-hover:text-amber"
                }`}
              >
                {item.title}
              </span>
              {item.firstReleaseYear !== null && (
                <span className="font-data text-xs text-paper-muted">{item.firstReleaseYear}</span>
              )}
            </>
          );
          return (
            <li key={item.id} data-current={current || undefined} className="group/card relative shrink-0">
              {current ? (
                <span aria-current="page" className="flex flex-col gap-1">
                  <span className="sr-only">{t("current")}: </span>
                  {body}
                </span>
              ) : (
                <Link href={albumHref(artistName, item.title, item.id)} className="group flex flex-col gap-1">
                  {body}
                </Link>
              )}
              {!current && <StripItemActions item={item} authenticated={authenticated} />}
            </li>
          );
        })}
      </DiscographyScroller>
    </section>
  );
}

function NeighborLink({
  item,
  label,
  side,
  artistName,
}: {
  item: DiscographyItem;
  label: string;
  side: "previous" | "next";
  artistName: string;
}) {
  const chevron = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline points={side === "previous" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );

  // Solo el título se trunca: la etiqueta y el año quedan siempre completos.
  // En reposo, neutro (regla de rareza del ámbar, DESIGN.md); el ámbar llega con el hover. «Anterior»/«Siguiente» queda
  // para lectores de pantalla: las flechas ya lo dicen a la vista, como en el mockup.
  return (
    <Link
      href={albumHref(artistName, item.title, item.id)}
      rel={side === "previous" ? "prev" : "next"}
      className="group flex min-w-0 max-w-64 items-center gap-1.5 whitespace-nowrap transition-colors hover:text-amber"
    >
      {side === "previous" && chevron}
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{item.title}</span>
      {item.firstReleaseYear !== null && <span className="shrink-0">({item.firstReleaseYear})</span>}
      {side === "next" && chevron}
    </Link>
  );
}

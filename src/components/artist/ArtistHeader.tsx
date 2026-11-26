import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import { initialsOf, type StagePortrait } from "./artist-stage";
import { albumHref, artistHref } from "@/lib/catalog-links";
import type { ArtistProfile } from "@/services/catalog/artist-profile-read";
import { countryName, formatPartialDate, setlistFmSearchUrl, streamingName, yearOf } from "./artist-format";
import type { LineupFact } from "./lineup-fact";

// Cabecera de la página de artista (openspec: redesign-artist-page, capability
// `artist-header`; portada desde modernize-artist-page-phase1): retrato con crédito, identidad y ficha. Componentes
// sin estado: se renderizan en el servidor. Cada dato que falta se omite sin dejar huecos.

type ArtistType = "person" | "group" | "various" | "unknown";

// Enlaces que salen del sitio: texto claro con subrayado punteado y `↗`. El ámbar queda para lo activo del panel y
// para "Seguir leyendo" (openspec: polish-artist-header).
// Sin subrayado permanente (openspec: refine-artist-stage): atenuados, subrayan al pasar.
const externalLink = "text-paper/70 underline-offset-2 hover:text-paper hover:underline";
const internalMore = "text-paper-muted hover:text-paper hover:underline";
// Crédito de la foto: lo exige la licencia, pero no compite con la ficha.
const creditText = "font-data text-[0.65rem] leading-snug text-paper-muted/70";

/** Crédito obligatorio de la licencia de la foto (ADR 0021): autor enlazado al archivo en Commons y licencia enlazada a
 *  su texto. Va en la esquina inferior derecha de la portada (openspec: modernize-artist-page-phase1). */
export function ArtistPhotoCredit({ photo }: { photo: ArtistProfile["photo"] }) {
  const t = useTranslations("catalog.artist");
  if (!photo) return null;
  return (
    <p className={`absolute bottom-2 right-4 z-10 max-w-[70%] text-right sm:right-8 xl:right-12 ${creditText}`}>
      <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-paper hover:underline">
        {photo.author ? t("photo.credit", { author: photo.author }) : t("photo.creditNoAuthor")}
      </a>
      {" · "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className="whitespace-nowrap hover:text-paper hover:underline">
          {photo.license}
        </a>
      ) : (
        <span className="whitespace-nowrap">{photo.license}</span>
      )}
    </p>
  );
}

const portraitFrame =
  "relative grid size-24 shrink-0 place-items-center overflow-hidden border-[3px] border-ink/90 bg-ink-surface shadow-[0_24px_40px_-20px_rgba(0,0,0,.9)] outline outline-1 outline-paper/15 sm:size-[148px]";

/**
 * Retrato de la portada (openspec: modernize-artist-page-phase1): la foto en un círculo; sin foto, la carátula del disco
 * mejor valorado (o del más reciente) en cuadrado y enlazada al disco; sin carátulas, las iniciales.
 */
export function ArtistPortrait({ name, photo, portrait }: { name: string; photo: ArtistProfile["photo"]; portrait: StagePortrait }) {
  const t = useTranslations("catalog.artist");
  if (portrait.kind === "photo" && photo) {
    return (
      <div className={`${portraitFrame} rounded-full`}>
        <AppImage src={photo.url} alt={t("photo.alt", { name })} fill sizes="(min-width: 640px) 148px, 96px" className="object-cover object-[center_20%]" />
      </div>
    );
  }
  if (portrait.kind === "cover") {
    return (
      <Link
        href={albumHref(name, portrait.cover.title, portrait.cover.id)}
        aria-label={t("portraitCover", { title: portrait.cover.title })}
        className={`${portraitFrame} rounded-xl hover:outline-amber`}
      >
        <AppImage src={portrait.cover.thumbUrl} alt="" fill sizes="(min-width: 640px) 148px, 96px" className="object-cover" />
      </Link>
    );
  }
  return (
    <div role="img" aria-label={name} className={`${portraitFrame} rounded-full font-display text-3xl font-bold text-paper-muted sm:text-5xl`}>
      <span aria-hidden="true">{portrait.kind === "initials" ? portrait.initials : initialsOf(name)}</span>
    </div>
  );
}

export function ArtistIdentity({ name, description }: { name: string; description: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h1 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.04em] text-paper [overflow-wrap:anywhere]">{name}</h1>
      {description && <p className="font-body text-lg text-paper/85 first-letter:uppercase sm:text-xl">{description}</p>}
    </div>
  );
}

interface ArtistFactsProps {
  type: ArtistType;
  profile: ArtistProfile;
  /** Año del primer disco principal: la actividad de un solista. */
  firstMainYear: number | null;
  /** Alineación actual o grupos de una persona (openspec: add-artist-members-tab). */
  lineup?: LineupFact | null;
  /** Cifras de premios con el enlace a la pestaña Premios (openspec: refine-artist-page-phase3). */
  awards?: { wins: number; nominations: number; inductions: number; href: string } | null;
  /** Nombre del artista: arma la búsqueda en setlist.fm cuando no hay enlace guardado (openspec: add-setlistfm-artist-link). */
  name?: string;
  /** Fichas de géneros: abren la primera línea (openspec: modernize-artist-page-phase1). */
  genres?: React.ReactNode;
  /** Comunidad en línea (`ArtistCommunity`): cierra la primera línea; `null` si no hay nada que mostrar. */
  community?: React.ReactNode;
}

/**
 * Filas de la ficha con dato, en orden: tipo, origen o nacimiento, fallecimiento, actividad,
 * integrantes o bandas, premios, enlaces y en vivo.
 */
export function artistFactRows(
  { type, profile, firstMainYear, lineup, awards, name }: ArtistFactsProps,
  locale: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): { key: string; label: string; value: React.ReactNode }[] {
  const { facts } = profile;
  const rows: { key: string; label: string; value: React.ReactNode }[] = [];
  const country = countryName(facts.country, locale);
  // El lugar de Wikidata ya viene traducido y con país; el respaldo de MusicBrainz no.
  const fromWikidata = profile.placeLabel !== null && profile.placeLabel !== facts.beginAreaName;
  // El tipo abre la ficha: ya no es antetítulo del nombre (openspec: modernize-artist-page-phase1).
  rows.push({ key: "type", label: t("facts.type"), value: t(`typeEyebrow.${type}`) });

  if (type === "person") {
    const birthDate = formatPartialDate(facts.lifeBegin, locale);
    const birthPlace = profile.placeLabel;
    const born = [birthDate, birthPlace].filter(Boolean).join(" · ");
    if (born) rows.push({ key: "born", label: t("facts.born"), value: born });
    if (facts.lifeEnded && facts.lifeEnd) {
      rows.push({ key: "died", label: t("facts.died"), value: formatPartialDate(facts.lifeEnd, locale) });
    }
    // De un solista solo se sabe el año de su primer disco principal: se dice eso, no "Actividad".
    if (firstMainYear !== null) {
      rows.push({ key: "firstRecord", label: t("facts.firstRecord"), value: String(firstMainYear) });
    }
  } else {
    const origin = fromWikidata
      ? profile.placeLabel
      : facts.beginAreaName
        ? [facts.beginAreaName, country].filter(Boolean).join(", ")
        : country;
    if (origin) rows.push({ key: "origin", label: t("facts.origin"), value: origin });
    const begin = yearOf(facts.lifeBegin);
    const end = yearOf(facts.lifeEnd);
    const period = begin ? (facts.lifeEnded && end ? t("facts.range", { begin, end }) : t("facts.since", { year: begin })) : null;
    const status = facts.lifeEnded === true ? t("facts.disbanded") : facts.lifeEnded === false && begin ? t("facts.active") : null;
    const activity = [period, status].filter(Boolean).join(" · ");
    if (activity) rows.push({ key: "activity", label: t("facts.activity"), value: activity });
  }

  if (lineup && lineup.people.length > 0) {
    rows.push({
      key: "lineup",
      label: t(`facts.${lineup.label}`),
      value: (
        <span>
          {lineup.people.map((person, index) => (
            <span key={person.id}>
              {index > 0 ? ", " : null}
              <Link href={artistHref(person.name, person.id)} className="hover:text-amber hover:underline">
                {person.name}
              </Link>
            </span>
          ))}
          {lineup.othersCount > 0 ? ` ${t("facts.andMore", { count: lineup.othersCount })}` : null}
          {" · "}
          <Link href={lineup.href} className={`whitespace-nowrap ${internalMore}`}>
            {t(`facts.${lineup.more}`)} →
          </Link>
        </span>
      ),
    });
  }

  if (awards && awards.nominations + awards.inductions > 0) {
    const counts = [
      awards.wins > 0 ? t("awards.wins", { count: awards.wins }) : null,
      awards.nominations > 0 ? t("awards.nominations", { count: awards.nominations }) : null,
      awards.inductions > 0 ? t("awards.inductions", { count: awards.inductions }) : null,
    ].filter(Boolean);
    rows.push({
      key: "awards",
      label: t("facts.awards"),
      value: (
        <span>
          {counts.join(" · ")}
          {" · "}
          <Link href={awards.href} className={`whitespace-nowrap ${internalMore}`}>
            {t("facts.seeAwards")} →
          </Link>
        </span>
      ),
    });
  }

  const links: { label: string; url: string }[] = [];
  const byKind = new Map(profile.links.map((link) => [link.kind, link.url]));
  const official = byKind.get("official");
  const bandcamp = byKind.get("bandcamp");
  const streaming = byKind.get("streaming");
  if (official) links.push({ label: t("facts.official"), url: official });
  if (bandcamp) links.push({ label: t("facts.bandcamp"), url: bandcamp });
  if (profile.summary) links.push({ label: t("facts.wikipedia"), url: profile.summary.url });
  if (streaming) links.push({ label: streamingName(streaming) ?? t("facts.streaming"), url: streaming });
  if (links.length > 0) {
    rows.push({
      key: "links",
      label: t("facts.links"),
      value: (
        <span>
          {links.map((link, index) => (
            <span key={link.url}>
              {index > 0 ? " · " : null}
              <a href={link.url} target="_blank" rel="noopener noreferrer" className={externalLink}>
                {link.label}
                <span aria-hidden> ↗</span>
              </a>
            </span>
          ))}
        </span>
      ),
    });
  }

  // En vivo (openspec: add-setlistfm-artist-link, D3): la página en setlist.fm que declara MusicBrainz o, si aún no está
  // guardada, la búsqueda por nombre. Solo grupos y personas.
  if (type === "group" || type === "person") {
    const setlistfm = byKind.get("setlistfm") ?? (name ? setlistFmSearchUrl(name) : null);
    if (setlistfm) {
      rows.push({
        key: "live",
        label: t("facts.live"),
        value: (
          <a href={setlistfm} target="_blank" rel="noopener noreferrer" className={externalLink}>
            {t("facts.setlistfm")}
            <span aria-hidden> ↗</span>
          </a>
        ),
      });
    }
  }
  return rows;
}

/** Filas de la segunda línea de la ficha: lo que sale del sitio. */
const OUTBOUND_ROWS = new Set(["links", "live"]);
/** Filas de la segunda línea: la gente alrededor del artista (openspec: refine-artist-stage). */
const SOCIAL_ROWS = new Set(["lineup", "awards", "community"]);
/** Filas cuyo valor solo no se entiende («Cobham 1977»): llevan su rótulo a la vista. */
const VISIBLE_LABEL_ROWS = new Set(["firstRecord", "died"]);

/**
 * Ficha compacta en tres líneas (openspec: modernize-artist-page-phase1, refine-artist-stage): géneros, tipo y datos; alineación,
 * premios y comunidad; enlaces y En vivo. Antes eran dos líneas: géneros, tipo, datos, alineación, premios y
 * comunidad; debajo, enlaces y En vivo. Cada fila conserva su rótulo para lectores de pantalla.
 */
export function ArtistFacts(props: ArtistFactsProps) {
  const t = useTranslations("catalog.artist");
  const locale = useLocale();
  const rows = artistFactRows(props, locale, t);
  if (props.genres) rows.unshift({ key: "genres", label: t("facts.genres"), value: props.genres });
  if (props.community) rows.push({ key: "community", label: t("community.heading"), value: props.community });
  if (rows.length === 0) return null;
  const line = (items: typeof rows) =>
    items.length === 0 ? null : (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {items.map((row) => (
          <div key={row.key} data-fact={row.key} className="min-w-0">
            <dt className="sr-only">{row.label}</dt>
            <dd>
              {VISIBLE_LABEL_ROWS.has(row.key) ? (
                <span aria-hidden="true" className="text-paper-muted">
                  {row.label}{" "}
                </span>
              ) : null}
              {row.value}
            </dd>
          </div>
        ))}
      </div>
    );
  return (
    <dl aria-label={t("facts.heading")} className="flex flex-col gap-2.5 font-data text-[0.8125rem] text-paper/80">
      {line(rows.filter((row) => !OUTBOUND_ROWS.has(row.key) && !SOCIAL_ROWS.has(row.key)))}
      {line(rows.filter((row) => SOCIAL_ROWS.has(row.key)))}
      {line(rows.filter((row) => OUTBOUND_ROWS.has(row.key)))}
    </dl>
  );
}

/** Atribución CC BY-SA del texto de Wikipedia: artículo y licencia enlazados. */
export function WikipediaAttribution({ url }: { url: string }) {
  const t = useTranslations("catalog.artist.summary");
  return (
    <p className="font-data text-xs text-paper-muted">
      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-paper hover:underline">
        {t("source")}
      </a>
      {" · "}
      <a
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        target="_blank"
        rel="noopener noreferrer license"
        className="hover:text-paper hover:underline"
      >
        {t("license")}
      </a>
    </p>
  );
}

/**
 * Acción principal de la portada para un visitante sin sesión (openspec: modernize-artist-page-phase1): en lugar del panel
 * «Tu relación», el botón «Seguir a {artista}» hacia el inicio de sesión y una frase que explica para qué sirve una cuenta.
 */
export function ArtistFollowInvite({ name }: { name: string }) {
  const t = useTranslations("catalog.artist");
  return (
    <div className="flex flex-col items-start gap-2 lg:items-end lg:text-right">
      <Link
        href="/auth/login"
        className="inline-flex h-11 max-w-full items-center rounded-lg bg-amber px-5 font-display text-[0.9375rem] font-medium text-ink hover:bg-amber-hover"
      >
        <span className="truncate">{t("followInvite", { name })}</span>
      </Link>
      <p className="max-w-[28ch] font-body text-sm text-paper/70">{t("followInviteNote")}</p>
    </div>
  );
}

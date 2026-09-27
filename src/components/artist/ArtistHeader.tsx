import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { ArtistProfile } from "@/services/catalog/artist-profile-read";
import { countryName, formatPartialDate, streamingName, yearOf } from "./artist-format";

// Cabecera de la página de artista (openspec: redesign-artist-page, capability
// `artist-header`): foto con crédito, identidad, ficha y resumen de la biografía. Componentes
// sin estado: se renderizan en el servidor. Cada dato que falta se omite sin dejar huecos.

type ArtistType = "person" | "group" | "various" | "unknown";

const externalLink = "text-amber hover:underline";

export function ArtistPhoto({ name, photo }: { name: string; photo: ArtistProfile["photo"] }) {
  const t = useTranslations("catalog.artist");
  const frame = "relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded sm:w-[200px]";
  if (!photo) return <DiscPlaceholder alt={t("noPhotoAlt")} className={frame} />;
  return (
    <figure className="flex w-24 shrink-0 flex-col gap-1 sm:w-[200px]">
      <div className={frame}>
        <AppImage src={photo.url} alt={t("photo.alt", { name })} fill sizes="(min-width: 640px) 200px, 96px" className="object-cover" />
      </div>
      {/* Crédito obligatorio de la licencia (ADR 0021): autor enlazado al archivo en Commons
          y licencia enlazada a su texto. */}
      <figcaption className="hidden font-data text-xs leading-snug text-paper-muted sm:block">
        <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-paper hover:underline">
          {photo.author ? t("photo.credit", { author: photo.author }) : t("photo.creditNoAuthor")}
        </a>
        {" · "}
        {photo.licenseUrl ? (
          <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className="hover:text-paper hover:underline">
            {photo.license}
          </a>
        ) : (
          photo.license
        )}
      </figcaption>
    </figure>
  );
}

/** Crédito de la foto en móvil, donde la foto va chica junto al nombre. */
export function ArtistPhotoCreditMobile({ photo }: { photo: ArtistProfile["photo"] }) {
  const t = useTranslations("catalog.artist");
  if (!photo) return null;
  return (
    <p className="font-data text-xs text-paper-muted sm:hidden">
      <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
        {photo.author ? t("photo.credit", { author: photo.author }) : t("photo.creditNoAuthor")}
      </a>
      {" · "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className="hover:underline">
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
    </p>
  );
}

export function ArtistIdentity({ type, name, description }: { type: ArtistType; name: string; description: string | null }) {
  const t = useTranslations("catalog.artist");
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t(`typeEyebrow.${type}`)}</p>
      <h1 className="font-display text-3xl leading-tight text-paper [overflow-wrap:anywhere] sm:text-4xl">{name}</h1>
      {description && <p className="font-body text-base text-paper-muted first-letter:uppercase">{description}</p>}
    </div>
  );
}

interface ArtistFactsProps {
  type: ArtistType;
  profile: ArtistProfile;
  /** Año del primer disco principal: la actividad de un solista. */
  firstMainYear: number | null;
}

/** Filas de la ficha con dato, en orden: origen o nacimiento, fallecimiento, actividad, enlaces. */
export function artistFactRows(
  { type, profile, firstMainYear }: ArtistFactsProps,
  locale: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): { key: string; label: string; value: React.ReactNode }[] {
  const { facts } = profile;
  const rows: { key: string; label: string; value: React.ReactNode }[] = [];
  const country = countryName(facts.country, locale);
  // El lugar de Wikidata ya viene traducido y con país; el respaldo de MusicBrainz no.
  const fromWikidata = profile.placeLabel !== null && profile.placeLabel !== facts.beginAreaName;

  if (type === "person") {
    const birthDate = formatPartialDate(facts.lifeBegin, locale);
    const birthPlace = profile.placeLabel;
    const born = [birthDate, birthPlace].filter(Boolean).join(" · ");
    if (born) rows.push({ key: "born", label: t("facts.born"), value: born });
    if (facts.lifeEnded && facts.lifeEnd) {
      rows.push({ key: "died", label: t("facts.died"), value: formatPartialDate(facts.lifeEnd, locale) });
    }
    if (firstMainYear !== null) {
      rows.push({ key: "activity", label: t("facts.activity"), value: t("facts.since", { year: firstMainYear }) });
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
              </a>
            </span>
          ))}
        </span>
      ),
    });
  }
  return rows;
}

export function ArtistFacts(props: ArtistFactsProps) {
  const t = useTranslations("catalog.artist");
  const locale = useLocale();
  const rows = artistFactRows(props, locale, t);
  if (rows.length === 0) return null;
  return (
    <dl aria-label={t("facts.heading")} className="grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5">
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <dt className="font-data text-xs text-paper-muted">{row.label}</dt>
          <dd className="font-body text-sm text-paper">{row.value}</dd>
        </div>
      ))}
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

export function ArtistSummary({ artistId, summary }: { artistId: string; summary: ArtistProfile["summary"] }) {
  const t = useTranslations("catalog.artist.summary");
  const locale = useLocale();
  if (!summary) return null;
  const firstParagraph = summary.text.split(/\n+/)[0] ?? summary.text;
  return (
    <section aria-label={t("readMore")} className="flex flex-col gap-1.5">
      {summary.language !== locale && (
        <p className="font-data text-xs text-paper-muted">
          {t("languageNote", { language: t(`languages.${summary.language}`) })}
        </p>
      )}
      <p lang={summary.language} className="line-clamp-3 font-body text-sm leading-relaxed text-paper">
        {firstParagraph}
      </p>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link href={`/artist/${artistId}/biography`} className="font-data text-xs text-amber hover:underline">
          {t("readMore")} →
        </Link>
        <WikipediaAttribution url={summary.url} />
      </div>
    </section>
  );
}

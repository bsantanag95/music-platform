import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import type { ArtistProfile } from "@/services/catalog/artist-profile-read";
import { WikipediaAttribution } from "./ArtistHeader";
import { repairSentenceSpacing } from "./artist-format";

// Pestaña Biografía (openspec: redesign-artist-page, capability `artist-biography`): la
// introducción completa del artículo de Wikipedia en párrafos, sin modificar ni traducir,
// con el enlace al artículo y la atribución CC BY-SA 4.0.

/** Datos de la discografía y la alineación junto al texto (openspec: refine-artist-page-phase3, design D4). */
export interface BiographyFacts {
  artistName: string;
  firstAlbum: { id: string; title: string; year: number | null } | null;
  latestAlbum: { id: string; title: string; year: number | null } | null;
  albumCount: number;
  /** Integrantes actuales y antiguos de un grupo, o bandas de una persona; `null` si no hay. */
  lineup: { kind: "group"; current: number; past: number } | { kind: "person"; bands: number } | null;
}

export function ArtistBiography({
  summary,
  facts,
}: {
  summary: NonNullable<ArtistProfile["summary"]>;
  facts?: BiographyFacts;
}) {
  const t = useTranslations("catalog.artist.biography");
  const tSummary = useTranslations("catalog.artist.summary");
  const locale = useLocale();
  const paragraphs = summary.text.split(/\n+/).map((p) => repairSentenceSpacing(p.trim())).filter(Boolean);

  const article = (
    <article className="flex max-w-prose flex-col gap-4">
      <h2 className="sr-only">{t("heading")}</h2>
      {summary.language !== locale && (
        <p className="font-data text-xs text-paper-muted">
          {t("languageNote", { language: tSummary(`languages.${summary.language}`) })}
        </p>
      )}
      <div lang={summary.language} className="flex flex-col gap-3 font-body text-base leading-relaxed text-paper">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <footer className="flex flex-col gap-1">
        <a href={summary.url} target="_blank" rel="noopener noreferrer" className="font-data text-sm text-amber hover:underline">
          {t("readFull")} ↗
        </a>
        <WikipediaAttribution url={summary.url} />
      </footer>
    </article>
  );
  if (!facts) return article;
  return (
    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
      {article}
      <BiographyFactsCard facts={facts} />
    </div>
  );
}

function BiographyFactsCard({ facts }: { facts: BiographyFacts }) {
  const t = useTranslations("catalog.artist.biography.facts");
  const album = (value: NonNullable<BiographyFacts["firstAlbum"]>) => (
    <Link href={albumHref(facts.artistName, value.title, value.id)} className="hover:text-amber hover:underline">
      {value.title}
      {value.year !== null ? ` (${value.year})` : ""}
    </Link>
  );
  const rows: { key: string; label: string; value: React.ReactNode }[] = [];
  if (facts.firstAlbum) rows.push({ key: "first", label: t("firstAlbum"), value: album(facts.firstAlbum) });
  if (facts.latestAlbum && facts.latestAlbum.id !== facts.firstAlbum?.id) {
    rows.push({ key: "latest", label: t("latestAlbum"), value: album(facts.latestAlbum) });
  }
  if (facts.albumCount > 0) rows.push({ key: "albums", label: t("albums"), value: t("albumCount", { count: facts.albumCount }) });
  if (facts.lineup?.kind === "group" && facts.lineup.current + facts.lineup.past > 0) {
    rows.push({
      key: "lineup",
      label: t("members"),
      value: [
        facts.lineup.current > 0 ? t("current", { count: facts.lineup.current }) : null,
        facts.lineup.past > 0 ? t("past", { count: facts.lineup.past }) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  if (facts.lineup?.kind === "person" && facts.lineup.bands > 0) {
    rows.push({ key: "bands", label: t("bands"), value: t("bandCount", { count: facts.lineup.bands }) });
  }
  if (rows.length === 0) return null;
  return (
    <aside aria-label={t("heading")} className="rounded border border-ink-border bg-ink-surface px-4 py-3">
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2">
        {rows.map((row) => (
          <div key={row.key} className="contents">
            <dt className="font-data text-xs text-paper-muted">{row.label}</dt>
            <dd className="font-body text-sm text-paper">{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

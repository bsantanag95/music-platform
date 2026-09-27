import { useLocale, useTranslations } from "next-intl";
import type { ArtistProfile } from "@/services/catalog/artist-profile-read";
import { WikipediaAttribution } from "./ArtistHeader";

// Pestaña Biografía (openspec: redesign-artist-page, capability `artist-biography`): la
// introducción completa del artículo de Wikipedia en párrafos, sin modificar ni traducir,
// con el enlace al artículo y la atribución CC BY-SA 4.0.

export function ArtistBiography({ summary }: { summary: NonNullable<ArtistProfile["summary"]> }) {
  const t = useTranslations("catalog.artist.biography");
  const tSummary = useTranslations("catalog.artist.summary");
  const locale = useLocale();
  const paragraphs = summary.text.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
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
}

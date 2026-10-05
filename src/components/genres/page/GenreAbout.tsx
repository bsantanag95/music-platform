import { useTranslations } from "next-intl";
import type { GenreAbout as About } from "@/services/genres/about-text";

// "Sobre el género" (openspec: redesign-genre-page, capability `genre-about`, ADR 0027): el primer
// párrafo de la introducción de Wikipedia, el resto tras un desplegable y la atribución CC BY-SA
// obligatoria junto al texto. La atribución nombra el título del artículo, que puede diferir del nombre
// mostrado del género. Un género sin texto no renderiza nada.

const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/deed.es";
const LINK = "text-amber underline-offset-2 hover:underline";

export function GenreAbout({ about }: { about: About | null }) {
  const t = useTranslations("catalog.genres.page.about");
  if (!about) return null;

  return (
    <section aria-labelledby="genre-about-heading" className="flex w-full max-w-3xl flex-col gap-2">
      <h2 id="genre-about-heading" className="font-display text-xl text-paper">
        {t("heading")}
      </h2>
      {about.isFallback && (
        <p className="font-data text-xs text-paper-muted">
          {t("fallbackNote", { language: t(`languages.${about.language}`) })}
        </p>
      )}
      <p lang={about.language} className="font-body text-sm leading-relaxed text-paper [overflow-wrap:anywhere]">
        {about.excerpt}
      </p>
      {about.rest && (
        <details>
          <summary className="cursor-pointer font-data text-sm text-amber underline-offset-2 hover:underline">{t("readMore")}</summary>
          <div lang={about.language} className="mt-2 flex flex-col gap-2">
            {about.rest.split("\n\n").map((paragraph, index) => (
              <p key={index} className="font-body text-sm leading-relaxed text-paper [overflow-wrap:anywhere]">
                {paragraph}
              </p>
            ))}
          </div>
        </details>
      )}
      <p className="font-data text-xs text-paper-muted">
        {t("source")}{" "}
        <a href={about.url} target="_blank" rel="noopener noreferrer" className={LINK}>
          {about.title}
        </a>{" "}
        · {t("licensedUnder")}{" "}
        <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
          CC BY-SA 4.0
        </a>
      </p>
    </section>
  );
}

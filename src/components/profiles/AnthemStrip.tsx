import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import type { ShowcaseEntity } from "@/services/profiles/showcase";

interface AnthemStripProps {
  anthem: ShowcaseEntity;
}

// El himno: una canción elegida manualmente, presentada como una tira
// "suena en bucle". Distinta de la última escucha (eso es actividad, no
// identidad). Server Component. Ver spec profile-showcase.
export async function AnthemStrip({ anthem }: AnthemStripProps) {
  const t = await getTranslations("users");

  return (
    <section className="flex w-full max-w-2xl flex-col gap-3">
      <h2 className="font-display text-xl text-paper">{t("showcase.anthemHeading")}</h2>
      <Link
        href={targetHref(anthem.type, anthem.id)}
        className="group flex items-center gap-3 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
      >
        <CoverThumb cover={anthem.coverThumbUrl} label="" className="size-12" />
        <span className="min-w-0 flex-1">
          <span className="block font-data text-xs uppercase tracking-wide text-paper-muted">
            {t("showcase.anthemNowPlaying")}
          </span>
          <span className="block truncate font-display text-base text-paper transition-colors group-hover:text-amber">
            {anthem.title}
          </span>
          {anthem.artistName && (
            <span className="block truncate font-data text-xs text-paper-muted">
              {anthem.artistName}
            </span>
          )}
        </span>
      </Link>
    </section>
  );
}

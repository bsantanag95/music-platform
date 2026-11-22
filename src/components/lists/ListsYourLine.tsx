import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { HomeResumeList } from "@/services/home/home";
import { ListCoverMosaic } from "./ListCoverMosaic";

// "Tus listas" de `/lists` con sesión (openspec: redesign-lists-phase2): una franja bajo la frase de entrada, en lugar del
// módulo del riel lateral. A la izquierda, lo principal: la lista propia con actividad más reciente (mismo criterio que
// "Retoma una lista" de Inicio), con su mosaico y su título, para seguir con ella; a la derecha, los accesos a las listas
// propias y a las guardadas. Sin listas propias, invita a crear la primera. Antes era una sola línea mono en la que el rótulo,
// la lista y los accesos se leían iguales.
export async function ListsYourLine({ resume }: { resume: HomeResumeList | null }) {
  const t = await getTranslations("lists");
  const secondary = "inline-flex min-h-11 items-center whitespace-nowrap font-data text-sm text-paper-muted transition-colors hover:text-amber";

  return (
    <nav
      aria-label={t("community.rail.yourListsTitle")}
      className="mt-1 flex w-full max-w-3xl flex-col gap-2 rounded-xl border border-ink-border bg-ink-surface px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4"
    >
      {resume ? (
        <Link href={`/me/lists/${resume.id}`} className="group flex min-w-0 items-center gap-3">
          <ListCoverMosaic
            coverThumbs={resume.coverThumbUrls}
            itemCount={resume.itemCount}
            entityType={resume.entityType}
            className="w-11 shrink-0"
          />
          <span className="flex min-w-0 flex-col">
            <span className="font-data text-xs text-paper-muted">{t("community.reader.resumeLabel")}</span>
            <span className="truncate font-display text-base text-paper transition-colors group-hover:text-amber">
              {resume.title}
            </span>
          </span>
        </Link>
      ) : (
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-base text-paper">{t("community.reader.noLists")}</span>
          <Link href="/me/lists?new=1" className="w-fit font-data text-sm text-amber transition-colors hover:text-amber-hover">
            {t("community.rail.createFirst")} →
          </Link>
        </span>
      )}
      <span className="flex shrink-0 gap-5 border-t border-ink-border pt-1 sm:border-t-0 sm:pt-0">
        <Link href="/me/lists" className={secondary}>
          {t("community.rail.myLists")} →
        </Link>
        <Link href="/me/lists?tab=saved" className={secondary}>
          {t("community.rail.saved")} →
        </Link>
      </span>
    </nav>
  );
}

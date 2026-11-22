import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { HomeResumeList } from "@/services/home/home";

// "Tus listas" de `/lists` con sesión (openspec: redesign-lists-phase2): una línea bajo la frase de entrada, en lugar del
// módulo del riel lateral. Retoma la lista propia con actividad más reciente (mismo criterio que "Retoma una lista" de Inicio)
// y da acceso a las listas propias y a las guardadas; sin listas propias, invita a crear la primera.
export async function ListsYourLine({ resume }: { resume: HomeResumeList | null }) {
  const t = await getTranslations("lists");
  const link = "inline-flex min-h-11 items-center transition-colors hover:text-amber";

  return (
    <p className="flex flex-wrap items-center gap-x-4 font-data text-sm text-paper-muted">
      <span className="text-paper">{t("community.rail.yourListsTitle")}</span>
      {resume ? (
        <>
          <Link href={`/me/lists/${resume.id}`} className={`${link} text-paper`}>
            {t("community.reader.resume", { title: resume.title })}
          </Link>
          <Link href="/me/lists" className={link}>
            {t("community.rail.myLists")} →
          </Link>
          <Link href="/me/lists?tab=saved" className={link}>
            {t("community.rail.saved")} →
          </Link>
        </>
      ) : (
        <>
          <span>{t("community.reader.noLists")}</span>
          <Link href="/me/lists?new=1" className={`${link} text-paper`}>
            {t("community.rail.createFirst")} →
          </Link>
        </>
      )}
    </p>
  );
}

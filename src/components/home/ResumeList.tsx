import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ListMosaic } from "@/components/home/ListMosaic";
import { HomeSectionHeading } from "@/components/home/HomeSectionHeading";
import type { HomeResumeList } from "@/services/home/home";

// «Retoma una lista»: acceso directo a la lista propia con elementos y actividad más reciente, para seguir
// agregándole ítems. Nunca propone una lista vacía (`getMostRecentEditedList` las descarta; openspec:
// redesign-signed-in-home-phase3). `variant="row"` es la fila al pie de «Lo último que escuchaste»;
// `section`, la sección propia cuando no hay escuchas. No renderiza nada sin lista. Ver
// docs/05-features/home.md.
export async function ResumeList({
  list,
  variant = "section",
}: {
  list: HomeResumeList | null;
  variant?: "section" | "row";
}) {
  if (!list) return null;

  const [t, tLists] = await Promise.all([getTranslations("home"), getTranslations("lists")]);
  const typeLabel = tLists(
    list.entityType === "artist"
      ? "entityTypeArtist"
      : list.entityType === "recording"
        ? "entityTypeSong"
        : "entityTypeAlbum",
  );

  // Fila con superficie: es un único destino, así que toda la fila se lee como botón, con la acción
  // explícita a la derecha.
  const row = (
    <Link
      href={`/me/lists/${list.id}`}
      className="group flex items-center gap-4 rounded-xl border border-ink-border bg-ink-surface p-3 transition-[background-color,border-color] duration-150 hover:border-amber/60"
    >
      <ListMosaic covers={list.coverThumbUrls} className="size-16 shrink-0" />
      <span className="min-w-0 flex-1">
        {variant === "row" ? (
          <span className="block font-data text-xs uppercase tracking-wider text-paper-muted">{t("resumeListLabel")}</span>
        ) : null}
        <span className="block truncate font-display text-lg text-paper transition-colors group-hover:text-amber">
          {list.title}
        </span>
        <span className="mt-0.5 block font-data text-xs text-paper-muted">
          {typeLabel}
          <span aria-hidden="true" className="mx-1.5 text-ink-border">
            ·
          </span>
          {t("resumeListItemCount", { count: list.itemCount })}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-data text-sm text-paper-muted transition-colors group-hover:text-amber">
        <span className="hidden sm:inline">{t("resumeListContinue")}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );

  if (variant === "row") return <div className="max-w-2xl">{row}</div>;

  return (
    <section aria-labelledby="home-resume-list" className="flex flex-col gap-6">
      <HomeSectionHeading
        id="home-resume-list"
        title={t("resumeListLabel")}
        seeAll={{ href: "/me/lists", label: t("resumeListSeeAll") }}
      />
      <div className="max-w-2xl">{row}</div>
    </section>
  );
}

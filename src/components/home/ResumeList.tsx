import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ListMosaic } from "@/components/home/ListMosaic";
import type { HomeResumeList } from "@/services/home/home";

// "Retoma una lista": acceso directo a la lista propia con actividad más
// reciente, para seguir agregándole ítems, con link a /me/lists para ver el
// resto. No renderiza nada si el usuario no tiene listas (ver
// docs/05-features/home.md). Mismo patrón de sección (h2 + "ver todo" +
// contenido sobre el fondo, sin card) que FeedPreview/RecentSelfActivity —
// antes era la única sección de Inicio metida en una card, y quedaba como un
// elemento suelto entre secciones sin caja.
export async function ResumeList({ list }: { list: HomeResumeList | null }) {
  if (!list) return null;

  const [t, tLists] = await Promise.all([getTranslations("home"), getTranslations("lists")]);
  const typeLabel = tLists(
    list.entityType === "artist"
      ? "entityTypeArtist"
      : list.entityType === "recording"
        ? "entityTypeSong"
        : "entityTypeAlbum",
  );

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-paper">{t("resumeListLabel")}</h2>
        <Link
          href="/me/lists"
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("resumeListSeeAll")}
        </Link>
      </div>

      {/* Fila con superficie al pasar el ratón: es un único destino, así que
          toda la fila se lee como botón, con la acción explícita a la derecha. */}
      <Link
        href={`/me/lists/${list.id}`}
        className="group -mx-3 flex items-center gap-4 rounded-lg border border-transparent p-3 transition-[background-color,border-color] duration-150 hover:border-ink-border hover:bg-ink-surface"
      >
        <ListMosaic covers={list.coverThumbUrls} className="size-16" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg text-paper transition-colors group-hover:text-amber">
            {list.title}
          </span>
          <span className="mt-0.5 block font-data text-xs text-paper-muted">
            {typeLabel}
            <span aria-hidden="true" className="mx-1.5 text-ink-border">
              ·
            </span>
            {list.itemCount === 0
              ? t("resumeListEmpty")
              : t("resumeListItemCount", { count: list.itemCount })}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 font-data text-xs text-paper-muted transition-colors group-hover:text-amber">
          <span className="hidden sm:inline">
            {t(list.itemCount === 0 ? "resumeListStart" : "resumeListContinue")}
          </span>
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
    </section>
  );
}

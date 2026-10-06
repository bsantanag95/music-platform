import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  CollectionIcon,
  DiaryIcon,
  FavoritesIcon,
  ListsIcon,
  JourneysIcon,
  CaminosIcon,
} from "@/components/home/QuickLinkIcons";

// Accesos rápidos de usuario logueado en Inicio: diario, favoritos, listas,
// colección, recorridos y caminos. El resto de la navegación completa vive en el Header.
// Vive dentro de WelcomePanel, por eso el grid asume una columna angosta.
export async function QuickLinks() {
  const t = await getTranslations("common");

  const links = [
    { href: "/me/diary" as const, label: t("diary"), Icon: DiaryIcon },
    { href: "/me/favorites" as const, label: t("favorites"), Icon: FavoritesIcon },
    { href: "/me/lists" as const, label: t("lists"), Icon: ListsIcon },
    { href: "/me/collection" as const, label: t("collection"), Icon: CollectionIcon },
    { href: "/me/artist-journeys" as const, label: t("artistJourneys"), Icon: JourneysIcon },
    { href: "/me/caminos" as const, label: t("caminos"), Icon: CaminosIcon },
  ];

  return (
    <nav aria-label={t("home")} className="grid grid-cols-2 gap-2">
      {links.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex min-h-11 items-center gap-2 rounded-md border border-ink-border bg-ink/40 py-1.5 pl-1.5 pr-2.5 font-data text-sm text-paper transition-[color,background-color,border-color] duration-150 hover:border-amber/60 hover:bg-ink hover:text-amber"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-ink-border/60 text-paper-muted transition-colors duration-150 group-hover:bg-amber/15 group-hover:text-amber">
            <Icon className="size-4" />
          </span>
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

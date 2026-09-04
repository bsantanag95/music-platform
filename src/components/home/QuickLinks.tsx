import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  CollectionIcon,
  DiaryIcon,
  FavoritesIcon,
  ListsIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/home/QuickLinkIcons";

// Accesos rápidos de usuario logueado en Inicio: diario, favoritos, listas,
// colección y buscador. El resto de la navegación completa vive en el Header.
// Vive dentro de WelcomePanel, por eso el grid asume una columna angosta.
export async function QuickLinks() {
  const t = await getTranslations("common");

  const links = [
    { href: "/me/diary" as const, label: t("diary"), Icon: DiaryIcon },
    { href: "/me/favorites" as const, label: t("favorites"), Icon: FavoritesIcon },
    { href: "/me/lists" as const, label: t("lists"), Icon: ListsIcon },
    { href: "/me/collection" as const, label: t("collection"), Icon: CollectionIcon },
    { href: "/search" as const, label: t("search"), Icon: SearchIcon },
    { href: "/users" as const, label: t("users"), Icon: UsersIcon },
  ];

  return (
    <nav aria-label={t("home")} className="grid grid-cols-2 gap-2">
      {links.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-2 rounded-md border border-ink-border px-3 py-2 font-data text-sm text-paper transition-colors hover:border-amber hover:text-amber"
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

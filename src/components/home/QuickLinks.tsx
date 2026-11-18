import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  CollectionIcon,
  DiaryIcon,
  FavoritesIcon,
  ListsIcon,
  JourneysIcon,
} from "@/components/home/QuickLinkIcons";

// Accesos rápidos de usuario logueado en Inicio: diario, favoritos, listas, colección física y
// progreso. El resto de la navegación completa vive en el Header. Desde la cabecera de Inicio
// (openspec: redesign-signed-in-home-phase1) van como una fila de cinco mosaicos —icono arriba,
// rótulo abajo—; por debajo de `sm` la fila se desplaza en horizontal en vez de partirse.
export async function QuickLinks() {
  const [t, tHome] = await Promise.all([getTranslations("common"), getTranslations("home")]);

  const links = [
    { href: "/me/diary" as const, label: t("diary"), Icon: DiaryIcon },
    { href: "/me/favorites" as const, label: t("favorites"), Icon: FavoritesIcon },
    { href: "/me/lists" as const, label: t("lists"), Icon: ListsIcon },
    { href: "/me/collection" as const, label: t("collection"), Icon: CollectionIcon },
    { href: "/me/progress" as const, label: t("progress"), Icon: JourneysIcon },
  ];

  return (
    <nav
      aria-label={tHome("yourLibrary")}
      className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {links.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex min-h-11 w-[6.75rem] shrink-0 flex-col gap-2.5 rounded-lg border border-ink-border bg-ink-surface/85 p-3 font-display text-sm text-paper transition-[color,border-color] duration-150 hover:border-amber/60 hover:text-amber sm:w-auto"
        >
          <Icon className="size-5 text-paper-muted transition-colors duration-150 group-hover:text-amber" />
          <span className="leading-tight">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

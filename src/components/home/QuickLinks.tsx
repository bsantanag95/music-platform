import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Accesos rápidos de usuario logueado en Inicio: diario, favoritos, listas,
// colección y buscador. El resto de la navegación completa vive en el Header.
export async function QuickLinks() {
  const t = await getTranslations("common");

  const links = [
    { href: "/me/diary" as const, label: t("diary") },
    { href: "/me/favorites" as const, label: t("favorites") },
    { href: "/me/lists" as const, label: t("lists") },
    { href: "/me/collection" as const, label: t("collection") },
    { href: "/search" as const, label: t("search") },
  ];

  return (
    <nav aria-label={t("home")} className="flex flex-wrap justify-center gap-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md border border-ink-border px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber hover:text-amber"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ListTarget } from "@/lib/api/schemas";
import { itemListsHref } from "./lists-shared";

// Acceso directo a la página dedicada de "Mostrar en listas" (openspec:
// show-item-in-lists) desde el perfil de canción/álbum/artista — una segunda
// vía además del botón "Mostrar en listas" (que abre el panel acotado a 4):
// este enlace lleva directo a la página completa sin pasar por el panel.
// Server Component (no necesita interactividad), usable directamente desde
// las páginas de catálogo.
export async function ViewAllListsLink({ target }: { target: ListTarget }) {
  const t = await getTranslations("lists");
  return (
    <Link
      href={itemListsHref(target)}
      className="font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
    >
      {t("seeAllLists")}
    </Link>
  );
}

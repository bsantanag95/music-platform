import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface ProfileLevel3LinksProps {
  username: string;
  /** Cuáles de los estantes tienen contenido — no se enlaza a un estante vacío. */
  has: { diary: boolean; favorites: boolean; lists: boolean; collection: boolean };
  /** La huella de gusto tiene datos para mostrar en su vista de Nivel 3. */
  hasFingerprint: boolean;
}

// Puertas al Nivel 3 del perfil (openspec: rework-user-profile): enlaces
// discretos a la inmersión bajo demanda, nunca precargada. "Diario completo",
// "Favoritos" y "Colección" son anclas a los estantes que ya viven más abajo
// en esta misma página (no se duplica esa lectura); "Huella de gusto
// completa" es la única que navega a una vista aparte, porque sus gráficos
// dejaron de vivir en el flujo principal. No hay enlace a "todas las
// valoraciones": esa superficie no existe todavía en el producto. No se
// renderiza si no hay ninguna puerta disponible.
export async function ProfileLevel3Links({ username, has, hasFingerprint }: ProfileLevel3LinksProps) {
  const t = await getTranslations("users");

  const links = [
    has.diary && { href: "#diario", label: t("level3.diary") },
    has.favorites && { href: "#favoritos", label: t("level3.favorites") },
    has.lists && { href: "#listas", label: t("level3.lists") },
    has.collection && { href: "#coleccion", label: t("level3.collection") },
    hasFingerprint && { href: `/users/${username}/fingerprint`, label: t("level3.fingerprint") },
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  if (links.length === 0) return null;

  return (
    <nav aria-label={t("level3.navLabel")} className="flex w-full max-w-2xl flex-wrap gap-x-4 gap-y-2 border-t border-ink-border pt-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

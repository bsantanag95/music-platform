import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface ViewAsBannerProps {
  username: string;
  previewing: boolean;
}

// Previsualizador "cómo te ven": el dueño puede ver su perfil tal como lo ve
// el público (spec social-profiles, "Panel del dueño"). Es navegación por
// query param (`?preview=1`), sin estado cliente: el servidor recompone el
// perfil con el visitante anónimo cuando el parámetro está presente.
export async function ViewAsBanner({ username, previewing }: ViewAsBannerProps) {
  const t = await getTranslations("users");
  const base = `/users/${encodeURIComponent(username)}`;

  if (previewing) {
    return (
      <div
        role="status"
        className="flex w-full max-w-2xl flex-wrap items-center justify-between gap-2 rounded-lg border border-amber/40 bg-amber/10 px-4 py-2"
      >
        <span className="font-body text-sm text-paper">{t("viewAs.banner")}</span>
        <Link href={base} className="font-data text-xs text-amber underline underline-offset-2">
          {t("viewAs.exit")}
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={`${base}?preview=1`}
      className="w-full max-w-2xl font-data text-xs text-paper-muted underline decoration-paper-muted underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
    >
      {t("viewAs.enter")}
    </Link>
  );
}

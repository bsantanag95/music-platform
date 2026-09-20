import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface ViewAsBannerProps {
  username: string;
}

// Aviso de la previsualización "cómo te ven": el dueño ve su perfil tal como lo
// ve el público (spec social-profiles, "Panel del dueño") y aquí tiene la salida
// a su vista. La entrada a la previsualización vive en `OwnerProfileBar`. Es
// navegación por query param (`?preview=1`), sin estado cliente: el servidor
// recompone el perfil con el visitante anónimo cuando el parámetro está presente.
export async function ViewAsBanner({ username }: ViewAsBannerProps) {
  const t = await getTranslations("users");
  const base = `/users/${encodeURIComponent(username)}`;

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

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { UnsubscribeConfirm, UnsubscribeNotice } from "@/components/notifications/UnsubscribeConfirm";
import { isValidUnsubscribeToken } from "@/services/notifications/unsubscribe";

// Baja del resumen semanal desde el correo (openspec:
// add-notification-digest-and-awards, D5 y D8). Sin sesión: el enlace tiene que
// funcionar aunque la persona no haya iniciado sesión en ese navegador. El token
// viaja en el query string: evitar que se filtre por `Referer`.
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("notifications");
  const { token } = await searchParams;

  // Un `GET` no cambia nada: el token solo se verifica aquí. La baja real la
  // hace el botón de confirmación con un `POST` al endpoint de un clic.
  if (!token || !isValidUnsubscribeToken(token)) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
        <UnsubscribeNotice
          title={t("unsubscribePage.invalidTitle")}
          description={t("unsubscribePage.invalidDescription")}
          action={
            <Link
              href="/me/settings/notifications"
              className="rounded-md border border-ink-border px-4 py-3 text-center font-display text-sm text-paper transition-colors hover:border-amber"
            >
              {t("unsubscribePage.goToSettings")}
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
      <UnsubscribeConfirm token={token} />
    </main>
  );
}

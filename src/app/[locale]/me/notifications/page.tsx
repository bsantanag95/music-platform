import { getTimeZone, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/services/auth/page-auth";
import { listNotificationGroups } from "@/services/notifications/read";
import { NotificationsView } from "@/components/notifications/NotificationsView";

// Bandeja completa (openspec: add-notifications-core, D8). La primera página se
// resuelve aquí, en la zona horaria del usuario, y el cliente sigue el cursor.
// `requirePageUser` manda a iniciar sesión sin sesión.
export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const user = await requirePageUser();
  const timeZone = await getTimeZone();
  const initial = await listNotificationGroups(user.id, { timeZone });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-paper">{t("page.title")}</h1>
          <p className="mt-1 font-body text-sm text-paper-muted">{t("page.subtitle")}</p>
        </div>
        <Link
          href="/me/settings/notifications"
          className="font-data text-xs text-paper-muted underline underline-offset-2 transition-colors hover:text-paper"
        >
          {t("page.settings")}
        </Link>
      </header>

      <NotificationsView initial={initial} />
    </main>
  );
}

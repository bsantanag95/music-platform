import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Invitación a crear una cuenta de `/lists` sin sesión (openspec: redesign-lists-phase2): una banda dentro del recorrido,
// después del lector, en lugar del módulo del riel lateral (en el teléfono quedaba al final de la página).
export async function ListsSignUpBand() {
  const t = await getTranslations("lists");
  return (
    <section
      aria-labelledby="lists-join-heading"
      className="grid w-full items-center gap-5 rounded-2xl border border-dashed border-ink-border px-6 py-6 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="flex flex-col gap-1">
        <h2 id="lists-join-heading" className="font-display text-2xl font-bold tracking-[-0.015em] text-paper">
          {t("community.rail.joinTitle")}
        </h2>
        <p className="max-w-[60ch] font-body text-paper-muted">{t("community.rail.joinDescription")}</p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href="/auth/register"
          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md bg-amber px-5 font-display text-sm font-medium text-ink transition-colors hover:bg-amber-hover"
        >
          {t("community.rail.joinAction")}
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex min-h-11 items-center justify-center font-data text-sm text-paper-muted transition-colors hover:text-paper"
        >
          {t("community.rail.signIn")}
        </Link>
      </div>
    </section>
  );
}

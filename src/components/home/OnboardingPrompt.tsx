import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

// Reemplaza el preview de feed cuando el usuario logueado no sigue a nadie
// todavía — evita mostrarle el empty state genérico del feed como primera
// impresión de Inicio (ver docs/05-features/home.md).
export async function OnboardingPrompt() {
  const t = await getTranslations("home");

  return (
    <section className="flex w-full max-w-3xl flex-col items-center gap-3 rounded-lg border border-ink-border bg-ink-surface px-6 py-10 text-center">
      <h2 className="font-display text-lg text-paper">{t("onboardingTitle")}</h2>
      <p className="max-w-sm font-body text-sm text-paper-muted">{t("onboardingDescription")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/users">
          <Button variant="primary">{t("onboardingFindPeople")}</Button>
        </Link>
        <Link href="/search">
          <Button variant="secondary">{t("onboardingExploreCatalog")}</Button>
        </Link>
      </div>
      <p className="max-w-sm font-body text-sm text-paper-muted">
        {t("onboardingLogFirstListen")}
      </p>
    </section>
  );
}

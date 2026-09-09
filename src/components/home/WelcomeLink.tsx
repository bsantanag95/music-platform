import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

// Acceso pasivo al onboarding de dos puertas mientras esté pendiente
// (openspec: add-two-door-onboarding). Distinto del bloque de onboarding
// social (`OnboardingPrompt`): este es "tu identidad musical", aquél es
// "conectá con gente". Desaparece cuando el usuario ya onboardeó.
export async function WelcomeLink() {
  const t = await getTranslations("onboarding");

  return (
    <section className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-amber/40 bg-ink-surface px-5 py-4">
      <p className="font-body text-sm text-paper">{t("homeLink")}</p>
      <Link href="/welcome">
        <Button variant="secondary">{t("homeLinkCta")}</Button>
      </Link>
    </section>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { TwoDoorOnboarding } from "@/components/onboarding/TwoDoorOnboarding";

interface WelcomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: WelcomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("pageTitle") };
}

// Onboarding de dos puertas (openspec: add-two-door-onboarding). Guard:
// sin sesión → login; ya onboardeado → Inicio. Solo un usuario con
// `onboarded_at` nulo ve el flujo, y una sola vez.
export default async function WelcomePage({ params }: WelcomePageProps) {
  const { locale } = await params;
  const t = await getTranslations("onboarding");

  const sessionData = await resolveSession();
  if (!sessionData) {
    redirect({ href: "/auth/login", locale });
    return null;
  }
  if (sessionData.user.onboardedAt) {
    redirect({ href: "/", locale });
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-paper">{t("heading")}</h1>
        <p className="font-body text-paper-muted">{t("intro")}</p>
      </header>
      <TwoDoorOnboarding />
    </main>
  );
}

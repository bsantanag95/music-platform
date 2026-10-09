import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { isEmailVerified } from "@/services/auth/email-verification";
import { WelcomeFlow } from "@/components/onboarding/WelcomeFlow";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { isExploreEnabled } from "@/lib/config/discovery";
import { resolveNewContentAudience } from "@/services/social/default-audience";

interface WelcomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: WelcomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("pageTitle") };
}

// Onboarding guiado en tres pasos (openspec: add-two-door-onboarding, redesign-welcome-flow). Guard:
// sin sesión → login; ya onboardeado → Inicio. Solo un usuario con
// `onboarded_at` nulo ve el flujo, y una sola vez.
export default async function WelcomePage({ params }: WelcomePageProps) {
  const { locale } = await params;

  const sessionData = await resolveSession();
  if (!sessionData) {
    redirect({ href: "/auth/login", locale });
    return null;
  }
  if (sessionData.user.onboardedAt) {
    redirect({ href: "/", locale });
    return null;
  }

  // Las audiencias efectivas las resuelve el servidor con la misma regla que usan los
  // servicios al crear contenido: el aviso nunca contradice lo que se guarda.
  const [favoriteAudience, diaryAudience] = await Promise.all([
    resolveNewContentAudience(sessionData.user.id, "favorite"),
    resolveNewContentAudience(sessionData.user.id, "diary"),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-4 py-12">
      <WelcomeFlow
        userId={sessionData.user.id}
        favoriteAudience={favoriteAudience}
        diaryAudience={diaryAudience}
        exploreEnabled={isExploreEnabled()}
        notice={<EmailVerificationNotice verified={isEmailVerified(sessionData.user)} variant="welcome" />}
      />
    </main>
  );
}

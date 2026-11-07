import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { SocialSignIn } from "@/components/auth/SocialSignIn";
import { resolveSession } from "@/services/auth/sessions";
import { withClientMessages } from "@/i18n/client-messages";
import { laminaAuthHref, laminaBuildHref, parseLaminaIntent } from "@/lib/laminas/intent";

async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ lamina?: string }>;
}) {
  const { locale } = await params;
  const laminaId = parseLaminaIntent((await searchParams)?.lamina);
  if (await resolveSession()) redirect({ href: laminaId ? laminaBuildHref(laminaId) : "/", locale });
  const t = await getTranslations("auth");
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl text-paper">{t("registerTitle")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("registerDescription")}</p>
      </div>
      <div className="flex flex-col gap-6">
        <SocialSignIn
          locale={locale}
          label={t("continueWithGoogle")}
          separator={t("orSeparator")}
          laminaId={laminaId}
        />
        <AuthForm mode="register" laminaId={laminaId} />
      </div>
      <p className="border-t border-ink-border pt-6 font-data text-sm text-paper-muted">
        {t("hasAccount")}{" "}
        <Link
          href={laminaAuthHref("/auth/login", laminaId)}
          className="text-accent underline-offset-4 transition-colors duration-150 hover:text-accent-hover hover:underline"
        >
          {t("login")}
        </Link>
      </p>
    </main>
  );
}

export default withClientMessages("auth/register/page", RegisterPage);

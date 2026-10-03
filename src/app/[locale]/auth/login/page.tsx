import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/navigation";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { resolveSession } from "@/services/auth/sessions";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ reset?: string }>;
}) {
  const { locale } = await params;
  if (await resolveSession()) redirect({ href: "/", locale });
  const { reset } = (await searchParams) ?? {};
  const t = await getTranslations("auth");
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl text-paper">{t("loginTitle")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("loginDescription")}</p>
      </div>
      {reset === "1" && (
        <p role="status" className="rounded-md border border-ink-border bg-ink-surface px-3 py-2 font-data text-sm text-paper">
          {t("resetSuccess")}
        </p>
      )}
      <div className="flex flex-col gap-6">
        <LoginPanel
          locale={locale}
          googleLabel={t("continueWithGoogle")}
          separator={t("orSeparator")}
          passwordAside={
            <Link
              href="/auth/forgot-password"
              className="font-data text-sm text-accent underline-offset-4 transition-colors duration-150 hover:text-accent-hover hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          }
        />
      </div>
      <p className="border-t border-ink-border pt-6 font-data text-sm text-paper-muted">
        {t("noAccount")}{" "}
        <Link
          href="/auth/register"
          className="text-accent underline-offset-4 transition-colors duration-150 hover:text-accent-hover hover:underline"
        >
          {t("register")}
        </Link>
      </p>
    </main>
  );
}

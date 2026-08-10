import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { resolveSession } from "@/services/auth/sessions";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await resolveSession()) redirect({ href: "/search", locale });
  const t = await getTranslations("auth");
  return <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12"><div><h1 className="font-display text-3xl text-paper">{t("loginTitle")}</h1><p className="mt-2 font-body text-paper-muted">{t("loginDescription")}</p></div><AuthForm mode="login" /><p className="font-data text-sm text-paper-muted">{t("noAccount")} <Link href="/auth/register" className="text-accent hover:text-paper">{t("register")}</Link></p></main>;
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12"><div><h1 className="font-display text-3xl text-paper">{t("registerTitle")}</h1><p className="mt-2 font-body text-paper-muted">{t("registerDescription")}</p></div><AuthForm mode="register" /><p className="font-data text-sm text-paper-muted">{t("hasAccount")} <Link href="/auth/login" className="text-accent hover:text-paper">{t("login")}</Link></p></main>;
}

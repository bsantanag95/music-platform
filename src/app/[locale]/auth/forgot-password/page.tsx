import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl text-paper">{t("forgotTitle")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("forgotDescription")}</p>
      </div>
      <ForgotPasswordForm />
      <div className="flex flex-col gap-3">
        <p className="font-data text-sm text-paper-muted">{t("forgotGoogleNote")}</p>
        <Link href="/auth/login" className="font-data text-sm text-accent hover:text-paper">
          {t("login")}
        </Link>
      </div>
    </main>
  );
}

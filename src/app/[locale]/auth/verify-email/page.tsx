import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { findValidVerificationToken } from "@/services/auth/email-verification";

// El token viaja en el query string: evitar que se filtre por `Referer`.
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth");
  const { token } = await searchParams;
  const valid = token ? await findValidVerificationToken(token) : null;

  if (!token || !valid) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
        <div>
          <h1 className="font-display text-3xl text-paper">{t("verifyEmailInvalidTitle")}</h1>
          <p className="mt-2 font-body text-paper-muted">{t("verifyEmailInvalidDescription")}</p>
        </div>
        <Link
          href="/auth/login"
          className="rounded-md bg-accent px-4 py-3 text-center font-display text-sm text-ink hover:opacity-90"
        >
          {t("verifyEmailGoToLogin")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl text-paper">{t("verifyEmailTitle")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("verifyEmailDescription")}</p>
      </div>
      <VerifyEmailForm token={token} />
    </main>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { findValidResetToken } from "@/services/auth/password-reset";

// El token viaja en el query string: evitar que se filtre por `Referer` a
// terceros al abrir el link desde el correo.
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth");
  const { token } = await searchParams;
  const valid = token ? await findValidResetToken(token) : null;

  if (!token || !valid) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
        <div>
          <h1 className="font-display text-3xl text-paper">{t("resetInvalidTitle")}</h1>
          <p className="mt-2 font-body text-paper-muted">{t("resetInvalidDescription")}</p>
        </div>
        <Link
          href="/auth/forgot-password"
          className="rounded-md bg-accent px-4 py-3 text-center font-display text-sm text-ink hover:opacity-90"
        >
          {t("forgotSubmit")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl text-paper">{t("resetTitle")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("resetDescription")}</p>
      </div>
      <ResetPasswordForm token={token} />
    </main>
  );
}

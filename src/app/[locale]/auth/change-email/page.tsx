import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChangeEmailForm } from "@/components/auth/ChangeEmailForm";
import { findValidEmailChangeToken } from "@/services/auth/email-change";

// El token viaja en el query string: evitar que se filtre por `Referer`.
export const metadata: Metadata = { referrer: "no-referrer" };

// Confirmación del cambio de email desde el enlace del correo (spec
// account-credentials). Como verify-email: pre-valida el token sin consumirlo y
// deja que la persona confirme con un clic (un GET nunca debe cambiar el email).
export default async function ChangeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth");
  const { token } = await searchParams;
  const valid = token ? await findValidEmailChangeToken(token) : null;

  if (!token || !valid) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
        <div>
          <h1 className="font-display text-3xl text-paper">{t("changeEmailInvalidTitle")}</h1>
          <p className="mt-2 font-body text-paper-muted">{t("changeEmailInvalidDescription")}</p>
        </div>
        <Link
          href="/me/settings/account"
          className="rounded-md bg-accent px-4 py-3 text-center font-display text-sm text-ink hover:opacity-90"
        >
          {t("changeEmailGoToSettings")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl text-paper">{t("changeEmailTitle")}</h1>
        <p className="mt-2 font-body text-paper-muted">{t("changeEmailDescription")}</p>
        <p className="mt-3 font-data text-sm text-paper">{valid.newEmail}</p>
      </div>
      <ChangeEmailForm token={token} />
    </main>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const OAUTH_ERROR_CODES = new Set([
  "OAUTH_CANCELLED",
  "OAUTH_STATE_INVALID",
  "OAUTH_CALLBACK_INVALID",
  "OAUTH_TOKEN_INVALID",
  "OAUTH_CONFIG_MISSING",
  "OAUTH_EMAIL_NOT_VERIFIED",
  "EMAIL_TAKEN_BY_LOCAL",
  "RATE_LIMITED",
]);

export default async function OAuthErrorPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const t = await getTranslations("auth");
  const tErrors = await getTranslations("errors");

  const errorCode = code && OAUTH_ERROR_CODES.has(code) ? code : "OAUTH_CALLBACK_INVALID";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl text-paper">{t("oauthErrorTitle")}</h1>
        <p className="mt-2 font-body text-paper-muted">
          {tErrors(`${errorCode}.description`)}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link
          href="/auth/login"
          className="rounded-md bg-accent px-4 py-3 text-center font-display text-sm text-ink hover:opacity-90"
        >
          {t("login")}
        </Link>
        <Link
          href="/search"
          className="rounded-md border border-ink-border px-4 py-3 text-center font-display text-sm text-paper hover:bg-ink-surface"
        >
          {t("goToSearch")}
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SettingsCard } from "@/components/settings/SettingsSection";
import { apiFetch, ApiError } from "@/lib/api/client";
import { PreferencesResponseSchema } from "@/lib/api/schemas";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { knownErrorCode } from "./parts";

// Tarjeta "Preferencias" (spec account-preferences): el idioma de la interfaz se
// guarda en la cuenta y la pantalla pasa de inmediato al idioma elegido. Este
// control es el ÚNICO que persiste la preferencia: el selector del Header no.
export function LanguagePreference() {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function choose(next: (typeof routing.locales)[number]) {
    if (next === locale || pending) return;
    setPending(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/me/preferences", PreferencesResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      // `scroll: false`: cambiar de idioma no debe llevar al inicio de la pantalla.
      router.replace(pathname, { locale: next, scroll: false });
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      setPending(false);
    }
  }

  return (
    <SettingsCard>
      <h3 className="mb-2 font-display text-sm text-paper-muted">{t("settings.account.preferences.title")}</h3>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-data text-xs uppercase tracking-wide text-paper-muted">
            {t("settings.account.preferences.languageLabel")}
          </div>
          <p className="font-body text-xs text-paper-muted">{t("settings.account.preferences.languageHint")}</p>
        </div>
        <div role="group" aria-label={t("settings.account.preferences.languageLabel")} className="flex gap-2">
          {routing.locales.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === locale}
              disabled={pending}
              onClick={() => void choose(option)}
              className={`rounded-full border px-3 py-1 font-display text-sm transition-colors disabled:cursor-not-allowed ${
                option === locale
                  ? "border-amber bg-amber/10 text-paper"
                  : "border-ink-border text-paper-muted hover:border-amber hover:text-paper"
              }`}
            >
              {t(`settings.account.preferences.language.${option}`)}
            </button>
          ))}
        </div>
      </div>
      {errorCode && (
        <p role="alert" className="mt-2 font-data text-xs text-danger">
          {tErrors(`${knownErrorCode(errorCode)}.description`)}
        </p>
      )}
    </SettingsCard>
  );
}

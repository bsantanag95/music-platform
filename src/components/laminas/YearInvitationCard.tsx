"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Invitación de diciembre a "Tu año en discos" (spec home, openspec: add-year-in-discs-phase3, D2), en Inicio y en el diario. "Descartar" guarda el año en
// una cookie que el servidor lee, así la tarjeta no vuelve a pintarse ese año; el siguiente sí aparece.

/** Mismo nombre que `YEAR_INVITE_DISMISSED_COOKIE` del servicio, que no se importa en el cliente. */
const DISMISSED_COOKIE = "year_invite_dismissed";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function YearInvitationCard({ username, year, inProgress }: { username: string; year: number; inProgress: boolean }) {
  const t = useTranslations("laminas.year.invite");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const dismiss = () => {
    document.cookie = `${DISMISSED_COOKIE}=${year}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    setDismissed(true);
  };

  return (
    <aside
      aria-labelledby={`year-invite-${year}`}
      className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 rounded border border-amber/40 bg-ink-surface p-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={`year-invite-${year}`} className="font-display text-base text-paper">
          {inProgress ? t("titleInProgress", { year }) : t("title", { year })}
        </h2>
        <p className="font-body text-sm text-paper-muted">{t("description")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/users/${encodeURIComponent(username)}/year/${year}`}
          className="inline-flex min-h-11 items-center rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover"
        >
          {t("action")}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismissLabel", { year })}
          className="inline-flex min-h-11 items-center px-2 font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("dismiss")}
        </button>
      </div>
    </aside>
  );
}

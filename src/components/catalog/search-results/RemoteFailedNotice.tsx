"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

// MusicBrainz falló pero había coincidencias locales (`remoteFailed`): se dice
// en vez de presentar lo local como la lista completa (openspec:
// redesign-scoped-search). "Reintentar" vuelve a resolver la página.
export function RemoteFailedNotice() {
  const t = useTranslations("catalog.search.results.remoteFailed");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber/40 bg-ink-surface px-4 py-3"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-display text-sm text-paper">{t("title")}</p>
        <p className="font-body text-xs text-paper-muted">{t("description")}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        className="shrink-0 rounded border border-ink-border px-3 py-1.5 font-data text-xs text-paper transition-colors hover:border-amber disabled:opacity-60"
      >
        {t("retry")}
      </button>
    </div>
  );
}

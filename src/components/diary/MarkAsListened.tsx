"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ListenEntryForm } from "./ListenEntryForm";
import { createListenEntry } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import type { ListenEntry, ListenTarget } from "@/lib/api/schemas";

interface MarkAsListenedProps {
  target: ListenTarget;
  authenticated: boolean;
}

// Acción "Marcar como escuchado": crea la entrada al instante (registro
// rápido) y ofrece un panel para ampliarla con impresión, contexto,
// reacción y audiencia. Sin sesión, redirige al login.
export function MarkAsListened({ target, authenticated }: MarkAsListenedProps) {
  const t = useTranslations("diary");
  const [busy, setBusy] = useState(false);
  const [entry, setEntry] = useState<ListenEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (!authenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
      >
        {t("signInToListen")}
      </Link>
    );
  }

  const handleMark = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const created = await createListenEntry(target);
      setEntry(created);
      setShowForm(true);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-3">
      {!entry ? (
        <Button variant="secondary" disabled={busy} onClick={() => void handleMark()}>
          {busy ? t("listening") : t("markAsListened")}
        </Button>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <span role="status" className="font-data text-sm text-paper">
            {t("marked")}: {entry.target.title}
          </span>
          <Button variant="ghost" onClick={() => setShowForm((current) => !current)}>
            {showForm ? t("collapse") : t("expand")}
          </Button>
        </div>
      )}
      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      )}
      {entry && showForm && (
        <ListenEntryForm
          entryId={entry.id}
          initial={{
            listenContext: entry.listenContext,
            body: entry.body,
            reaction: entry.reaction,
            audience: entry.audience,
          }}
          onSaved={setEntry}
        />
      )}
    </div>
  );
}
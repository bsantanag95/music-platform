"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { createListenEntry } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import type { ListenEntry } from "@/lib/api/schemas";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import type { PickTarget } from "../types";
import { ActionNotice } from "../ActionNotice";

interface ListenPanelProps {
  target: PickTarget;
  /** Vuelve al buscador ("Registrar otra" o tras un error). */
  onReset: () => void;
  onNavigate: () => void;
}

// Acción Escucha del diálogo de acciones rápidas (openspec: add-header-quick-actions): elegir el
// objetivo crea la escucha al instante (audiencia `private`) y ofrece ampliarla. Es el flujo del
// antiguo `RegisterListenDialog`, sin cambios de comportamiento. El panel se monta con `key` por
// objetivo; el guard de `started` evita crear dos escuchas con el doble efecto de StrictMode.
export function ListenPanel({ target, onReset, onNavigate }: ListenPanelProps) {
  const t = useTranslations("quickActions");
  const tDiary = useTranslations("diary");
  const [entry, setEntry] = useState<ListenEntry | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const started = useRef(false);
  const notifyChanged = useNotifyQuickActionChange();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createListenEntry({ type: target.type, id: target.id })
      .then((created) => {
        setEntry(created);
        notifyChanged();
      })
      .catch((err: unknown) => setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR"));
  }, [target.type, target.id, notifyChanged]);

  if (errorCode) {
    return (
      <div className="flex flex-col items-start gap-3">
        {errorCode === "AUTH_REQUIRED" ? (
          <Link href="/auth/login" className="font-data text-sm text-amber underline">
            {tDiary("signInToListen")}
          </Link>
        ) : (
          <span role="alert" className="font-data text-xs text-danger">
            {t("saveError")}
          </span>
        )}
        <Button variant="secondary" onClick={onReset}>
          {t("chooseAnother")}
        </Button>
      </div>
    );
  }

  if (!entry) {
    return (
      <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
        <Spinner label={t("listen.creating")} className="size-4" /> {t("listen.creating")}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ActionNotice tone="success" title={t("listen.created")} detail={entry.target.title} />
      <ListenEntryForm
        entryId={entry.id}
        target={entry.target}
        initial={{
          listenContext: entry.listenContext,
          body: entry.body,
          reaction: entry.reaction,
          audience: entry.audience,
        }}
        onSaved={(saved) => {
          setEntry(saved);
          notifyChanged();
        }}
      />
      <div className="flex flex-wrap items-center gap-3 border-t border-ink-border pt-4">
        <Button variant="secondary" onClick={onReset}>
          {t("listen.registerAnother")}
        </Button>
        <Link
          href="/me/diary"
          onClick={onNavigate}
          className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
        >
          {t("listen.viewDiary")}
        </Link>
      </div>
    </div>
  );
}

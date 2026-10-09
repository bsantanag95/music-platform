"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { createListenEntry } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import type { ListenEntry } from "@/lib/api/schemas";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import type { PickTarget } from "../types";
import { ActionNotice } from "../ActionNotice";
import { PanelAction, PanelFooter, PanelLink } from "../PanelActions";

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();

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
        <PanelAction onClick={onReset}>
          {t("chooseAnother")}
        </PanelAction>
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

      {/* La escucha ya quedó registrada: los detalles son opcionales y van plegados. Abierto por
          defecto con su "Guardar" al final se leía como un paso obligatorio para terminar. */}
      <div className="rounded-lg border border-ink-border">
        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-ink/60"
        >
          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="font-display text-sm text-paper">{t("listen.addDetails")}</span>
              <span className="font-data text-[11px] uppercase tracking-wider text-paper-muted">
                {t("listen.optional")}
              </span>
            </span>
            <span className="block truncate font-data text-xs text-paper-muted">{t("listen.detailsHint")}</span>
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`size-4 shrink-0 text-paper-muted transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {detailsOpen ? (
          <div id={detailsId} className="border-t border-ink-border px-3 pb-3 pt-3">
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
          </div>
        ) : null}
      </div>

      <PanelFooter>
        <PanelAction onClick={onReset}>{t("listen.registerAnother")}</PanelAction>
        <PanelLink href="/me/diary" onClick={onNavigate}>
          {t("listen.viewDiary")}
        </PanelLink>
      </PanelFooter>
    </div>
  );
}

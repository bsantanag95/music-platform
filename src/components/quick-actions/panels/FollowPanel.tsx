"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { followArtist } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import type { PickTarget } from "../types";
import { ActionNotice } from "../ActionNotice";
import { PanelFooter, PanelAction, PanelLink } from "../PanelActions";

interface FollowPanelProps {
  target: PickTarget;
  onReset: () => void;
  onNavigate: () => void;
}

// Acción Seguir artista del diálogo de acciones rápidas (openspec: redesign-artists-toolbar, D1). Seguir es idempotente,
// así que no hace falta consultar antes: si ya lo seguía, el resultado es el mismo. Avisa del cambio para que
// `/me/artists`, si está abierta, se actualice. El panel se monta con `key` por objetivo.
export function FollowPanel({ target, onReset, onNavigate }: FollowPanelProps) {
  const t = useTranslations("quickActions");
  const [done, setDone] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const started = useRef(false);
  const notifyChanged = useNotifyQuickActionChange();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        await followArtist(target.id);
        notifyChanged();
        setDone(true);
      } catch (err) {
        setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
      }
    })();
  }, [target.id, notifyChanged]);

  if (errorCode) {
    return (
      <div className="flex flex-col items-start gap-3">
        {errorCode === "AUTH_REQUIRED" ? (
          <Link href="/auth/login" className="font-data text-sm text-amber underline">
            {t("signIn")}
          </Link>
        ) : (
          <span role="alert" className="font-data text-xs text-danger">
            {t("saveError")}
          </span>
        )}
        <PanelAction onClick={onReset}>{t("chooseAnother")}</PanelAction>
      </div>
    );
  }

  if (!done) {
    return (
      <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
        <Spinner label={t("follow.following")} className="size-4" /> {t("follow.following")}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ActionNotice tone="success" title={t("follow.done")} detail={target.title} />
      <PanelFooter divided={false}>
        <PanelAction onClick={onReset}>{t("chooseAnother")}</PanelAction>
        <PanelLink href="/me/artists" onClick={onNavigate}>
          {t("follow.open")}
        </PanelLink>
      </PanelFooter>
    </div>
  );
}

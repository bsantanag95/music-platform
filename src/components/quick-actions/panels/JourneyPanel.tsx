"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { activateArtistJourney, getArtistJourneyStatuses } from "@/lib/api/artist-journeys";
import { ApiError } from "@/lib/api/client";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import type { PickTarget } from "../types";
import { ActionNotice } from "../ActionNotice";

type JourneyState = "checking" | "activating" | "activated" | "already";

interface JourneyPanelProps {
  target: PickTarget;
  onReset: () => void;
  onNavigate: () => void;
}

// Acción Recorrido del diálogo de acciones rápidas (openspec: add-quick-actions-collection-camino,
// D2): lee primero si ya hay un recorrido (consulta por lote, sin ingesta de discografía) y solo
// si no existe lo activa. Activar puede tardar: ingiere la discografía de un artista sin explorar.
// Es la acción explícita de la persona, no una lectura. El panel se monta con `key` por objetivo.
export function JourneyPanel({ target, onReset, onNavigate }: JourneyPanelProps) {
  const t = useTranslations("quickActions");
  const [state, setState] = useState<JourneyState>("checking");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const started = useRef(false);
  const notifyChanged = useNotifyQuickActionChange();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const withJourney = await getArtistJourneyStatuses([target.id]);
        if (withJourney.includes(target.id)) {
          setState("already");
          return;
        }
        setState("activating");
        await activateArtistJourney(target.id);
        notifyChanged();
        setState("activated");
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
        <Button variant="secondary" onClick={onReset}>
          {t("chooseAnother")}
        </Button>
      </div>
    );
  }

  if (state === "checking" || state === "activating") {
    const label = state === "checking" ? t("journey.checking") : t("journey.activating");
    return (
      <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
        <Spinner label={label} className="size-4" /> {label}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ActionNotice
        tone={state === "activated" ? "success" : "info"}
        title={t(state === "activated" ? "journey.activated" : "journey.already")}
        detail={target.title}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={onReset}>
          {t("chooseAnother")}
        </Button>
        <Link
          href={`/me/artist-journeys/${target.id}`}
          onClick={onNavigate}
          className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
        >
          {t("journey.open")}
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getTargetMarks } from "@/lib/api/marks";
import { removeFavorite, toggleFavorite } from "@/lib/api/favorites";
import { removeFromWantToListen, toggleWantToListen } from "@/lib/api/want-to-listen";
import { ApiError } from "@/lib/api/client";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import type { PickTarget } from "../types";
import { ActionNotice } from "../ActionNotice";

type MarkKind = "favorite" | "pending";
type MarkState = "checking" | "added" | "already" | "removed";

interface MarkPanelProps {
  kind: MarkKind;
  target: PickTarget;
  onReset: () => void;
}

// Pendiente solo admite artista y álbum; el buscador ya no ofrece canciones en esa acción.
function pendingTarget(target: PickTarget): { type: "artist" | "release-group"; id: string } | null {
  return target.type === "recording" ? null : { type: target.type, id: target.id };
}

// Acciones Favorito y Pendiente del diálogo de acciones rápidas (openspec: add-header-quick-actions,
// D4). `POST /api/me/favorites` y `/want-to-listen` alternan, así que antes de marcar se leen las
// marcas: sin marca se aplica al instante (con "Deshacer"); con marca solo se informa y se ofrece
// "Quitar". Elegir un objetivo nunca quita una marca por sí solo.
export function MarkPanel({ kind, target, onReset }: MarkPanelProps) {
  const t = useTranslations("quickActions");
  const [state, setState] = useState<MarkState>("checking");
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const started = useRef(false);
  const notifyChanged = useNotifyQuickActionChange();

  async function add() {
    if (kind === "favorite") {
      await toggleFavorite({ type: target.type, id: target.id });
    } else {
      const pending = pendingTarget(target);
      if (pending) await toggleWantToListen(pending);
    }
  }

  async function remove() {
    if (kind === "favorite") {
      await removeFavorite({ type: target.type, id: target.id });
    } else {
      const pending = pendingTarget(target);
      if (pending) await removeFromWantToListen(pending);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const marks = await getTargetMarks(target.type, target.id);
        const marked = kind === "favorite" ? marks.favorite : marks.pending === true;
        if (marked) {
          setState("already");
          return;
        }
        await add();
        notifyChanged();
        setState("added");
      } catch (err) {
        setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
      }
    })();
    // La lectura y la marca corren una sola vez por objetivo (el panel se monta con `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function undo() {
    setBusy(true);
    setErrorCode(null);
    try {
      await remove();
      notifyChanged();
      setState("removed");
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

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

  if (state === "checking") {
    return (
      <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
        <Spinner label={t("mark.checking")} className="size-4" /> {t("mark.checking")}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ActionNotice
        key={state}
        tone={state === "added" ? "success" : state === "already" ? "info" : "removed"}
        title={t(`mark.${kind}.${state}`)}
        detail={target.title}
      />
      <div className="flex flex-wrap items-center gap-3">
        {state === "added" || state === "already" ? (
          <Button variant="secondary" disabled={busy} onClick={() => void undo()}>
            {state === "added" ? t("mark.undo") : t("mark.remove")}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onReset}>
          {t("chooseAnother")}
        </Button>
      </div>
    </div>
  );
}

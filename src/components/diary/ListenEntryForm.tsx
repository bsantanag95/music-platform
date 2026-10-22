"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ReactionPicker } from "./ReactionPicker";
import { updateListenEntry } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import { DIARY_BODY_MAX } from "@/services/diary/types";
import type {
  DiaryAudience,
  ListenContext,
  ListenEntry,
  ListenReaction,
  SocialTargetType,
} from "@/lib/api/schemas";

interface ListenEntryFormTarget {
  type: SocialTargetType;
  title: string;
  subtitle: string | null;
}

interface ListenEntryFormProps {
  entryId: string;
  // Este panel se reutiliza en vistas donde no queda claro a qué escucha
  // apunta (p. ej. Recorrido, con varios álbumes elegibles a la vista) —
  // muestra "Artista - Álbum/Canción" (o solo el nombre para un artista) como
  // recordatorio de contexto (revisión: "no hay información visual sobre qué
  // álbum está apuntando el panel").
  target: ListenEntryFormTarget;
  initial: {
    listenContext: ListenContext;
    body: string | null;
    reaction: ListenReaction | null;
    audience: DiaryAudience;
  };
  onSaved?: (entry: ListenEntry) => void;
  onCancel?: () => void;
  // Rótulo del objetivo arriba del panel. El diario propio lo apaga: la fila
  // ya dice qué es (openspec: redesign-diary-page, D9).
  showTarget?: boolean;
}

function formatTargetLabel(target: ListenEntryFormTarget): string {
  if (target.type === "artist" || !target.subtitle) return target.title;
  return `${target.subtitle} - ${target.title}`;
}

// Panel para ampliar o modificar una entrada del diario: impresión (≤500),
// contexto, reacción emocional y audiencia. Solo muta la entrada propia;
// nunca toca la valoración vigente del objetivo.
const LISTEN_CONTEXT_OPTIONS = ["first_listen", "relisten", "rediscovery"] as const;
// Desde este largo el contador se anuncia a lectores de pantalla; antes, solo
// se ve (anunciar cada tecla sería ruido).
const BODY_ANNOUNCE_FROM = 450;

export function ListenEntryForm({ entryId, target, initial, onSaved, onCancel, showTarget = true }: ListenEntryFormProps) {
  const t = useTranslations("diary");
  const [listenContext, setListenContext] = useState<ListenContext>(initial.listenContext);
  const [body, setBody] = useState(initial.body ?? "");
  const [reaction, setReaction] = useState<ListenReaction | null>(initial.reaction);
  const [audience, setAudience] = useState<DiaryAudience>(initial.audience);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // Confirmación visible de guardado: a diferencia de `DiaryActivityList`
  // (que cierra el panel al guardar y ya avisa con un destello propio), acá
  // el panel se queda abierto en el resto de los usos (Registrar global,
  // Recorrido, diario propio) y no había ninguna señal de éxito (revisión:
  // "el botón Guardar no despliega ningún mensaje de éxito").
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  // La audiencia sigue a la intención (openspec: deepen-listening-diary, D2):
  // una entrada que nace `private` (registro rápido) sube a `followers` en
  // cuanto gana una impresión o una reacción, y vuelve a `private` si se
  // quedan vacías — mientras el usuario no elija una audiencia a mano. En
  // cuanto la toca, `audienceTouched` congela la sugerencia. Las entradas que
  // ya venían con otra audiencia (viejas, o elegidas antes) no se tocan solas.
  const startedPrivate = useRef(initial.audience === "private").current;
  const [audienceTouched, setAudienceTouched] = useState(false);

  const chooseAudience = (next: DiaryAudience) => {
    setAudienceTouched(true);
    setAudience(next);
  };

  const hasIntent = body.trim() !== "" || reaction !== null;
  useEffect(() => {
    if (!startedPrivate || audienceTouched) return;
    setAudience(hasIntent ? "followers" : "private");
  }, [hasIntent, startedPrivate, audienceTouched]);

  const handleSubmit = async () => {
    setBusy(true);
    setErrorCode(null);
    setSaved(false);
    try {
      const entry = await updateListenEntry(entryId, {
        listenContext,
        body: body.trim() === "" ? null : body,
        reaction,
        audience,
      });
      onSaved?.(entry);
      setSaved(true);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-ink-border bg-ink-surface p-4">
      {showTarget ? (
        <p className="truncate font-data text-xs uppercase tracking-wide text-paper-muted">
          {formatTargetLabel(target)}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className="font-data text-sm text-paper">{t("bodyLabel")}</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              // Ctrl/⌘+Enter guarda sin salir del campo (D9).
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !busy) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            maxLength={DIARY_BODY_MAX}
            rows={3}
            className="rounded-md border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
          />
        </label>
        <div className="flex items-baseline justify-between gap-3 font-data text-xs text-paper-muted">
          <span>{t("saveShortcut")}</span>
          <span
            aria-live={body.length >= BODY_ANNOUNCE_FROM ? "polite" : "off"}
            className={body.length >= BODY_ANNOUNCE_FROM ? "text-amber" : undefined}
          >
            {t("characterCount", { count: body.length, max: DIARY_BODY_MAX })}
          </span>
        </div>
      </div>

      {/* Contexto con la misma forma que la audiencia: opciones siempre
          visibles de selección única, no un desplegable (D9). */}
      <fieldset>
        <legend className="font-data text-sm text-paper">{t("contextLabel")}</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {LISTEN_CONTEXT_OPTIONS.map((option) => (
            <label
              key={option}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 font-data text-xs transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber ${
                listenContext === option
                  ? "border-amber bg-amber/10 text-paper"
                  : "border-ink-border bg-ink text-paper-muted hover:text-paper"
              }`}
            >
              <input
                type="radio"
                name={`context-${entryId}`}
                className="sr-only"
                checked={listenContext === option}
                onChange={() => setListenContext(option as ListenContext)}
              />
              {t(`context.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <ReactionPicker
        name={`reaction-${entryId}`}
        value={reaction}
        onChange={setReaction}
      />

      <fieldset>
        <legend className="font-data text-sm text-paper">{t("audienceLabel")}</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {(["private", "followers", "public"] as const).map((option) => (
            <label
              key={option}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 font-data text-xs transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber ${
                audience === option
                  ? "border-amber bg-amber/10 text-paper"
                  : "border-ink-border bg-ink text-paper-muted hover:text-paper"
              }`}
            >
              <input
                type="radio"
                name={`audience-${entryId}`}
                className="sr-only"
                checked={audience === option}
                onChange={() => chooseAudience(option)}
              />
              {t(`audience.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <Button variant="primary" disabled={busy} onClick={() => void handleSubmit()}>
          {busy ? t("saving") : t("save")}
        </Button>
        {onCancel ? (
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {t("saveError")}
          </span>
        )}
        {saved && !errorCode && (
          <span role="status" className="font-data text-xs text-petrol">
            {t("savedAnnouncement")}
          </span>
        )}
      </div>
    </div>
  );
}
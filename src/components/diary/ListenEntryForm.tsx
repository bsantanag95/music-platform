"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ReactionPicker } from "./ReactionPicker";
import { updateListenEntry } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import type {
  DiaryAudience,
  ListenContext,
  ListenEntry,
  ListenReaction,
} from "@/lib/api/schemas";

interface ListenEntryFormProps {
  entryId: string;
  initial: {
    listenContext: ListenContext;
    body: string | null;
    reaction: ListenReaction | null;
    audience: DiaryAudience;
  };
  onSaved?: (entry: ListenEntry) => void;
  onCancel?: () => void;
}

// Panel para ampliar o modificar una entrada del diario: impresión (≤500),
// contexto, reacción emocional y audiencia. Solo muta la entrada propia;
// nunca toca la valoración vigente del objetivo.
export function ListenEntryForm({ entryId, initial, onSaved, onCancel }: ListenEntryFormProps) {
  const t = useTranslations("diary");
  const [listenContext, setListenContext] = useState<ListenContext>(initial.listenContext);
  const [body, setBody] = useState(initial.body ?? "");
  const [reaction, setReaction] = useState<ListenReaction | null>(initial.reaction);
  const [audience, setAudience] = useState<DiaryAudience>(initial.audience);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleSubmit = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const entry = await updateListenEntry(entryId, {
        listenContext,
        body: body.trim() === "" ? null : body,
        reaction,
        audience,
      });
      onSaved?.(entry);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-ink-border bg-ink-surface p-4">
      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className="font-data text-sm text-paper">{t("bodyLabel")}</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={500}
            rows={3}
            className="rounded-md border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
          />
        </label>
        <span className="font-data text-xs text-paper-muted">{t("bodyMax")}</span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-data text-sm text-paper">{t("contextLabel")}</span>
        <select
          value={listenContext}
          onChange={(event) => setListenContext(event.target.value as ListenContext)}
          className="rounded-md border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper"
        >
          <option value="first_listen">{t("context.first_listen")}</option>
          <option value="relisten">{t("context.relisten")}</option>
          <option value="rediscovery">{t("context.rediscovery")}</option>
        </select>
      </label>

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
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 font-data text-xs transition-colors ${
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
                onChange={() => setAudience(option)}
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
            {t("collapse")}
          </Button>
        ) : null}
        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {t("saveError")}
          </span>
        )}
      </div>
    </div>
  );
}
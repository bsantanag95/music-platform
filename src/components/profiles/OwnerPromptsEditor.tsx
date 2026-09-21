"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { PromptsResponseSchema } from "@/lib/api/schemas";
import { MUSIC_IDENTITY_LIMITS, PROMPT_KEYS, type ProfilePromptData, type PromptKey } from "@/lib/music-identity";
import { useNotifySaved, useReportDirty, type EditorHostCallbacks } from "./editor-host";

interface PromptRow {
  /** Identidad de la fila en pantalla: cambiar la pregunta no debe remontar el campo ni perder el foco. */
  uid: number;
  promptKey: PromptKey;
  answer: string;
}

type PromptValues = Pick<PromptRow, "promptKey" | "answer">;

interface OwnerPromptsEditorProps extends EditorHostCallbacks {
  initial: ProfilePromptData[];
}

const toValues = (prompts: ProfilePromptData[]): PromptValues[] =>
  [...prompts].sort((a, b) => a.position - b.position).map(({ promptKey, answer }) => ({ promptKey, answer }));

const sameRows = (a: PromptValues[], b: PromptValues[]) =>
  a.length === b.length && a.every((row, i) => row.promptKey === b[i]!.promptKey && row.answer.trim() === b[i]!.answer.trim());

const FIELD =
  "rounded border border-ink-border bg-ink-surface px-3 py-2 font-body text-paper placeholder:text-paper-muted";

// Editor de las preguntas del perfil (spec profile-music-identity): hasta 3, cada
// una de una lista cerrada y respondida en una línea de hasta 100 caracteres.
// Guarda el conjunto completo con PUT /api/me/profile/prompts, en el orden en que
// se ven acá. Una pregunta no puede repetirse: cada selector solo ofrece las que
// no eligió otra fila.
export function OwnerPromptsEditor({ initial, onSaved, onDirtyChange }: OwnerPromptsEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const notifySaved = useNotifySaved(onSaved);
  const baseId = useId();
  const nextUid = useRef(0);
  const withUid = (values: PromptValues[]): PromptRow[] => values.map((value) => ({ ...value, uid: nextUid.current++ }));
  const [rows, setRows] = useState<PromptRow[]>(() => withUid(toValues(initial)));
  const [baseline, setBaseline] = useState<PromptValues[]>(() => toValues(initial));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [emptyAnswer, setEmptyAnswer] = useState(false);

  const dirty = !sameRows(rows, baseline);
  useReportDirty(dirty, onDirtyChange);

  const max = MUSIC_IDENTITY_LIMITS.prompts;
  const used = new Set(rows.map((row) => row.promptKey));
  const nextFree = PROMPT_KEYS.find((key) => !used.has(key));

  function update(index: number, patch: Partial<PromptRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setStatus("idle");
    setEmptyAnswer(false);
  }

  async function save() {
    // Una respuesta vacía se rechaza acá con un mensaje claro en vez de esperar al servidor.
    if (rows.some((row) => row.answer.trim().length === 0)) {
      setEmptyAnswer(true);
      return;
    }
    setStatus("saving");
    setErrorCode(null);
    try {
      const saved = await apiFetch("/api/me/profile/prompts", PromptsResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: rows.map((row) => ({ promptKey: row.promptKey, answer: row.answer.trim() })) }),
      });
      const next = toValues(saved.prompts);
      setBaseline(next);
      setRows(withUid(next));
      setStatus("saved");
      notifySaved();
    } catch (error) {
      setStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-sm text-paper-muted">{t("musicIdentity.editor.promptsTitle")}</h3>
        <p className="font-body text-xs text-paper-muted">
          {t("musicIdentity.editor.promptsHint", { max, chars: MUSIC_IDENTITY_LIMITS.promptAnswer })}
        </p>
      </div>

      {rows.map((row, index) => {
        const selectId = `${baseId}-q-${index}`;
        const answerId = `${baseId}-a-${index}`;
        const question = t(`musicIdentity.prompts.${row.promptKey}.question`);
        return (
          <div key={row.uid} className="flex flex-col gap-2 rounded border border-ink-border p-3">
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor={selectId} className="font-display text-sm text-paper-muted">
                  {t("musicIdentity.editor.questionLabel")}
                </label>
                <select
                  id={selectId}
                  value={row.promptKey}
                  onChange={(event) => update(index, { promptKey: event.target.value as PromptKey })}
                  className={`${FIELD} filter-select`}
                >
                  {PROMPT_KEYS.filter((key) => key === row.promptKey || !used.has(key)).map((key) => (
                    <option key={key} value={key}>
                      {t(`musicIdentity.prompts.${key}.question`)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                aria-label={t("musicIdentity.editor.removePrompt", { question })}
                onClick={() => {
                  setRows((prev) => prev.filter((_, i) => i !== index));
                  setStatus("idle");
                  setEmptyAnswer(false);
                }}
                className="rounded border border-ink-border px-3 py-2 font-data text-xs text-paper-muted transition-colors hover:border-danger hover:text-danger"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={answerId} className="font-display text-sm text-paper-muted">
                {t("musicIdentity.editor.answerLabel")}
              </label>
              <input
                id={answerId}
                value={row.answer}
                maxLength={MUSIC_IDENTITY_LIMITS.promptAnswer}
                placeholder={t("musicIdentity.editor.answerPlaceholder")}
                onChange={(event) => update(index, { answer: event.target.value.replace(/[\r\n]+/g, " ") })}
                className={FIELD}
              />
              <p className="text-right font-data text-xs text-paper-muted">
                {row.answer.length}/{MUSIC_IDENTITY_LIMITS.promptAnswer}
              </p>
            </div>
          </div>
        );
      })}

      {rows.length < max && nextFree && (
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRows((prev) => [...prev, { uid: nextUid.current++, promptKey: nextFree, answer: "" }]);
              setStatus("idle");
            }}
          >
            {t("musicIdentity.editor.addPrompt")}
          </Button>
        </div>
      )}

      {emptyAnswer && (
        <p role="alert" className="font-data text-xs text-danger">
          {t("musicIdentity.editor.emptyAnswer")}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "saving" || !dirty}>
          {status === "saving" ? t("edit.saving") : t("edit.save")}
        </Button>
        {status === "saved" && (
          <span role="status" className="font-data text-xs text-petrol-hover">
            {t("edit.saved")}
          </span>
        )}
        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {tErrors(`${errorCode}.description`)}
          </span>
        )}
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useOwnerEdit } from "./OwnerEditProvider";

export type CompletionKey = "photo" | "bio" | "identityCard" | "ficha" | "showcase" | "prompts" | "links";

export interface CompletionPart {
  key: CompletionKey;
  done: boolean;
  /** Panel del bloque que contiene la parte: el mismo que abre su lápiz. */
  panel: { title: string; editor: ReactNode };
}

/** Preferencia de vista por dispositivo; la Política de cookies la describe (almacenamiento local). */
export const COMPLETION_HIDDEN_KEY = "profile-completion-hidden";

// Franja «Tu perfil · N de 7» (spec social-profiles, "Franja «Tu perfil» del dueño"; openspec
// redesign-owner-profile-phase3). Solo se monta para el dueño fuera de la vista previa, dentro de
// `OwnerEditProvider`: lo pendiente abre el panel de su bloque sin activar el modo edición. Con
// todo completo no se dibuja. «Ocultar» se recuerda en el almacenamiento local y se lee tras montar,
// así que la franja aparece después de hidratar en vez de parpadear.
export function ProfileCompletion({ parts }: { parts: CompletionPart[] }) {
  const t = useTranslations("users");
  const ownerEdit = useOwnerEdit();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(COMPLETION_HIDDEN_KEY);
    } catch {
      // Sin almacenamiento disponible la franja se muestra igual.
    }
    setHidden(stored === "1");
  }, []);

  const done = parts.filter((part) => part.done).length;
  if (!ownerEdit || hidden || done === parts.length) return null;

  function hide() {
    setHidden(true);
    try {
      window.localStorage.setItem(COMPLETION_HIDDEN_KEY, "1");
    } catch {
      // Sin almacenamiento solo se oculta en esta visita.
    }
  }

  return (
    <section
      aria-labelledby="profile-completion"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-ink-border py-4"
    >
      <h2 id="profile-completion" className="font-display text-sm font-semibold text-paper">
        {t("completion.title", { done, total: parts.length })}
      </h2>
      <span
        role="progressbar"
        aria-label={t("completion.progress")}
        aria-valuemin={0}
        aria-valuemax={parts.length}
        aria-valuenow={done}
        className="h-1.5 w-28 overflow-hidden rounded-full bg-ink-border"
      >
        <span className="block h-full bg-amber" style={{ width: `${(done / parts.length) * 100}%` }} />
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {parts.map((part) =>
          part.done ? (
            <li
              key={part.key}
              // En teléfono solo lo pendiente: el conteo y la barra ya dicen cuánto está hecho.
              className="hidden h-8 items-center gap-1.5 rounded-full border border-dashed border-ink-border px-3 font-data text-xs text-paper-muted sm:inline-flex"
            >
              <span aria-hidden="true" className="text-petrol-hover">
                ✓
              </span>
              <span className="sr-only">{t("completion.doneLabel")} </span>
              {t(`completion.part.${part.key}`)}
            </li>
          ) : (
            <li key={part.key}>
              <button
                type="button"
                onClick={(event) =>
                  ownerEdit.openEditor({ ...part.panel, trigger: event.currentTarget })
                }
                className="inline-flex h-8 items-center gap-1 rounded-full border border-amber/60 px-3 font-data text-xs text-amber transition-colors hover:border-amber hover:text-amber-hover"
              >
                <span aria-hidden="true">+</span>
                {t(`completion.part.${part.key}`)}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        onClick={hide}
        className="ml-auto font-data text-xs text-paper-muted transition-colors hover:text-paper"
      >
        {t("completion.hide")}
      </button>
    </section>
  );
}

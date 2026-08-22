"use client";

import { useTranslations } from "next-intl";
import { REACTION_ICONS } from "./ReactionIcons";
import type { ListenReaction } from "@/lib/api/schemas";

interface ReactionPickerProps {
  value: ListenReaction | null;
  onChange: (value: ListenReaction | null) => void;
  name: string;
}

const REACTIONS: Array<ListenReaction> = ["liked", "loved", "obsessed", "neutral", "disliked"];

// Selector de reacción emocional: texto localizado siempre visible y un
// icono de refuerzo. `null` (ausencia de dato) es una opción explícita
// distinta de `neutral` (elección de neutralidad). Radio group accesible.
export function ReactionPicker({ value, onChange, name }: ReactionPickerProps) {
  const t = useTranslations("diary");
  return (
    <fieldset>
      <legend className="font-data text-sm text-paper">{t("reactionLabel")}</legend>
      <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("reactionLabel")}>
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 font-data text-xs transition-colors ${
            value === null
              ? "border-amber bg-amber/10 text-paper"
              : "border-ink-border bg-ink-surface text-paper-muted hover:text-paper"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === null}
            onChange={() => onChange(null)}
          />
          {t("reaction.none")}
        </label>
        {REACTIONS.map((reaction) => (
          <label
            key={reaction}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 font-data text-xs transition-colors ${
              value === reaction
                ? "border-amber bg-amber/10 text-paper"
                : "border-ink-border bg-ink-surface text-paper-muted hover:text-paper"
            }`}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === reaction}
              onChange={() => onChange(reaction)}
            />
            <span aria-hidden="true" className="text-paper-muted">
              {REACTION_ICONS[reaction]}
            </span>
            {t(`reaction.${reaction}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
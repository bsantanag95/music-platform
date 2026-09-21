"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  ApplyAudiencePreviewSchema,
  ApplyAudienceResultSchema,
  OwnProfileResponseSchema,
  type ApplyAudiencePreview,
  type DefaultAudience,
} from "@/lib/api/schemas";
import { useRouter } from "@/i18n/navigation";

interface DefaultAudienceSettingsProps {
  /** Preferencia actual; `null` = "según el tipo". */
  initialAudience: DefaultAudience | null;
}

type Choice = DefaultAudience | "auto";

const CHOICES: readonly Choice[] = ["auto", "private", "followers", "public"];

type Phase = "idle" | "checking" | "confirming" | "applying";

// Tipos de contenido que cambian y, de ellos, los fijados o destacados que se avisan.
const TYPE_KEYS = ["favorites", "diary", "lists", "collection"] as const;
const HIGHLIGHT_KEYS = ["pinnedLists", "pinnedAlbumFavorites", "highlightedDiary"] as const;
type CountKey = (typeof TYPE_KEYS)[number] | (typeof HIGHLIGHT_KEYS)[number];

// Audiencia por defecto del contenido nuevo (spec default-audience, "Control de
// audiencia por defecto en Ajustes"). Cuatro opciones: "Según el tipo" (sin
// valor, `null`) y las tres audiencias. Persiste al elegir vía PATCH
// /api/me/profile. Elegir la opción solo afecta al contenido que se cree
// después: lo existente solo cambia con "Aplicar a lo existente", una acción
// aparte con vista previa y confirmación (spec default-audience, "Acción
// «Aplicar a lo existente» en Ajustes").
export function DefaultAudienceSettings({ initialAudience }: DefaultAudienceSettingsProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const hintId = useId();
  const [choice, setChoice] = useState<Choice>(initialAudience ?? "auto");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<ApplyAudiencePreview | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const busy = saving || phase !== "idle";

  async function select(next: Choice) {
    if (next === choice || saving) return;
    setSaving(true);
    setSaved(false);
    setOutcome(null);
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile", OwnProfileResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAudience: next === "auto" ? null : next }),
      });
      setChoice(data.user.defaultAudience ?? "auto");
      setSaved(true);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setSaving(false);
    }
  }

  const audienceLabel = (audience: DefaultAudience) => t(`settings.privacy.audience.apply.audience.${audience}`);

  // "3 favoritos, 2 listas": solo los tipos con elementos.
  function describe(counts: Partial<Record<CountKey, number>>, keys: readonly CountKey[]) {
    return keys
      .filter((key) => (counts[key] ?? 0) > 0)
      .map((key) => t(`settings.privacy.audience.apply.parts.${key}`, { count: counts[key] ?? 0 }))
      .join(", ");
  }

  async function requestPreview() {
    if (choice === "auto" || busy) return;
    setPhase("checking");
    setSaved(false);
    setOutcome(null);
    setErrorCode(null);
    try {
      const data = await apiFetch(
        `/api/me/default-audience/apply?audience=${choice}`,
        ApplyAudiencePreviewSchema,
      );
      const total = TYPE_KEYS.reduce((sum, key) => sum + data[key], 0);
      if (total === 0) {
        setOutcome(t("settings.privacy.audience.apply.nothing", { audience: audienceLabel(data.audience) }));
        setPhase("idle");
        return;
      }
      setPreview(data);
      setPhase("confirming");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      setPhase("idle");
    }
  }

  function cancelConfirm() {
    setPreview(null);
    setPhase("idle");
  }

  async function confirmApply() {
    if (!preview) return;
    const { audience } = preview;
    setPhase("applying");
    setPreview(null);
    try {
      const result = await apiFetch("/api/me/default-audience/apply", ApplyAudienceResultSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience }),
      });
      const items = describe(result, TYPE_KEYS);
      setOutcome(
        items
          ? t("settings.privacy.audience.apply.result", { items, audience: audienceLabel(result.audience) })
          : t("settings.privacy.audience.apply.nothing", { audience: audienceLabel(result.audience) }),
      );
      router.refresh();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPhase("idle");
    }
  }

  function confirmMessage(data: ApplyAudiencePreview) {
    const paragraphs = [
      t("settings.privacy.audience.apply.confirm.summary", {
        items: describe(data, TYPE_KEYS),
        audience: audienceLabel(data.audience),
      }),
    ];
    const highlighted = describe(data.highlighted, HIGHLIGHT_KEYS);
    if (highlighted) {
      paragraphs.push(t("settings.privacy.audience.apply.confirm.highlighted", { items: highlighted }));
      if (data.highlighted.highlightedDiary > 0) {
        paragraphs.push(t("settings.privacy.audience.apply.confirm.diaryHighlightedVisible"));
      }
      if (data.audience !== "public" && data.highlighted.pinnedLists + data.highlighted.pinnedAlbumFavorites > 0) {
        paragraphs.push(t("settings.privacy.audience.apply.confirm.pinnedHidden"));
      }
    }
    return paragraphs.join("\n\n");
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-sm text-paper-muted">{t("settings.privacy.audience.title")}</legend>
        <p className="font-body text-xs text-paper-muted">{t("settings.privacy.audience.intro")}</p>
        <p className="border-l-2 border-ink-border pl-3 font-body text-xs text-paper-muted">
          {t("settings.privacy.audience.excluded")}
        </p>
        {CHOICES.map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
              choice === value ? "border-amber bg-ink-surface" : "border-ink-border bg-ink-surface"
            }`}
          >
            <input
              type="radio"
              name="defaultAudience"
              value={value}
              checked={choice === value}
              disabled={busy}
              onChange={() => void select(value)}
              className="mt-1 accent-amber"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-sm text-paper">
                {t(`settings.privacy.audience.options.${value}.title`)}
              </span>
              <span className="font-body text-xs text-paper-muted">
                {t(`settings.privacy.audience.options.${value}.description`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2 border-t border-ink-border pt-4">
        <button
          type="button"
          onClick={() => void requestPreview()}
          disabled={choice === "auto" || busy}
          aria-describedby={hintId}
          className="self-start rounded border border-ink-border px-3 py-2 font-data text-xs text-paper transition-colors hover:border-amber disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-border"
        >
          {t("settings.privacy.audience.apply.button")}
        </button>
        <p id={hintId} className="font-body text-xs text-paper-muted">
          {choice === "auto"
            ? t("settings.privacy.audience.apply.disabledHint")
            : t("settings.privacy.audience.apply.hint")}
        </p>
      </div>

      {(saving || phase === "checking" || phase === "applying") && (
        <p className="text-sm text-paper-muted" role="status">
          {saving
            ? t("savingPrivacy")
            : phase === "checking"
              ? t("settings.privacy.audience.apply.checking")
              : t("settings.privacy.audience.apply.applying")}
        </p>
      )}
      {saved && !saving && (
        <p className="font-data text-xs text-petrol-hover" role="status">
          {t("edit.saved")}
        </p>
      )}
      {outcome && phase === "idle" && (
        <p className="font-data text-xs text-petrol-hover" role="status">
          {outcome}
        </p>
      )}
      {errorCode && (
        <p className="text-sm text-danger" role="alert">
          {tErrors(`${errorCode}.description`)}
        </p>
      )}

      <ConfirmDialog
        open={preview !== null}
        title={
          preview
            ? t("settings.privacy.audience.apply.confirm.title", { audience: audienceLabel(preview.audience) })
            : ""
        }
        message={preview ? confirmMessage(preview) : ""}
        confirmLabel={t("settings.privacy.audience.apply.confirm.confirm")}
        cancelLabel={t("settings.privacy.audience.apply.confirm.cancel")}
        onConfirm={() => void confirmApply()}
        onCancel={cancelConfirm}
      />
    </div>
  );
}

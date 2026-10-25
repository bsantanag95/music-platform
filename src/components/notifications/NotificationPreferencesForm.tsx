"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, apiFetch } from "@/lib/api/client";
import {
  NotificationPreferencesResponseSchema,
  type NotificationKindValue,
  type NotificationPreferencesValue,
} from "@/lib/api/schemas";

// Tipos que la persona puede apagar y tipos fijos (openspec: add-notifications-core,
// D9; add-notification-milestones-and-releases, D1 y D8). Los fijos se listan con
// su explicación en vez de un interruptor deshabilitado: no es una preferencia
// apagada, es que no existe. Las secciones siguen las pestañas de la bandeja.
const FOR_YOU_KINDS = [
  "comment_reply",
  "thread_reply",
  "new_follower",
  "follow_accepted",
  "comment_like_milestone",
  "list_save_milestone",
] as const satisfies readonly NotificationKindValue[];

const RELEASE_KINDS = [
  "artist_release",
  "artist_release_announced",
  "artist_single",
] as const satisfies readonly NotificationKindValue[];

const FIXED_KINDS = ["follow_request", "moderation"] as const satisfies readonly NotificationKindValue[];

interface NotificationPreferencesFormProps {
  initial: NotificationPreferencesValue;
}

// Interruptores por tipo. Cada cambio se guarda solo (no hay botón "Guardar"):
// la respuesta trae las preferencias completas ya aplicadas, así el estado local
// nunca diverge de lo que quedó en la base.
export function NotificationPreferencesForm({ initial }: NotificationPreferencesFormProps) {
  const t = useTranslations("notifications");
  const tErrors = useTranslations("errors");
  const [preferences, setPreferences] = useState(initial);
  const [pending, setPending] = useState<NotificationKindValue | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const toggle = async (kind: NotificationKindValue, next: boolean) => {
    setPending(kind);
    setErrorCode(null);
    setPreferences((current) => ({ ...current, [kind]: next }));
    try {
      const result = await apiFetch(
        "/api/me/notification-preferences",
        NotificationPreferencesResponseSchema,
        {
          method: "PUT",
          body: JSON.stringify({ preferences: { [kind]: next } }),
        },
      );
      setPreferences(result.preferences);
    } catch (error) {
      // Sin conexión o rechazo del servidor: el interruptor vuelve a donde estaba.
      setPreferences((current) => ({ ...current, [kind]: !next }));
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(null);
    }
  };

  const switchFor = (kind: NotificationKindValue) => {
    const checked = preferences[kind];
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${kind}-label`}
        aria-describedby={`${kind}-description`}
        disabled={pending === kind}
        onClick={() => void toggle(kind, !checked)}
        className={`mt-0.5 inline-flex shrink-0 rounded-full border py-1 transition-colors disabled:cursor-wait disabled:opacity-60 ${
          checked ? "border-amber pl-3.5 pr-1.5" : "border-ink-border pl-1.5 pr-3.5"
        }`}
      >
        <span
          aria-hidden="true"
          className={`relative block h-5 w-9 rounded-full transition-colors ${
            checked ? "bg-amber" : "bg-ink-border"
          }`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full transition-[left] ${
              checked ? "left-[1.125rem] bg-ink" : "left-0.5 bg-paper"
            }`}
          />
        </span>
      </button>
    );
  };

  const labelFor = (kind: NotificationKindValue) => (
    <span className="min-w-0">
      <span id={`${kind}-label`} className="block font-display text-sm text-paper">
        {t(`settings.kinds.${kind}`)}
      </span>
      <span
        id={`${kind}-description`}
        className="mt-0.5 block font-body text-xs text-paper-muted"
      >
        {t(`settings.descriptions.${kind}`)}
      </span>
    </span>
  );

  const optionalList = (kinds: readonly NotificationKindValue[]) => (
    <ul className="flex flex-col divide-y divide-ink-border">
      {kinds.map((kind) => (
        <li key={kind} className="flex items-start justify-between gap-4 py-3 first:pt-0">
          {labelFor(kind)}
          {switchFor(kind)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="font-display text-sm text-paper">{t("settings.sections.forYou")}</h3>
        {optionalList(FOR_YOU_KINDS)}
        <ul className="flex flex-col divide-y divide-ink-border border-t border-ink-border">
          {FIXED_KINDS.map((kind) => (
            <li key={kind} className="flex items-start justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block font-display text-sm text-paper">
                  {t(`settings.kinds.${kind}`)}
                </span>
                <span className="mt-0.5 block font-body text-xs text-paper-muted">
                  {t(`settings.descriptions.${kind}`)}
                </span>
              </span>
              <span className="mt-0.5 shrink-0 font-data text-xs text-paper-muted">
                {t("settings.fixed")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-display text-sm text-paper">{t("settings.sections.releases")}</h3>
        {optionalList(RELEASE_KINDS)}
      </section>

      {errorCode ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("settings.saveError")} {tErrors(`${errorCode}.description`)}
        </p>
      ) : null}
    </div>
  );
}

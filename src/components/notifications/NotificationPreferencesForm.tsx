"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import {
  NotificationPreferencesResponseSchema,
  type NotificationKindValue,
  type NotificationPreferencesResponse,
  type OptionalNotificationKindValue,
} from "@/lib/api/schemas";
import { useRouter } from "@/i18n/navigation";

// Tipos que la persona puede apagar y tipos fijos (openspec: add-notifications-core,
// D9; add-notification-milestones-and-releases, D1 y D8;
// add-notification-digest-and-awards, D8). Los fijos se listan con su explicación
// en vez de un interruptor deshabilitado: no es una preferencia apagada, es que no
// existe. Las secciones siguen las pestañas de la bandeja; los premios van en
// "Novedades" con una sola clave (`artist_award`) para las dos clases de aviso.
const FOR_YOU_KINDS = [
  "comment_reply",
  "thread_reply",
  "new_follower",
  "follow_accepted",
  "comment_like_milestone",
  "list_save_milestone",
] as const satisfies readonly OptionalNotificationKindValue[];

const RELEASE_KINDS = [
  "artist_release",
  "artist_release_announced",
  "artist_single",
  "artist_award",
] as const satisfies readonly OptionalNotificationKindValue[];

const FIXED_KINDS = ["follow_request", "moderation"] as const satisfies readonly NotificationKindValue[];

interface NotificationPreferencesFormProps {
  /** Preferencias, opt-in del resumen y si el email está verificado (D8). */
  initial: NotificationPreferencesResponse;
}

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
  onToggle: () => void;
}

/** Interruptor accesible compartido por los tipos y el resumen semanal. */
function Switch({ checked, disabled = false, labelledBy, describedBy, onToggle }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onToggle}
      className={`mt-0.5 inline-flex shrink-0 rounded-full border py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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
}

// Interruptores por tipo y del resumen semanal. Cada cambio se guarda solo (no
// hay botón "Guardar"): la respuesta trae el estado completo ya aplicado, así el
// local nunca diverge de lo que quedó en la base. Sin el email verificado el
// resumen no se puede activar (409 EMAIL_NOT_VERIFIED); el interruptor queda
// deshabilitado y se ofrece verificarlo.
export function NotificationPreferencesForm({ initial }: NotificationPreferencesFormProps) {
  const router = useRouter();
  const t = useTranslations("notifications");
  const tErrors = useTranslations("errors");
  const [preferences, setPreferences] = useState(initial.preferences);
  const [emailDigest, setEmailDigest] = useState(initial.emailDigest);
  const emailVerified = initial.emailVerified;
  const [pending, setPending] = useState<OptionalNotificationKindValue | "emailDigest" | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const adopt = (result: NotificationPreferencesResponse) => {
    setPreferences(result.preferences);
    setEmailDigest(result.emailDigest);
  };

  const toggle = async (kind: OptionalNotificationKindValue, next: boolean) => {
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
      adopt(result);
    } catch (error) {
      // Sin conexión o rechazo del servidor: el interruptor vuelve a donde estaba.
      setPreferences((current) => ({ ...current, [kind]: !next }));
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(null);
    }
  };

  const toggleDigest = async (next: boolean) => {
    setPending("emailDigest");
    setErrorCode(null);
    setEmailDigest(next);
    try {
      const result = await apiFetch(
        "/api/me/notification-preferences",
        NotificationPreferencesResponseSchema,
        {
          method: "PUT",
          body: JSON.stringify({ emailDigest: next }),
        },
      );
      adopt(result);
      // El menú de Ajustes dice si el resumen está activo, desde el layout (polish-settings-overview, D2).
      router.refresh();
    } catch (error) {
      setEmailDigest(!next);
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(null);
    }
  };

  const labelFor = (kind: OptionalNotificationKindValue | NotificationKindValue) => (
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

  const optionalList = (kinds: readonly OptionalNotificationKindValue[]) => (
    <ul className="flex flex-col divide-y divide-ink-border">
      {kinds.map((kind) => (
        <li key={kind} className="flex items-start justify-between gap-4 py-3 first:pt-0">
          {labelFor(kind)}
          <Switch
            checked={preferences[kind]}
            disabled={pending === kind}
            labelledBy={`${kind}-label`}
            describedBy={`${kind}-description`}
            onToggle={() => void toggle(kind, !preferences[kind])}
          />
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

      <section className="flex flex-col gap-2">
        <h3 className="font-display text-sm text-paper">{t("settings.sections.email")}</h3>
        <div className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span id="emailDigest-label" className="block font-display text-sm text-paper">
              {t("settings.digest.label")}
            </span>
            <span
              id="emailDigest-description"
              className="mt-0.5 block font-body text-xs text-paper-muted"
            >
              {t("settings.digest.description")}
            </span>
            {!emailVerified ? (
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-xs text-paper-muted">
                {t("settings.digest.needsVerification")}
                <Link
                  href="/me/settings/account"
                  className="font-display text-amber underline-offset-4 hover:underline"
                >
                  {t("settings.digest.verify")}
                </Link>
              </span>
            ) : null}
          </span>
          <Switch
            checked={emailDigest}
            disabled={!emailVerified || pending === "emailDigest"}
            labelledBy="emailDigest-label"
            describedBy="emailDigest-description"
            onToggle={() => void toggleDigest(!emailDigest)}
          />
        </div>
      </section>

      {errorCode ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("settings.saveError")} {tErrors(`${errorCode}.description`)}
        </p>
      ) : null}
    </div>
  );
}

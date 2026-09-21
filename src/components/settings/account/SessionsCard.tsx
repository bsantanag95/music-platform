"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { SettingsCard } from "@/components/settings/SettingsSection";
import { RevokeSessionsButton } from "@/components/settings/RevokeSessionsButton";
import { apiFetch, ApiError } from "@/lib/api/client";
import { NoContentSchema, type SessionSummaryDto } from "@/lib/api/schemas";
import { knownErrorCode } from "./parts";

interface SessionsCardProps {
  sessions: SessionSummaryDto[];
}

// Una sesión cuenta como "activa ahora" si se vio en los últimos 5 minutos.
const ACTIVE_NOW_MS = 5 * 60 * 1000;

// Tarjeta "Sesiones activas" (spec session-management y owner-settings): cada
// dispositivo con sesión abierta, "Cerrar" en los que no son este y el cierre de
// todas las sesiones existente debajo. Nunca hay controles sobre la sesión
// actual: para salir de ella está cerrar sesión.
export function SessionsCard({ sessions: initial }: SessionsCardProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const [sessions, setSessions] = useState(initial);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function close(id: string) {
    setClosingId(id);
    setErrorCode(null);
    try {
      await apiFetch(`/api/me/sessions/${id}`, NoContentSchema, { method: "DELETE" });
      setSessions((list) => list.filter((item) => item.id !== id));
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setClosingId(null);
    }
  }

  return (
    <SettingsCard>
      <h3 className="mb-1 font-display text-sm text-paper-muted">{t("settings.account.sessions.title")}</h3>
      <p className="mb-3 font-body text-xs text-paper-muted">{t("settings.account.sessions.hint")}</p>

      <ul className="flex flex-col">
        {sessions.map((item) => {
          const device = item.deviceLabel ?? t("settings.account.sessions.unknownDevice");
          const lastSeen = item.lastSeenAt ? new Date(item.lastSeenAt) : null;
          const activeNow = item.current || (lastSeen !== null && Date.now() - lastSeen.getTime() < ACTIVE_NOW_MS);
          return (
            <li key={item.id} className="flex items-center justify-between gap-4 border-t border-ink-border py-3 first:border-t-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-display text-base text-paper">
                  <span className="truncate">{device}</span>
                  {item.current && (
                    <span className="rounded-sm bg-petrol/20 px-1.5 py-0.5 font-data text-xs text-petrol-hover">
                      {t("settings.account.sessions.current")}
                    </span>
                  )}
                </div>
                <div className="font-data text-xs text-paper-muted">
                  {t("settings.account.sessions.startedOn", {
                    date: format.dateTime(new Date(item.createdAt), { dateStyle: "medium" }),
                  })}
                  {" · "}
                  {activeNow
                    ? t("settings.account.sessions.activeNow")
                    : lastSeen
                      ? t("settings.account.sessions.lastSeen", { when: format.relativeTime(lastSeen) })
                      : null}
                </div>
              </div>
              {!item.current && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={closingId === item.id}
                  aria-label={t("settings.account.sessions.closeLabel", { device })}
                  onClick={() => void close(item.id)}
                >
                  {t("settings.account.sessions.close")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {errorCode && (
        <p role="alert" className="mt-2 font-data text-xs text-danger">
          {tErrors(`${knownErrorCode(errorCode)}.description`)}
        </p>
      )}
      <div className="mt-4">
        <RevokeSessionsButton />
      </div>
    </SettingsCard>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { DisplayNameForm } from "@/components/settings/DisplayNameForm";
import { SettingsCard } from "@/components/settings/SettingsSection";
import { ChangeEmailDialog } from "./ChangeEmailDialog";
import { ChangeUsernameDialog } from "./ChangeUsernameDialog";

interface AccountDataCardProps {
  username: string;
  displayName: string | null;
  /** Fecha (ISO) en que se puede volver a cambiar el usuario; `null` si ya se puede. */
  usernameNextChangeAt: string | null;
  email: string;
  emailVerified: boolean;
  /** Email nuevo pedido y aún sin confirmar, si lo hay. */
  pendingEmail: string | null;
  hasPassword: boolean;
}

const ROW = "flex items-center justify-between gap-4 border-t border-ink-border py-3";
const LABEL = "font-data text-xs uppercase tracking-wide text-paper-muted";

// Tarjeta "Datos de la cuenta" (spec owner-settings, "Pantalla Cuenta y
// seguridad"): nombre visible (editor existente), usuario y email, con sus
// diálogos. El estado local refleja lo que acaba de cambiar sin esperar al
// refresco del servidor.
export function AccountDataCard({
  username: initialUsername,
  displayName,
  usernameNextChangeAt,
  email,
  emailVerified,
  pendingEmail: initialPendingEmail,
  hasPassword,
}: AccountDataCardProps) {
  const t = useTranslations("users");
  const [username, setUsername] = useState(initialUsername);
  const [nextChangeAt, setNextChangeAt] = useState(usernameNextChangeAt);
  const [pendingEmail, setPendingEmail] = useState(initialPendingEmail);
  const [dialog, setDialog] = useState<"username" | "email" | null>(null);

  return (
    <SettingsCard>
      <h3 className="mb-4 font-display text-sm text-paper-muted">{t("settings.account.data.title")}</h3>
      <DisplayNameForm initialDisplayName={displayName} username={username} />

      <div className="mt-4">
        <div className={ROW}>
          <div className="min-w-0">
            <div className={LABEL}>{t("settings.account.username.title")}</div>
            <div className="truncate font-display text-base text-paper">@{username}</div>
            <div className="truncate font-data text-xs text-paper-muted">
              {t("settings.account.username.link", { username })}
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => setDialog("username")}>
            {t("settings.account.username.change")}
          </Button>
        </div>

        <div className={ROW}>
          <div className="min-w-0">
            <div className={LABEL}>{t("settings.account.email.title")}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-display text-base text-paper">{email}</span>
              <span
                className={`rounded-sm px-1.5 py-0.5 font-data text-xs ${
                  emailVerified ? "bg-petrol/20 text-petrol-hover" : "bg-amber/15 text-amber"
                }`}
              >
                {emailVerified ? t("settings.account.email.verified") : t("settings.account.email.unverified")}
              </span>
            </div>
            {pendingEmail && (
              <p role="status" className="mt-1 font-body text-xs text-paper-muted">
                {t("settings.account.email.pending", { email: pendingEmail })}
              </p>
            )}
          </div>
          <Button type="button" variant="secondary" onClick={() => setDialog("email")}>
            {t("settings.account.email.change")}
          </Button>
        </div>
      </div>

      {/* Se montan solo abiertos: así cada apertura empieza con el formulario limpio. */}
      {dialog === "username" && (
        <ChangeUsernameDialog
          open
          onClose={() => setDialog(null)}
          currentUsername={username}
          nextChangeAt={nextChangeAt}
          onChanged={(next, at) => {
            setUsername(next);
            setNextChangeAt(at);
          }}
        />
      )}
      {dialog === "email" && (
        <ChangeEmailDialog
          open
          onClose={() => setDialog(null)}
          currentEmail={email}
          hasPassword={hasPassword}
          onRequested={setPendingEmail}
        />
      )}
    </SettingsCard>
  );
}

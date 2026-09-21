import { getTranslations } from "next-intl/server";
import { requirePageSession } from "@/services/auth/page-auth";
import { isEmailVerified } from "@/services/auth/email-verification";
import { getPendingEmailChange } from "@/services/auth/email-change";
import { listMySessions } from "@/services/auth/session-list";
import { getUsernameChangeStatus } from "@/services/auth/username";
import { getOwnProfile } from "@/services/social/profiles";
import { getAccessMethod } from "@/services/profiles/account-settings";
import { AccountDataCard } from "@/components/settings/account/AccountDataCard";
import { LanguagePreference } from "@/components/settings/account/LanguagePreference";
import { SessionsCard } from "@/components/settings/account/SessionsCard";
import { SignInCard, type GoogleFlash } from "@/components/settings/account/SignInCard";
import { SettingsSection } from "@/components/settings/SettingsSection";

// Códigos de error del flujo de Google que Ajustes sabe mostrar (conjunto
// cerrado: el query lo puede escribir cualquiera, así que nunca se usa tal cual).
const GOOGLE_FLASH_ERRORS = new Set(["OAUTH_IDENTITY_TAKEN", "OAUTH_IDENTITY_MISMATCH"]);

function parseGoogleFlash(google: string | undefined, code: string | undefined, googleLinked: boolean): GoogleFlash {
  // "Quedó vinculada" solo se afirma si lo está: el query puede ser viejo (una URL
  // guardada o una recarga anterior) y contradiría lo que muestra la tarjeta.
  if (google === "linked") return googleLinked ? { kind: "linked" } : null;
  if (google === "confirmed") return { kind: "confirmed" };
  if (google === "error") {
    return { kind: "error", code: code && GOOGLE_FLASH_ERRORS.has(code) ? code : "INTERNAL_ERROR" };
  }
  return null;
}

// Pantalla Cuenta y seguridad (specs owner-settings, account-username,
// account-credentials, session-management y account-preferences): datos de la
// cuenta, cómo se inicia sesión, sesiones por dispositivo y preferencias. Nada de
// esto se muestra a otras personas. Las acciones de las Fases 2 y 3 de
// `rework-account-settings` (desactivar, exportar, eliminar) llegan después.
export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; code?: string }>;
}) {
  const t = await getTranslations("users");
  const current = await requirePageSession();
  const { user } = current;
  const query = await searchParams;

  const [profile, access, sessions, usernameStatus, pendingEmail] = await Promise.all([
    getOwnProfile(user.id),
    getAccessMethod(user.id),
    listMySessions(user.id, current.sessionId),
    getUsernameChangeStatus(user.id),
    getPendingEmailChange(user.id),
  ]);

  return (
    <SettingsSection title={t("settings.account.title")} intro={t("settings.account.intro")}>
      <AccountDataCard
        username={profile.username}
        displayName={profile.displayName}
        usernameNextChangeAt={usernameStatus.nextChangeAt ? usernameStatus.nextChangeAt.toISOString() : null}
        email={user.email}
        emailVerified={isEmailVerified(user)}
        pendingEmail={pendingEmail?.newEmail ?? null}
        hasPassword={access.hasPassword}
      />
      <SignInCard
        hasPassword={access.hasPassword}
        googleLinked={access.providers.includes("google")}
        flash={parseGoogleFlash(query.google, query.code, access.providers.includes("google"))}
      />
      <SessionsCard
        sessions={sessions.map((item) => ({
          id: item.id,
          deviceLabel: item.deviceLabel,
          createdAt: item.createdAt.toISOString(),
          lastSeenAt: item.lastSeenAt ? item.lastSeenAt.toISOString() : null,
          current: item.current,
        }))}
      />
      <LanguagePreference />
    </SettingsSection>
  );
}

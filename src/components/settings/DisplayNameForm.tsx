"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OwnProfileResponseSchema } from "@/lib/api/schemas";
import { useRouter } from "@/i18n/navigation";
import { PROFILE_IDENTITY_LIMITS } from "@/services/social/types";

interface DisplayNameFormProps {
  /** Nombre visible actual; `null` = el sitio muestra el username. */
  initialDisplayName: string | null;
  username: string;
}

// Edición del nombre visible (spec owner-settings, "Pantalla Cuenta y
// seguridad"). Vaciarlo lo borra y el sitio vuelve a mostrar el @usuario.
// Persiste vía PATCH /api/me/profile y refresca el árbol de servidor para que
// el Header y el resto de superficies muestren el nombre nuevo.
export function DisplayNameForm({ initialDisplayName, username }: DisplayNameFormProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [baseline, setBaseline] = useState(initialDisplayName ?? "");
  const [value, setValue] = useState(initialDisplayName ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const dirty = value.trim() !== baseline;

  async function save() {
    setStatus("saving");
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile", OwnProfileResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: value.trim() }),
      });
      const saved = data.user.displayName ?? "";
      setBaseline(saved);
      setValue(saved);
      setStatus("saved");
      router.refresh();
    } catch (error) {
      setStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  return (
    <form
      className="flex max-w-xl flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Input
        label={t("settings.account.displayName.label")}
        value={value}
        maxLength={PROFILE_IDENTITY_LIMITS.displayName}
        placeholder={username}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("idle");
        }}
      />
      <p className="font-body text-xs text-paper-muted">{t("settings.account.displayName.help", { username })}</p>
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

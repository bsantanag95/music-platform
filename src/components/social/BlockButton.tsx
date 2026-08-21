"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { BlockedResponseSchema } from "@/lib/api/schemas";

interface BlockButtonProps {
  username: string;
  blocked: boolean;
  onChanged?: (blocked: boolean) => void;
}

// Acción de bloquear/desbloquear desde el perfil de otro usuario. Bloquear
// pide confirmación; desbloquear revierte el bloqueo sin recrear relaciones.
export function BlockButton({ username, blocked, onChanged }: BlockButtonProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [isBlocked, setIsBlocked] = useState(blocked);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function toggle() {
    if (!isBlocked && !window.confirm(t("blockConfirm", { username }))) return;
    setBusy(true);
    setErrorCode(null);
    try {
      const result = await apiFetch(
        `/api/users/${encodeURIComponent(username)}/block`,
        BlockedResponseSchema,
        { method: isBlocked ? "DELETE" : "PUT" },
      );
      setIsBlocked(result.blocked);
      onChanged?.(result.blocked);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" disabled={busy} onClick={() => void toggle()}>
        {busy ? t("searching") : isBlocked ? t("unblock") : t("block")}
      </Button>
      {errorCode && (
        <span role="alert" className="text-xs text-danger">
          {tErrors(`${errorCode}.description`)}
        </span>
      )}
    </div>
  );
}
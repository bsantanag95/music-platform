"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/social/UserAvatar";
import { apiFetch } from "@/lib/api/client";
import { z } from "zod";
import type { EditorHostCallbacks } from "./editor-host";
import { useNotifySaved } from "./editor-host";

const AvatarResponseSchema = z.object({ avatarUrl: z.string().nullable() });

interface OwnerAvatarEditorProps extends EditorHostCallbacks {
  username: string;
  name: string;
  initialAvatarUrl: string | null;
}

const AVATAR_ERROR_CODES = new Set([
  "IMAGE_UNSUPPORTED_FORMAT",
  "IMAGE_TOO_LARGE",
  "IMAGE_DIMENSIONS_EXCEEDED",
  "IMAGE_DIMENSIONS_INSUFFICIENT",
  "RATE_LIMITED",
]);

// Editor de la foto de perfil del dueño: subir, reemplazar o quitar. Reutilizado
// en el modo edición del perfil (spec profile-edit-mode) y en la pantalla Perfil
// de Ajustes (spec owner-settings). Los errores se localizan por `code` (nunca
// el mensaje crudo de la API), siguiendo el contrato de docs/04-api/errors.md.
export function OwnerAvatarEditor({
  username,
  name,
  initialAvatarUrl,
  onSaved,
}: OwnerAvatarEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const notifySaved = useNotifySaved(onSaved);
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "removing">("idle");
  const [error, setError] = useState<{ title: string; description?: string } | null>(null);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/me/profile/avatar", {
        method: "PUT",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        const code = body?.code as string | undefined;
        if (code && AVATAR_ERROR_CODES.has(code)) {
          setError({ title: tErrors(`${code}.title`), description: tErrors(`${code}.description`) });
        } else {
          setError({ title: t("avatar.errorGeneric") });
        }
        setStatus("idle");
        return;
      }
      const parsed = AvatarResponseSchema.parse(body);
      setAvatarUrl(parsed.avatarUrl);
      notifySaved();
      setStatus("idle");
    } catch {
      setError({ title: t("avatar.errorGeneric") });
      setStatus("idle");
    }
  }

  async function handleRemove() {
    setStatus("removing");
    setError(null);

    try {
      const parsed = await apiFetch("/api/me/profile/avatar", AvatarResponseSchema, {
        method: "DELETE",
      });
      setAvatarUrl(parsed.avatarUrl);
      notifySaved();
      setStatus("idle");
    } catch (err) {
      const code = err instanceof Error && "code" in err ? (err as { code: string }).code : null;
      if (code && AVATAR_ERROR_CODES.has(code)) {
        setError({ title: tErrors(`${code}.title`), description: tErrors(`${code}.description`) });
      } else {
        setError({ title: t("avatar.errorGeneric") });
      }
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <UserAvatar avatarUrl={avatarUrl} username={username} name={name} size="md" />
        <div className="flex flex-col gap-2">
          <p className="font-display text-sm text-paper">{t("avatar.uploadLabel")}</p>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-ink-border px-3 py-1.5 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleUpload}
                disabled={busy}
                className="sr-only"
              />
              {busy && status === "uploading"
                ? t("avatar.uploading")
                : avatarUrl
                  ? t("avatar.replaceButton")
                  : t("avatar.uploadButton")}
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="rounded border border-ink-border px-3 py-1.5 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:opacity-50"
              >
                {status === "removing" ? t("avatar.removing") : t("avatar.removeButton")}
              </button>
            )}
          </div>
          <p className="font-data text-xs text-paper-muted">{t("avatar.helpText")}</p>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-0.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 font-body text-xs"
        >
          <p className="font-medium text-danger">{error.title}</p>
          {error.description && <p className="text-danger/80">{error.description}</p>}
        </div>
      )}
    </div>
  );
}

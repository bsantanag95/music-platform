"use client";

import { useState } from "react";
import type { SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AuthResponseSchema, LoginRequestSchema, RegisterRequestSchema } from "@/lib/api/schemas";

const localizedErrorCodes = new Set(["INVALID_CREDENTIALS", "USERNAME_TAKEN", "EMAIL_TAKEN", "RATE_LIMITED", "INTERNAL_ERROR"]);

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setErrorCode(null);
    setFieldError(false);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = mode === "login" ? LoginRequestSchema.safeParse(data) : RegisterRequestSchema.safeParse(data);
    if (!parsed.success) {
      setFieldError(true);
      return;
    }
    setPending(true);
    try {
      await apiFetch(`/api/auth/${mode}`, AuthResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      router.push("/search");
      router.refresh();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-md flex-col gap-5">
      {mode === "register" && <label className="flex flex-col gap-2 font-data text-sm text-paper">{t("username")}<input name="username" autoComplete="username" required minLength={3} maxLength={32} className="rounded-md border border-ink-border bg-ink-surface px-3 py-2" /></label>}
      {mode === "register" ? <label className="flex flex-col gap-2 font-data text-sm text-paper">{t("email")}<input name="email" type="email" autoComplete="email" required className="rounded-md border border-ink-border bg-ink-surface px-3 py-2" /></label> : <label className="flex flex-col gap-2 font-data text-sm text-paper">{t("identifier")}<input name="identifier" autoComplete="username" required className="rounded-md border border-ink-border bg-ink-surface px-3 py-2" /></label>}
      <label className="flex flex-col gap-2 font-data text-sm text-paper">{t("password")}<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : 1} className="rounded-md border border-ink-border bg-ink-surface px-3 py-2" /></label>
       {(fieldError || errorCode) && <p role="alert" className="font-data text-sm text-danger">{fieldError ? t("validation") : tErrors(`${errorCode && localizedErrorCodes.has(errorCode) ? errorCode : "INTERNAL_ERROR"}.description`)}</p>}
      <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-3 font-display text-sm text-ink disabled:cursor-wait disabled:opacity-60">{pending ? t("submitting") : t(mode === "login" ? "submitLogin" : "submitRegister")}</button>
    </form>
  );
}

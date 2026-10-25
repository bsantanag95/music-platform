"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import { UnsubscribeResponseSchema } from "@/lib/api/schemas";

// Baja del resumen semanal desde el enlace del correo (openspec:
// add-notification-digest-and-awards, D5 y D8). El `GET` de la página solo
// confirma: la baja ocurre cuando la persona pulsa el botón y se hace el `POST`
// al endpoint de un clic. Así un escáner de enlaces que abre el correo no da de
// baja a nadie.

/** Tarjeta de aviso con una acción; la comparten la página y el resultado. */
export function UnsubscribeNotice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-paper">{title}</h1>
        <p className="mt-2 font-body text-paper-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

type Status = "idle" | "pending" | "done" | "invalid" | "error";

export function UnsubscribeConfirm({ token }: { token: string }) {
  const t = useTranslations("notifications");
  const [status, setStatus] = useState<Status>("idle");

  const confirm = async () => {
    setStatus("pending");
    try {
      await apiFetch(
        `/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`,
        UnsubscribeResponseSchema,
        { method: "POST" },
      );
      setStatus("done");
    } catch (error) {
      // Un token que dejó de valer entre el `GET` y el `POST` es el mismo caso
      // que abrir un enlace roto; el resto se puede reintentar.
      setStatus(
        error instanceof ApiError && error.code === "INVALID_UNSUBSCRIBE_TOKEN"
          ? "invalid"
          : "error",
      );
    }
  };

  const settingsLink = (
    <Link
      href="/me/settings/notifications"
      className="rounded-md border border-ink-border px-4 py-3 text-center font-display text-sm text-paper transition-colors hover:border-amber"
    >
      {t("unsubscribePage.goToSettings")}
    </Link>
  );
  if (status === "done") {
    return (
      <UnsubscribeNotice
        title={t("unsubscribePage.doneTitle")}
        description={t("unsubscribePage.doneDescription")}
        action={settingsLink}
      />
    );
  }

  if (status === "invalid") {
    return (
      <UnsubscribeNotice
        title={t("unsubscribePage.invalidTitle")}
        description={t("unsubscribePage.invalidDescription")}
        action={settingsLink}
      />
    );
  }

  return (
    <UnsubscribeNotice
      title={t("unsubscribePage.title")}
      description={t("unsubscribePage.description")}
      action={
        <div className="flex flex-col gap-3">
          {status === "error" ? (
            <p role="alert" className="font-data text-xs text-danger">
              {t("unsubscribePage.error")}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={status === "pending"}
            className="rounded-md bg-accent px-4 py-3 font-display text-sm text-ink transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {status === "pending" ? t("unsubscribePage.submitting") : t("unsubscribePage.confirm")}
          </button>
          <Link
            href="/"
            className="rounded-md border border-ink-border px-4 py-3 text-center font-display text-sm text-paper transition-colors hover:border-amber"
          >
            {t("unsubscribePage.goHome")}
          </Link>
        </div>
      }
    />
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { FollowResponseSchema, NoContentSchema, type FollowRelation } from "@/lib/api/schemas";

interface FollowButtonProps {
  username: string;
  relation: FollowRelation;
  authenticated: boolean;
  /** id del usuario que envió la solicitud; requerido cuando relation es "incoming". */
  requestId?: string;
  onChange?: (relation: FollowRelation) => void;
}

// Botón de seguimiento con los estados definidos en el diseño de Fase 5:
// Seguir / Solicitud enviada / Siguiendo / Aprobar / Rechazar. Los estados
// self y blocked se muestran sin acción. En móvil conserva nombres claros.
export function FollowButton({ username, relation, authenticated, requestId, onChange }: FollowButtonProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [current, setCurrent] = useState<FollowRelation>(relation);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (!authenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-display text-sm font-medium transition-colors bg-ink-surface text-paper border border-ink-border hover:border-amber"
      >
        {t("signInToFollow")}
      </Link>
    );
  }

  if (current === "self") {
    return (
      <span className="font-display text-sm text-paper-muted" role="status">
        {t("ownProfile")}
      </span>
    );
  }

  if (current === "blocked") {
    return (
      <span className="font-display text-sm text-paper-muted" role="status">
        {t("blocked")}
      </span>
    );
  }

  if (current === "incoming") {
    const targetId = requestId ?? username;
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErrorCode(null);
              try {
                await apiFetch(`/api/me/follow-requests/${encodeURIComponent(targetId)}/approve`, NoContentSchema, {
                  method: "POST",
                });
                setCurrent("none");
                onChange?.("none");
              } catch (error) {
                setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("approve")}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErrorCode(null);
              try {
                await apiFetch(`/api/me/follow-requests/${encodeURIComponent(targetId)}/reject`, NoContentSchema, {
                  method: "POST",
                });
                setCurrent("none");
                onChange?.("none");
              } catch (error) {
                setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("reject")}
          </Button>
        </div>
        {errorCode && <FollowError code={errorCode} tErrors={tErrors} />}
      </div>
    );
  }

  if (current === "following") {
    return (
      <div className="flex items-center gap-2">
        <span className="font-display text-sm text-paper-muted" role="status">
          {t("following")}
        </span>
        <Button variant="secondary" disabled={busy} onClick={() => void follow("DELETE")}>
          {busy ? t("searching") : t("unfollow")}
        </Button>
        {errorCode && <FollowError code={errorCode} tErrors={tErrors} />}
      </div>
    );
  }

  if (current === "requested") {
    return (
      <div className="flex items-center gap-2">
        <span className="font-display text-sm text-paper-muted" role="status">
          {t("requested")}
        </span>
        <Button variant="secondary" disabled={busy} onClick={() => void follow("DELETE")}>
          {busy ? t("searching") : t("cancelRequest")}
        </Button>
        {errorCode && <FollowError code={errorCode} tErrors={tErrors} />}
      </div>
    );
  }

  async function follow(method: "PUT" | "DELETE") {
    setBusy(true);
    setErrorCode(null);
    try {
      const result = await apiFetch(`/api/users/${encodeURIComponent(username)}/follow`, FollowResponseSchema, {
        method,
      });
      setCurrent(method === "PUT" ? result.relation : "none");
      onChange?.(method === "PUT" ? result.relation : "none");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="primary" disabled={busy} onClick={() => void follow("PUT")}>
        {busy ? t("searching") : t("follow")}
      </Button>
      {errorCode && <FollowError code={errorCode} tErrors={tErrors} />}
    </div>
  );
}

function FollowError({ code, tErrors }: { code: string; tErrors: (key: string) => string }) {
  return (
    <span role="alert" className="text-xs text-danger">
      {tErrors(`${code}.description`)}
    </span>
  );
}
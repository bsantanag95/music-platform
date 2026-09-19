"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { FollowResponseSchema, NoContentSchema, type FollowRelation } from "@/lib/api/schemas";

interface FollowButtonProps {
  username: string;
  relation: FollowRelation;
  authenticated: boolean;
  /** id del usuario que envió la solicitud; requerido cuando relation es "incoming". */
  requestId?: string;
  /**
   * Previsualización "cómo te ven": el dueño ve el botón que vería un visitante,
   * pero inerte — sin acción ni enlace a login (ver spec social-profiles).
   */
  preview?: boolean;
  /**
   * Al pasar a "following" o dejarlo (audiencia efectiva del perfil según
   * `audiencesForProfile`), refresca la página para que las secciones del
   * perfil dejen de mostrar el contenido de "antes de seguir" sin que el
   * visitante tenga que recargar a mano. Solo tiene sentido en la página de
   * perfil misma — el resto de los usos de este botón (buscador, listas de
   * conexiones, feed) no deberían recargar nada ajeno por un follow.
   */
  refreshProfileOnFollow?: boolean;
  /**
   * Refresca la página ante CUALQUIER cambio de relación (seguir, solicitar,
   * cancelar, aprobar, rechazar), no solo al cruzar "following". Lo usa el
   * umbral de un perfil privado, cuyo mensaje depende del estado exacto
   * ("pedile seguir" → "tu solicitud está enviada"): sin refresco el botón
   * cambiaría y el texto de al lado quedaría desactualizado.
   */
  refreshOnAnyChange?: boolean;
  /**
   * El perfil es privado: seguir es *pedir* seguir y la otra persona debe
   * aprobarlo, así que la acción se rotula "Solicitar seguir" en vez de "Seguir".
   */
  requestApproval?: boolean;
  onChange?: (relation: FollowRelation) => void;
}

// Botón de seguimiento con los estados definidos en el diseño de Fase 5:
// Seguir / Solicitud enviada / Siguiendo / Aprobar / Rechazar. Los estados
// self y blocked se muestran sin acción. En móvil conserva nombres claros.
export function FollowButton({
  username,
  relation,
  authenticated,
  requestId,
  preview,
  refreshProfileOnFollow,
  refreshOnAnyChange,
  requestApproval,
  onChange,
}: FollowButtonProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [current, setCurrent] = useState<FollowRelation>(relation);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const followLabel = requestApproval ? t("requestFollow") : t("follow");

  if (preview) {
    return (
      <Button variant="primary" disabled>
        {followLabel}
      </Button>
    );
  }

  // Aprobar/rechazar/seguir/cancelar terminan acá: actualiza el estado local y,
  // si el llamador lo pidió, refresca la página para que el texto del servidor
  // acompañe al botón.
  function settle(previous: FollowRelation, next: FollowRelation) {
    setCurrent(next);
    onChange?.(next);
    if (refreshOnAnyChange ? previous !== next : refreshProfileOnFollow && (previous === "following") !== (next === "following")) {
      router.refresh();
    }
  }

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
                settle("incoming", "none");
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
                settle("incoming", "none");
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
    const previous = current;
    setBusy(true);
    setErrorCode(null);
    try {
      const result = await apiFetch(`/api/users/${encodeURIComponent(username)}/follow`, FollowResponseSchema, {
        method,
      });
      const next = method === "PUT" ? result.relation : "none";
      // Con `refreshProfileOnFollow` solo importa cruzar el límite de
      // "following": es lo único que mueve `audiencesForProfile` (visitante
      // "requested" ve lo mismo que "none").
      settle(previous, next);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="primary" disabled={busy} onClick={() => void follow("PUT")}>
        {busy ? t("searching") : followLabel}
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
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { monogramLetter, monogramStyle } from "@/components/social/monogram";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api/client";
import { MutualFollowersResponseSchema, type UserSummary } from "@/lib/api/schemas";

interface MutualFollowersRowProps {
  username: string;
  total: number;
  first: UserSummary;
}

// "X y otros N siguen a este usuario" (Instagram/Twitter-style), justo debajo
// de la bio en la Placa: mismo cálculo que `mutualFollowersHint` (cuentas que
// el visitante sigue y que también siguen al dueño), pero con identidad. El
// número abre un modal simple con el listado completo — el resto de la
// oración es texto plano, no interactivo. No se renderiza nada si no hay
// seguidores en común (`total === 0`, chequeado por el caller antes de montar
// este componente).
export function MutualFollowersRow({ username, total, first }: MutualFollowersRowProps) {
  const t = useTranslations("users");
  const [open, setOpen] = useState(false);
  const name = first.displayName ?? first.username;
  const othersCount = total - 1;

  return (
    <>
      <p className="flex flex-wrap items-center gap-1.5 font-data text-xs text-paper-muted">
        <Link
          href={`/users/${encodeURIComponent(first.username)}`}
          className="flex items-center gap-1.5 text-paper-muted transition-colors hover:text-paper"
        >
          <span
            aria-hidden="true"
            className={`flex size-4 shrink-0 items-center justify-center rounded-full border font-display text-[0.55rem] ${monogramStyle(
              first.username,
            )}`}
          >
            {monogramLetter(name)}
          </span>
          <span>{name}</span>
        </Link>
        {othersCount > 0 ? (
          <>
            <span>{t("mutualFollowersRow.andOthers")}</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-paper underline decoration-ink-border underline-offset-2 transition-colors hover:text-amber hover:decoration-amber"
            >
              {othersCount}
            </button>
            <span>{t("mutualFollowersRow.followThisAccountPlural")}</span>
          </>
        ) : (
          <span>{t("mutualFollowersRow.followThisAccountSingular")}</span>
        )}
      </p>
      <MutualFollowersModal username={username} total={total} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function MutualFollowersModal({
  username,
  total,
  open,
  onClose,
}: {
  username: string;
  total: number;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("users");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || users || failed) return;
    apiFetch(
      `/api/users/${encodeURIComponent(username)}/mutual-followers?pageSize=50`,
      MutualFollowersResponseSchema,
    )
      .then((response) => setUsers(response.users))
      .catch(() => setFailed(true));
  }, [open, username, users, failed]);

  useEffect(() => {
    if (!mounted || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[70vh] w-full max-w-sm flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="font-display text-lg text-paper">
            {t("affinity.mutualFollowers", { count: total })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("mutualFollowersRow.modalClose")}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("mutualFollowersRow.modalClose")}
          </button>
        </div>

        <div className="themed-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {failed && (
            <p className="font-body text-xs text-paper-muted">{t("hoverCard.error")}</p>
          )}
          {!failed && !users && (
            <div className="flex items-center justify-center py-6">
              <Spinner label={t("mutualFollowersRow.modalLoading")} />
            </div>
          )}
          {users?.map((user) => {
            const name = user.displayName ?? user.username;
            return (
              <Link
                key={user.id}
                href={`/users/${encodeURIComponent(user.username)}`}
                onClick={onClose}
                className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-ink"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full border font-display text-sm ${monogramStyle(
                    user.username,
                  )}`}
                >
                  {monogramLetter(name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm text-paper group-hover:text-amber">
                    {name}
                  </span>
                  <span className="block truncate font-data text-xs text-paper-muted">@{user.username}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

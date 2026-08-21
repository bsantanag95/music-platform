"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  BlockedResponseSchema,
  FollowResponseSchema,
  NoContentSchema,
  type UserSummary,
} from "@/lib/api/schemas";
import { Button } from "@/components/ui/Button";
import { FollowButton } from "./FollowButton";

type ListVariant = "followers" | "following" | "requests" | "blocks";

interface UserListProps {
  users: UserSummary[];
  variant: ListVariant;
}

// Listado propio con acciones: eliminar seguidor, dejar de seguir, aprobar o
// rechazar solicitud y desbloquear. Recibe los datos iniciales del Server
// Component y actualiza su estado local tras cada mutación.
export function UserList({ users, variant }: UserListProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [items, setItems] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function run(user: UserSummary, request: Promise<unknown>) {
    setBusyId(user.id);
    setErrorCode(null);
    try {
      await request;
      setItems((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusyId(null);
    }
  }

  function requestFor(user: UserSummary): Promise<unknown> | null {
    switch (variant) {
      case "followers":
        return apiFetch(`/api/me/followers/${user.id}`, NoContentSchema, { method: "DELETE" });
      case "following":
        return apiFetch(`/api/users/${encodeURIComponent(user.username)}/follow`, FollowResponseSchema, {
          method: "DELETE",
        });
      case "blocks":
        return apiFetch(`/api/users/${encodeURIComponent(user.username)}/block`, BlockedResponseSchema, { method: "DELETE" });
      case "requests":
        return null;
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      {items.length === 0 && (
        <p className="font-body text-sm text-paper-muted" role="status">
          {t(`empty${capitalize(variant)}`)}
        </p>
      )}
      <ul className="flex flex-col gap-2" aria-label={t(`${variant}Title`)}>
        {items.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-ink-border bg-ink-surface px-4 py-3"
          >
            <Link
              href={`/users/${encodeURIComponent(user.username)}`}
              className="min-w-0 font-body text-sm text-paper transition-colors hover:text-amber"
            >
              <span className="block truncate font-display">{user.displayName ?? user.username}</span>
              <span className="block truncate text-paper-muted">@{user.username}</span>
            </Link>
            {variant === "requests" ? (
              <FollowButton
                username={user.username}
                relation="incoming"
                authenticated
                requestId={user.id}
                onChange={() => setItems((current) => current.filter((item) => item.id !== user.id))}
              />
            ) : (
              <Button
                variant="secondary"
                disabled={busyId === user.id}
                onClick={() => {
                  const request = requestFor(user);
                  if (request) void run(user, request);
                }}
              >
                {busyId === user.id ? t("searching") : t(actionLabel(variant))}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {errorCode && (
        <p className="text-sm text-danger" role="alert">
          {tErrors(`${errorCode}.description`)}
        </p>
      )}
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function actionLabel(variant: ListVariant): string {
  switch (variant) {
    case "followers":
      return "removeFollower";
    case "following":
      return "unfollow";
    case "blocks":
      return "unblock";
    case "requests":
      return "";
  }
}
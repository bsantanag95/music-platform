"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useOwnerEdit } from "./OwnerEditProvider";

// Acciones del dueño en la fila de la cabecera, donde un visitante tiene «Seguir» (openspec:
// redesign-owner-profile-phase1; spec profile-edit-mode, "Estado y acciones del dueño en la
// cabecera"): «Editar perfil», que alterna el modo edición y con él activo se rotula «Listo», y
// «Ver como visitante», que lleva a la previsualización "cómo te ven". Fuera del
// `OwnerEditProvider` (visitante, previsualización) no dibuja nada.
export function OwnerHeaderActions({ username }: { username: string }) {
  const t = useTranslations("users");
  const ownerEdit = useOwnerEdit();
  if (!ownerEdit) return null;
  const { editing, setEditing } = ownerEdit;

  return (
    <>
      <button
        type="button"
        aria-pressed={editing}
        onClick={() => setEditing(!editing)}
        className={`inline-flex items-center justify-center gap-2 rounded border px-4 py-2 font-display text-sm font-medium transition-colors ${
          editing
            ? "border-amber bg-amber text-ink hover:bg-amber-hover"
            : "border-ink-border bg-ink-surface text-paper hover:border-amber"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {editing ? <path d="m5 12 4.5 4.5L19 7" /> : <path d="M4 20h4L19 9l-4-4L4 16v4Z" />}
        </svg>
        {editing ? t("ownerHeader.done") : t("ownerHeader.edit")}
      </button>
      {!editing && (
        <Link
          href={`/users/${encodeURIComponent(username)}?preview=1`}
          className="inline-flex items-center justify-center gap-2 rounded border border-ink-border px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {t("ownerHeader.viewAsVisitor")}
        </Link>
      )}
    </>
  );
}

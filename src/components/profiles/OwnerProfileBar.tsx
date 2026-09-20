"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ProfileVisibility } from "@/services/social/types";
import { useOwnerEdit } from "./OwnerEditProvider";

interface OwnerProfileBarProps {
  username: string;
  visibility: ProfileVisibility;
}

// Barra superior del perfil del dueño (spec profile-edit-mode, "Barra del
// dueño con estado y acceso a Ajustes"): estado de visibilidad que enlaza a la
// pantalla de Privacidad —sin cambiar nada por sí mismo—, acceso a "Ver cómo
// te ven" y el interruptor "Editar perfil". Solo tiene sentido dentro del
// `OwnerEditProvider`; fuera de él (visitante, previsualización) no renderiza.
export function OwnerProfileBar({ username, visibility }: OwnerProfileBarProps) {
  const t = useTranslations("users");
  const ownerEdit = useOwnerEdit();
  if (!ownerEdit) return null;

  const { editing, setEditing } = ownerEdit;
  const stateLabel = visibility === "private" ? t("ownerBar.private") : t("ownerBar.public");

  return (
    <section
      aria-label={t("ownerBar.label")}
      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-border bg-ink-surface px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/me/settings/privacy"
          className="inline-flex items-center gap-2 rounded-full border border-ink-border px-3 py-1 font-display text-sm text-paper transition-colors hover:border-amber"
        >
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full ${visibility === "private" ? "bg-amber" : "bg-petrol"}`}
          />
          {stateLabel}
          <span className="text-paper-muted">
            · {t("ownerBar.settings")} <span aria-hidden="true">→</span>
          </span>
        </Link>
        <Link
          href={`/users/${encodeURIComponent(username)}?preview=1`}
          className="font-data text-xs text-paper-muted underline decoration-paper-muted underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
        >
          {t("viewAs.enter")}
        </Link>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={editing}
        onClick={() => setEditing(!editing)}
        className={`inline-flex items-center gap-2 rounded-full border py-1 pl-3.5 pr-1.5 font-display text-sm transition-colors ${
          editing ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
        }`}
      >
        {t("editMode.toggle")}
        <span
          aria-hidden="true"
          className={`relative block h-5 w-9 rounded-full transition-colors ${editing ? "bg-amber" : "bg-ink-border"}`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full transition-[left] ${
              editing ? "left-[1.125rem] bg-ink" : "left-0.5 bg-paper"
            }`}
          />
        </span>
      </button>
    </section>
  );
}

"use client";

import { useState, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCamino } from "@/lib/api/camino";
import { ApiError } from "@/lib/api/client";
import type { CaminoDetail } from "@/lib/api/schemas";

interface NewCaminoPanelProps {
  /** Pasa al chip "A lista" con la búsqueda fijada a álbumes. */
  onAddAlbums: () => void;
  onNavigate: () => void;
}

// Acción Nuevo Camino del diálogo de acciones rápidas (openspec: add-quick-actions-collection-camino,
// D3): solo el título. Crea el Camino SIN `audience`, así el servidor aplica la audiencia por
// defecto de la persona. Al crearlo ofrece agregar álbumes: `AddToListPanel` ya lista los Caminos
// propios para objetivos de álbum.
export function NewCaminoPanel({ onAddAlbums, onNavigate }: NewCaminoPanelProps) {
  const t = useTranslations("quickActions");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [created, setCreated] = useState<CaminoDetail | null>(null);

  const submit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (title.trim() === "") {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setBusy(true);
    setErrorCode(null);
    try {
      setCreated(await createCamino({ title: title.trim() }));
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="font-data text-sm text-paper">
          {t("newCamino.created", { title: created.title })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={onAddAlbums}>
            {t("newCamino.addAlbums")}
          </Button>
          <Link
            href={`/me/caminos/${created.id}`}
            onClick={onNavigate}
            className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
          >
            {t("newCamino.viewCamino")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Input
        label={t("newCamino.titleLabel")}
        value={title}
        maxLength={100}
        onChange={(e) => setTitle(e.target.value)}
        error={titleError ? t("newCamino.titleRequired") : undefined}
        autoFocus
        autoComplete="off"
      />
      {errorCode === "AUTH_REQUIRED" ? (
        <Link href="/auth/login" className="font-data text-sm text-amber underline">
          {t("signIn")}
        </Link>
      ) : errorCode ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? t("newCamino.creating") : t("newCamino.submit")}
        </Button>
      </div>
    </form>
  );
}

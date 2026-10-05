"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { addIdentityGenre, removeIdentityGenre } from "@/lib/api/genres";
import { ApiError } from "@/lib/api/errors";
import type { IdentityGenresResponse } from "@/lib/api/schemas";

// "Me mueve" (openspec: redesign-genre-page, capability `genre-page-personal`): agrega o quita el
// género de "Géneros que me mueven". Usa los endpoints idempotentes de un solo género, no el `PUT` que
// reemplaza la lista, así que no pisa cambios hechos desde otra pestaña. El estado visible sale de la
// lista que devuelve el servidor; con la lista llena el motivo sale del código de error localizado.

interface GenreMoveButtonProps {
  slug: string;
  /** El género ya está en la lista de la persona (lo resuelve el servidor al renderizar). */
  initialDeclared: boolean;
}

export function GenreMoveButton({ slug, initialDeclared }: GenreMoveButtonProps) {
  const t = useTranslations("catalog.genres.page.move");
  const tErrors = useTranslations("errors");
  const [declared, setDeclared] = useState(initialDeclared);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const mutation = useMutation<IdentityGenresResponse, unknown, boolean>({
    mutationFn: (add) => (add ? addIdentityGenre(slug) : removeIdentityGenre(slug)),
    onSuccess: ({ genres }) => {
      setErrorCode(null);
      setDeclared(genres.includes(slug));
    },
    onError: (error) => setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR"),
  });

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        aria-pressed={declared}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(!declared)}
        className={`rounded-full border px-4 py-1.5 font-data text-sm transition-colors disabled:opacity-60 ${
          declared ? "border-amber bg-amber text-ink" : "border-ink-border text-paper hover:border-amber"
        }`}
      >
        {declared ? t("declared") : t("declare")}
      </button>
      {errorCode && (
        <p role="alert" className="max-w-xs font-data text-xs text-danger">
          {tErrors.has(`${errorCode}.description`) ? tErrors(`${errorCode}.description`) : t("error")}
        </p>
      )}
    </div>
  );
}

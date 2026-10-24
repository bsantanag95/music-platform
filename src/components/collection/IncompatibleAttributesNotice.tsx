"use client";

import { useTranslations } from "next-intl";
import { incompatibleAttributes } from "@/services/collection/vocabulary";
import type { CollectionFormat } from "@/services/collection/vocabulary";

// Aviso del formulario de edición cuando la entrada guardada tiene atributos de
// vinilo con otro formato (dato heredado de antes de que el servidor validara la
// combinación). El valor inicial del formulario ya los quitó; esto explica por
// qué antes de guardar, en vez de reescribir la entrada en silencio.
export function IncompatibleAttributesNotice({
  format,
  savedAttributes,
}: {
  format: CollectionFormat | null;
  savedAttributes: readonly string[];
}) {
  const t = useTranslations("collection");
  const dropped = incompatibleAttributes(format, savedAttributes);
  if (dropped.length === 0) return null;

  return (
    <p role="note" className="rounded border border-amber/40 bg-amber/5 px-3 py-2 font-data text-xs text-paper">
      {t("incompatibleNotice", {
        count: dropped.length,
        attributes: dropped.map((attribute) => t(`attribute.${attribute}`)).join(", "),
      })}
    </p>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { AudienceIcon } from "@/components/favorites/FavoriteActions";
import type { CollectionFormatValue, DiaryAudience, EditionAttributeValue } from "@/lib/api/schemas";

/** "Vinilo · Edición limitada +1": formato y primer atributo, con cuántos más hay. */
export function EditionSummary({
  format,
  attributes,
}: {
  format: CollectionFormatValue | null;
  attributes: readonly EditionAttributeValue[];
}) {
  const t = useTranslations("collection");
  const parts = [format ? t(`format.${format}`) : t("anyFormat")];
  if (attributes[0]) parts.push(t(`attribute.${attributes[0]}`));
  const more = attributes.length > 1 ? ` +${attributes.length - 1}` : "";
  return (
    <>
      {parts.join(" · ")}
      {more}
    </>
  );
}

/** Error de quitar, bajo la entrada que falló. */
export function RemoveError() {
  const t = useTranslations("collection");
  return (
    <span role="alert" className="font-data text-xs text-danger">
      {t("removeError")}
    </span>
  );
}

/** Candado sobre la carátula de una copia privada (las demás audiencias no se marcan en la Estantería). */
export function PrivateMark({ audience }: { audience: DiaryAudience }) {
  const t = useTranslations("collection");
  if (audience !== "private") return null;
  return (
    <span
      title={t("audience.private")}
      className="absolute bottom-1.5 left-1.5 inline-flex rounded bg-ink/80 p-1 text-paper"
    >
      <AudienceIcon audience="private" className="size-3" />
      <span className="sr-only">{t("audience.private")}</span>
    </span>
  );
}

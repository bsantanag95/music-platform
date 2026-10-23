"use client";

import { useTranslations } from "next-intl";

// Aviso de que no se pudo quitar una entrada, junto a ella (no al final de la página). Lo usan los
// tres modos de visualización.
export function EntryRemoveError({ className = "" }: { className?: string }) {
  const t = useTranslations("wantToListen");
  return (
    <span role="alert" className={`font-data text-xs text-danger ${className}`}>
      {t("saveError")}
    </span>
  );
}

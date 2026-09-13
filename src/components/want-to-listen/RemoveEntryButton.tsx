"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Quitar en dos pasos, sin diálogo aparte: el primer clic arma la
// confirmación, el segundo la ejecuta; se desarma sola a los 4 s o al perder
// el foco. Mismo criterio que `RemoveItemButton` de listas.
export function RemoveEntryButton({
  title,
  busy,
  onRemove,
}: {
  title: string;
  busy: boolean;
  onRemove: () => void;
}) {
  const t = useTranslations("wantToListen");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={armed ? t("removeItemConfirm") : t("removeItemNamed", { title })}
      onClick={() => {
        if (armed) {
          onRemove();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      className={`shrink-0 font-data text-xs underline decoration-dotted transition-colors disabled:opacity-40 ${
        armed ? "text-danger hover:text-paper" : "text-paper-muted hover:text-danger"
      }`}
    >
      {armed ? t("removeItemShort") : t("removeItem")}
    </button>
  );
}

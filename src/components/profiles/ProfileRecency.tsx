import { getTranslations } from "next-intl/server";
import { relativeFeedDate } from "@/components/feed/feed-dates";

interface ProfileRecencyProps {
  /** Fecha de la señal más reciente visible, o null si no hay. */
  at: Date | null;
}

// Línea "última señal hace X": la actividad visible más reciente del dueño.
// No se muestra si no hay actividad. Server Component.
export async function ProfileRecency({ at }: ProfileRecencyProps) {
  if (!at) return null;
  const t = await getTranslations("users");
  const ago = await relativeFeedDate(at.toISOString());
  return (
    <p className="w-full max-w-2xl font-data text-xs text-paper-muted">
      {t("recencyLastSignal", { ago })}
    </p>
  );
}

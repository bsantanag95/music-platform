import type { useTranslations } from "next-intl";
import type { CaminoSummary } from "@/lib/api/schemas";

export interface MyCaminosListActions {
  busyId: string | null;
  remove: (caminoId: string) => void;
  archive: (caminoId: string) => void;
}

export interface MyCaminosRendererProps {
  caminos: CaminoSummary[];
  actions: MyCaminosListActions;
}

export function caminoStateLabel(
  state: CaminoSummary["state"],
  t: ReturnType<typeof useTranslations>,
): string {
  if (state === "archived") return t("stateArchived");
  if (state === "complete") return t("stateComplete");
  return t("stateInProgress");
}

export function CaminoStateLabel({ state, label }: { state: CaminoSummary["state"]; label: string }) {
  const colorClass = state === "complete" ? "border-petrol/50 text-petrol" : "border-ink-border text-paper-muted";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 font-data text-[0.65rem] uppercase tracking-wider ${colorClass}`}
    >
      {label}
    </span>
  );
}

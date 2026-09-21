import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/services/auth/page-auth";
import { getShowcase } from "@/services/profiles/showcase";
import { getCurationSummary } from "@/services/profiles/curation";
import { RATING_HIGHLIGHT_MAX } from "@/services/rating-highlights/rating-highlights";
import { PROFILE_MAX_PINNED } from "@/services/social/types";
import { OwnerEditProvider } from "@/components/profiles/OwnerEditProvider";
import { OwnerShowcaseEditor } from "@/components/profiles/OwnerShowcaseEditor";
import { OpenEditorButton } from "@/components/settings/OpenEditorButton";
import { SettingsSection } from "@/components/settings/SettingsSection";

interface RowProps {
  title: string;
  hint: string;
  status: string;
  action: ReactNode;
}

function Row({ title, hint, status, action }: RowProps) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="min-w-0">
        <span className="block font-display text-sm text-paper">{title}</span>
        <span className="block font-body text-xs text-paper-muted">{hint}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="font-data text-xs text-paper-muted">{status}</span>
        {action}
      </span>
    </li>
  );
}

const linkClass =
  "rounded border border-ink-border px-3 py-1.5 font-display text-sm text-paper transition-colors hover:border-amber";

// Pantalla Curaduría (spec owner-settings): lo que el dueño elige mostrar.
// "Empieza por aquí" abre su editor en el panel lateral; listas fijadas,
// valoraciones y diario destacados se fijan donde viven, así que aquí solo se
// cuentan y se enlaza a su origen (no se duplica la acción). El himno no está
// acá: se elige desde la Tarjeta de Identidad (pantalla Perfil).
// Las valoraciones se destacan desde la valoración de cada álbum o canción, sin
// una superficie única a la que enlazar: solo llevan conteo y una pista.
export default async function CurationSettingsPage() {
  const t = await getTranslations("users");
  const user = await requirePageUser();
  const [showcase, summary] = await Promise.all([getShowcase(user.id), getCurationSummary(user.id)]);

  const showcaseEditor = <OwnerShowcaseEditor initial={showcase} />;
  const outOf = (count: number, max: number) => t("settings.curation.outOf", { count, max });

  return (
    <SettingsSection title={t("settings.curation.title")} intro={t("settings.curation.intro")}>
      <OwnerEditProvider>
        <ul className="flex flex-col divide-y divide-ink-border rounded-lg border border-ink-border bg-ink-surface">
          <Row
            title={t("settings.curation.pinned.title")}
            hint={t("settings.curation.pinned.hint", { max: PROFILE_MAX_PINNED })}
            status={outOf(showcase.pinned.length, PROFILE_MAX_PINNED)}
            action={<OpenEditorButton label={t("settings.curation.pinned.title")} editor={showcaseEditor} />}
          />
          <Row
            title={t("settings.curation.pinnedLists.title")}
            hint={t("settings.curation.pinnedLists.hint")}
            status={String(summary.pinnedLists)}
            action={
              <Link href="/me/lists" className={linkClass}>
                {t("settings.curation.pinnedLists.link")}
              </Link>
            }
          />
          <Row
            title={t("settings.curation.ratingHighlights.title")}
            hint={t("settings.curation.ratingHighlights.hint", { max: RATING_HIGHLIGHT_MAX })}
            status={outOf(summary.ratingHighlights, RATING_HIGHLIGHT_MAX)}
            action={null}
          />
          <Row
            title={t("settings.curation.diaryHighlights.title")}
            hint={t("settings.curation.diaryHighlights.hint")}
            status={String(summary.diaryHighlights)}
            action={
              <Link href="/me/diary" className={linkClass}>
                {t("settings.curation.diaryHighlights.link")}
              </Link>
            }
          />
        </ul>
      </OwnerEditProvider>
    </SettingsSection>
  );
}

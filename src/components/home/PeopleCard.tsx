import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Acceso a la búsqueda de usuarios desde la portada sin sesión (openspec: redesign-anon-home-phase2):
// cierra la columna lateral de la comunidad y se muestra siempre, aunque no haya actividad, comentarios
// ni listas —el enlace de la Fase 1 vivía en la cabecera de la actividad y desaparecía con ella.
export async function PeopleCard() {
  const t = await getTranslations("home");

  return (
    <Link
      href="/users"
      className="group flex items-center gap-4 rounded-xl border border-ink-border bg-ink-surface p-5 transition-colors hover:border-amber/70"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-amber ring-1 ring-ink-border"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-base text-paper transition-colors group-hover:text-amber">
          {t("communityPeopleLink")}
        </span>
        <span className="font-body text-sm text-paper-muted">{t("communityPeopleHint")}</span>
      </span>
      <span aria-hidden="true" className="text-paper-muted transition-transform duration-150 group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

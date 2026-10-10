import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Reemplaza el preview de feed cuando el usuario logueado no sigue a nadie
// todavía — evita mostrarle el empty state genérico del feed como primera
// impresión de Inicio (ver docs/05-features/home.md). Los dos accesos son
// enlaces con apariencia de botón (un `<button>` dentro de un `<a>` no es HTML
// válido); la segunda pista —registrar la primera escucha— va aparte, separada
// por un filete, porque es otro camino y no una continuación del primero.
export async function OnboardingPrompt() {
  const t = await getTranslations("home");

  return (
    <section className="flex w-full max-w-3xl flex-col items-center rounded-lg border border-ink-border bg-ink-surface px-6 py-9 text-center">
      <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-ink text-paper-muted ring-1 ring-ink-border">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1" />
          <path d="M18 8v6M15 11h6" />
        </svg>
      </span>
      <h2 className="mt-4 font-display text-xl text-paper">{t("onboardingTitle")}</h2>
      <p className="mt-2 max-w-sm font-body text-sm text-paper-muted">{t("onboardingDescription")}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/users"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-amber px-4 py-2 font-display text-sm font-medium text-ink transition-colors hover:bg-amber-hover"
        >
          {t("onboardingFindPeople")}
        </Link>
        <Link
          href="/search"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-ink-border px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
        >
          {t("onboardingExploreCatalog")}
        </Link>
      </div>
      <p className="mt-7 flex max-w-sm items-start gap-2 border-t border-ink-border pt-5 text-left font-body text-sm text-paper-muted">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-paper-muted"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" />
        </svg>
        {t("onboardingLogFirstListen")}
      </p>
    </section>
  );
}

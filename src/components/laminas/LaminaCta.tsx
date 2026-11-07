import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildIntentAuthHref, type BuildIntent } from "@/lib/laminas/intent";

// "Arma la tuya" (specs top-laminas y discography-laminas): convierte a quien mira una Lámina ajena en autor, sin muro de registro.
// Quien tiene sesión va directo a armar la suya (`signedInHref`); quien no, al registro, y la intención sobrevive al alta.
export function LaminaCta({
  intent,
  signedInHref,
  title,
  description,
}: {
  intent: BuildIntent;
  signedInHref: string | null;
  /** Textos propios del objeto; sin ellos, los del Top N. */
  title?: string;
  description?: string;
}) {
  const signedIn = signedInHref !== null;
  const t = useTranslations("laminas");
  return (
    <aside className="flex flex-wrap items-center justify-between gap-4 rounded border border-ink-border bg-ink-surface p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-display text-base text-paper">{title ?? t("cta.title")}</h2>
        <p className="font-body text-sm text-paper-muted">{description ?? t("cta.description")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={signedInHref ?? buildIntentAuthHref("/auth/register", intent)}
          className="rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover"
        >
          {t("cta.action")}
        </Link>
        {signedIn ? null : (
          <Link href={buildIntentAuthHref("/auth/login", intent)} className="font-data text-xs text-paper-muted transition-colors hover:text-paper">
            {t("cta.haveAccount")}
          </Link>
        )}
      </div>
    </aside>
  );
}

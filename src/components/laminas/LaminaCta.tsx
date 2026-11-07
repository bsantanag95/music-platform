import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { laminaAuthHref, laminaBuildHref } from "@/lib/laminas/intent";

// "Arma la tuya" (spec top-laminas): convierte a quien mira una Lámina ajena en autor, sin muro de registro. Quien tiene
// sesión va directo al formulario; quien no, al registro, y la intención sobrevive al alta.
export function LaminaCta({ laminaId, signedIn }: { laminaId: string; signedIn: boolean }) {
  const t = useTranslations("laminas");
  return (
    <aside className="flex flex-wrap items-center justify-between gap-4 rounded border border-ink-border bg-ink-surface p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-display text-base text-paper">{t("cta.title")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("cta.description")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={signedIn ? laminaBuildHref(laminaId) : laminaAuthHref("/auth/register", laminaId)}
          className="rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover"
        >
          {t("cta.action")}
        </Link>
        {signedIn ? null : (
          <Link href={laminaAuthHref("/auth/login", laminaId)} className="font-data text-xs text-paper-muted transition-colors hover:text-paper">
            {t("cta.haveAccount")}
          </Link>
        )}
      </div>
    </aside>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

// Cierre del Inicio anónimo: una sola superficie con hairline y el CTA de
// registro repetido al pie de la página.
export async function AnonCta() {
  const [t, tHome] = await Promise.all([
    getTranslations("common"),
    getTranslations("home"),
  ]);

  return (
    <section className="flex w-full flex-col items-center gap-5 rounded-xl border border-ink-border bg-ink-surface px-6 py-14 text-center">
      <h2 className="max-w-xl text-balance font-display text-[clamp(1.875rem,2.8vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.025em] text-paper">{tHome("anonClosingTitle")}</h2>
      <Link href="/auth/register">
        <Button variant="primary">{t("register")}</Button>
      </Link>
    </section>
  );
}

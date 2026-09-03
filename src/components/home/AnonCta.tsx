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
    <section className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-lg border border-ink-border bg-ink-surface px-6 py-10 text-center">
      <h2 className="max-w-md font-display text-lg text-paper">{tHome("anonClosingTitle")}</h2>
      <Link href="/auth/register">
        <Button variant="primary">{t("register")}</Button>
      </Link>
    </section>
  );
}

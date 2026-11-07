import { getTranslations } from "next-intl/server";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LaminaCreateForm } from "@/components/laminas/LaminaCreateForm";
import { Link } from "@/i18n/navigation";
import { withClientMessages } from "@/i18n/client-messages";
import { requirePageUser } from "@/services/auth/page-auth";
import { listMyLaminas } from "@/services/laminas/laminas";

// Láminas propias (spec top-laminas): un ranking armado a mano para mostrar y compartir.
async function LaminasPage() {
  const t = await getTranslations("laminas");
  const user = await requirePageUser();
  const laminas = await listMyLaminas(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
        <p className="font-body text-sm text-paper-muted">{t("description")}</p>
      </header>
      <LaminaCreateForm />
      {laminas.length === 0 ? (
        <p className="font-body text-sm text-paper-muted">{t("noLaminas")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {laminas.map((lamina) => (
            <li key={lamina.id}>
              <Link
                href={`/me/laminas/${lamina.id}`}
                className="flex items-center gap-3 rounded border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
              >
                <CoverThumb cover={lamina.coverThumbs[0] ?? null} label="" className="size-14 shrink-0 rounded" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-display text-sm text-paper">{lamina.title}</span>
                  <span className="font-data text-xs text-paper-muted">
                    {t(`formats.${lamina.format}`)} · {t(`audience.${lamina.audience}`)} · {t("itemCount", { count: lamina.itemCount })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default withClientMessages("me/laminas/page", LaminasPage);

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function NotFound() {
  const t = await getTranslations("common");

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-4">
      <EmptyState
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-ink-border px-4 py-2 font-display text-sm text-paper transition hover:bg-ink-surface focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t("notFound.action")}
          </Link>
        }
      />
    </div>
  );
}

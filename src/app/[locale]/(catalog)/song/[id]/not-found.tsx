import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/i18n/navigation";

export default async function SongNotFound() { const t = await getTranslations("catalog"); return <main className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-4"><EmptyState title={t("song.notFoundTitle")} description={t("song.notFoundDescription")} action={<Link href="/search" className="rounded-md border border-ink-border px-4 py-2 font-display text-sm text-paper">{t("search.searchAgain")}</Link>} /></main>; }

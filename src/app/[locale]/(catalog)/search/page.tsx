import { getTranslations } from "next-intl/server";
import { SearchForm } from "@/components/catalog/SearchForm";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const t = await getTranslations("catalog");
  const { q } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("search.pageTitle")}</h1>
      <SearchForm initialQuery={q} />
    </main>
  );
}

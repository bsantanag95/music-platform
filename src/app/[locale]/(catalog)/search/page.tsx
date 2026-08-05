import { getTranslations } from "next-intl/server";
import { SearchForm } from "@/components/catalog/SearchForm";

export default async function SearchPage() {
  const t = await getTranslations("catalog");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("search.pageTitle")}</h1>
      <SearchForm />
    </main>
  );
}

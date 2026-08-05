import { getTranslations } from "next-intl/server";
import { SearchForm } from "@/components/catalog/SearchForm";

export default async function Home() {
  const t = await getTranslations("common");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-3xl text-paper">{t("appName")}</h1>
      <p className="font-body text-paper-muted">{t("tagline")}</p>
      <SearchForm />
    </main>
  );
}

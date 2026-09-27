"use client";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/ErrorState";

// Error inesperado en la página de artista o en cualquiera de sus pestañas (openspec:
// redesign-artist-page).
export default function ArtistError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-4">
      <ErrorState title={t("error.title")} description={t("error.description")} onRetry={reset} retryLabel={t("retry")} />
    </main>
  );
}

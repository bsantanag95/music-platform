"use client";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/ErrorState";

// Error inesperado en la página de álbum o en cualquiera de sus pestañas (openspec:
// redesign-album-page, tarea 3.6).
export default function AlbumError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-4">
      <ErrorState title={t("error.title")} description={t("error.description")} onRetry={reset} retryLabel={t("retry")} />
    </main>
  );
}

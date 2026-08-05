import { getTranslations } from "next-intl/server";

// 404 localizado para el segmento [locale]. Reutiliza el mensaje de error
// de búsqueda de artista; es un estado amigable y traducido, nunca el
// mensaje crudo del backend.
export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <h1 className="font-display text-2xl text-paper">{t("ARTIST_NOT_FOUND.title")}</h1>
      <p className="max-w-sm font-body text-paper-muted">{t("ARTIST_NOT_FOUND.description")}</p>
    </main>
  );
}
import { getTranslations } from "next-intl/server";
import { PopularCommentsTabs } from "./PopularCommentsTabs";
import type { PopularCommentsByType } from "@/services/home/home";

// Apartado de Inicio "Comentarios populares": distinto de "Actividad de la
// comunidad" (cronológica, mezcla ratings + comentarios). Acá son solo
// comentarios, rankeados, con más contexto (autor, target, valoración),
// en un solo espacio con control segmentado por tipo de entidad. Ranking por
// likes reales — ver docs/05-features/home.md, "Comentarios populares".
export async function PopularComments({
  comments,
  variant = "section",
}: {
  comments: PopularCommentsByType;
  /** `panel` (portada sin sesión): superficie propia y título `h3`, en la columna lateral de la comunidad. */
  variant?: "section" | "panel";
}) {
  const total =
    comments.artist.length + comments["release-group"].length + comments.recording.length;
  if (total === 0) return null;

  const t = await getTranslations("home");

  return (
    <section
      className={`flex w-full flex-col gap-4 ${
        variant === "panel" ? "rounded-xl border border-ink-border bg-ink-surface p-5" : "max-w-3xl"
      }`}
    >
      {variant === "panel" ? (
        <h3 className="font-display text-lg text-paper">{t("popularCommentsTitle")}</h3>
      ) : (
        <h2 className="font-display text-xl text-paper">{t("popularCommentsTitle")}</h2>
      )}
      <PopularCommentsTabs
        comments={comments}
        tablistLabel={t("popularCommentsTitle")}
        tabLabels={{
          artist: t("popularCommentsTabArtists"),
          "release-group": t("popularCommentsTabAlbums"),
          recording: t("popularCommentsTabSongs"),
        }}
        emptyText={t("popularCommentsEmpty")}
        likeWord={t("popularCommentsLikeWord")}
      />
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { PopularCommentsTabs } from "./PopularCommentsTabs";
import type { PopularCommentsByType } from "@/services/home/home";

// Apartado de Inicio "Comentarios populares": distinto de "Actividad de la
// comunidad" (cronológica, mezcla ratings + comentarios). Acá son solo
// comentarios, rankeados, con más contexto (likes, autor, target, valoración),
// en un solo espacio con control segmentado por tipo de entidad. El ranking y
// los likes son de maqueta — ver docs/05-features/home.md, "Comentarios
// populares".
export async function PopularComments({ comments }: { comments: PopularCommentsByType }) {
  const total =
    comments.artist.length + comments["release-group"].length + comments.recording.length;
  if (total === 0) return null;

  const t = await getTranslations("home");

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("popularCommentsTitle")}</h2>
      <PopularCommentsTabs
        comments={comments}
        tablistLabel={t("popularCommentsTitle")}
        tabLabels={{
          artist: t("popularCommentsTabArtists"),
          "release-group": t("popularCommentsTabAlbums"),
          recording: t("popularCommentsTabSongs"),
        }}
        likeWord={t("popularCommentsLikeWord")}
        emptyText={t("popularCommentsEmpty")}
      />
    </section>
  );
}

import type { Metadata } from "next";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { concertArtistName, listOwnConcerts } from "@/services/concerts/concerts";
import { OwnConcerts } from "@/components/concerts/OwnConcerts";
import { withClientMessages } from "@/i18n/client-messages";

// Mis conciertos (openspec: add-my-concerts, capability `concert-log`): los conciertos a los que fue el usuario,
// agrupados por año, con registrar, editar y quitar. `?artista=<id>` acota la lista a un artista (el enlace "Lo viste
// N veces" del panel del artista); un valor inválido o de un artista inexistente se ignora.

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("concerts");
  return { title: t("metaTitle") };
}

async function MyConcertsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const t = await getTranslations("concerts");
  const user = await requirePageUser();
  const raw = (await searchParams).artista;
  const artistId = typeof raw === "string" && z.uuid().safeParse(raw).success ? raw : null;
  const artistName = artistId ? await concertArtistName(artistId) : null;
  const filter = artistId && artistName ? { id: artistId, name: artistName } : null;
  const initial = await listOwnConcerts(user.id, filter ? { artistId: filter.id } : {});

  return (
    // Mismo ancho y título a la izquierda que Colección, Diario y Pendientes.
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <header className="flex min-w-0 flex-col gap-1.5">
        <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
        <p className="font-body text-sm text-paper-muted">{t("intro")}</p>
      </header>
      <OwnConcerts initial={initial} filter={filter} />
    </main>
  );
}

export default withClientMessages("me/concerts/page", MyConcertsPage);

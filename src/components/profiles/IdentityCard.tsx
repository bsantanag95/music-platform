import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import type { IdentityCard as IdentityCardData } from "@/services/profiles/showcase";

interface IdentityCardProps {
  identityCard: IdentityCardData;
}

// Tarjeta de Identidad (openspec: rework-user-profile): el artista, el álbum
// y la canción elegidos a mano por el dueño para representarlo — nunca
// derivados de actividad. Es el Nivel 1 del perfil: lo primero y lo único
// que debería hacer falta ver para reconocer quién es musicalmente esta
// persona. No se renderiza si los tres elementos están ausentes (spec
// `profile-showcase`, "Ningún elemento de identidad"). Server Component.
//
// Diseño (revisión 2026-09-17, "Opción A" de los mockups): circular como los
// avatares de "Exploración" — no una tira con divisores. Etiqueta de rol
// corta (Artista/Álbum/Himno) arriba, sin la frase completa del editor
// ("Artista que me define"), porque acá es una leyenda visual repetida bajo
// cada círculo, no la etiqueta de un campo de formulario.
export async function IdentityCard({ identityCard }: IdentityCardProps) {
  const t = await getTranslations("users");
  const { artist, album, anthem } = identityCard;

  if (!artist && !album && !anthem) return null;

  const slots = [
    artist && { key: "artist", label: t("identityCard.artistLabel"), entity: artist },
    album && { key: "album", label: t("identityCard.albumLabel"), entity: album },
    anthem && { key: "anthem", label: t("showcase.anthemHeading"), entity: anthem },
  ].filter((slot): slot is { key: string; label: string; entity: NonNullable<typeof artist> } => Boolean(slot));

  return (
    <section className="flex w-full max-w-2xl items-start gap-4 sm:gap-8">
      {slots.map((slot) => (
        <Link
          key={slot.key}
          href={targetHref(slot.entity.type, slot.entity.id)}
          className="group flex flex-1 flex-col items-center gap-2 text-center"
        >
          <CoverThumb
            cover={slot.entity.coverThumbUrl}
            label=""
            className="size-16 shrink-0 rounded-full border border-ink-border transition-colors group-hover:border-amber sm:size-20"
          />
          <span className="min-w-0">
            <span className="block font-data text-[0.65rem] uppercase tracking-wide text-paper-muted">
              {slot.label}
            </span>
            <span className="mt-1 block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
              {slot.entity.title}
            </span>
            {slot.entity.artistName && (
              <span className="block truncate font-data text-xs text-paper-muted">
                {slot.entity.artistName}
              </span>
            )}
          </span>
        </Link>
      ))}
    </section>
  );
}

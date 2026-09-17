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
export async function IdentityCard({ identityCard }: IdentityCardProps) {
  const t = await getTranslations("users");
  const { artist, album, anthem } = identityCard;

  if (!artist && !album && !anthem) return null;

  const slots = [
    artist && { key: "artist", label: t("identityCard.artistHeading"), entity: artist },
    album && { key: "album", label: t("identityCard.albumHeading"), entity: album },
    anthem && { key: "anthem", label: t("showcase.anthemHeading"), entity: anthem },
  ].filter((slot): slot is { key: string; label: string; entity: NonNullable<typeof artist> } => Boolean(slot));

  return (
    <section className="flex w-full max-w-2xl flex-col divide-y divide-ink-border border-y border-ink-border sm:flex-row sm:divide-x sm:divide-y-0">
      {slots.map((slot) => (
        <Link
          key={slot.key}
          href={targetHref(slot.entity.type, slot.entity.id)}
          className="group flex flex-1 items-start gap-3 py-4 transition-colors first:pt-0 last:pb-0 sm:px-4 sm:py-2 sm:first:pl-0 sm:last:pr-0"
        >
          <CoverThumb cover={slot.entity.coverThumbUrl} label="" className="size-16 shrink-0 rounded" />
          <span className="min-w-0">
            <span className="block font-data text-xs text-paper-muted">{slot.label}</span>
            <span className="mt-1.5 block truncate font-display text-lg text-paper transition-colors group-hover:text-amber">
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

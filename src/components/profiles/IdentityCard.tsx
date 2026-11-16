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
// derivados de actividad. Es el Nivel 1 del perfil y vive en la cabecera bajo
// «Identidad musical» (openspec: redesign-user-profile-phase1). No se
// renderiza si los tres elementos están ausentes (spec `profile-showcase`,
// "Ningún elemento de identidad"). Server Component.
//
// Tres columnas de igual ancho con `min-w-0`: a 390 px las tres caben y los
// títulos largos se recortan en dos líneas en vez de empujar el himno fuera de
// la pantalla. El artista va en círculo (su foto, ADR 0021), el álbum y el
// himno con su carátula cuadrada. Con uno o dos elementos, las columnas
// conservan su tamaño: se compone con lo que exista, sin huecos de relleno.
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
    <section aria-labelledby="identidad-musical" className="flex w-full min-w-0 max-w-[32.5rem] flex-col gap-3">
      <h2
        id="identidad-musical"
        className="font-data text-[0.6875rem] uppercase tracking-[0.12em] text-paper-muted"
      >
        {t("identityCard.heading")}
      </h2>
      <ul className="grid grid-cols-3 gap-3 sm:gap-4">
        {slots.map((slot) => (
          // El elemento con el cursor o el foco sube de capa: su vinilo pasa por encima del vecino.
          <li key={slot.key} className="relative min-w-0 hover:z-10 focus-within:z-10">
            <Link
              href={targetHref(slot.entity.type, slot.entity.id, slot.entity.title, slot.entity.artistName ?? null)}
              className="group flex min-w-0 flex-col gap-2"
            >
              <span className="relative block">
                {slot.key !== "artist" && <Vinyl />}
                <CoverThumb
                  cover={slot.entity.coverThumbUrl}
                  label=""
                  className={`z-[1] aspect-square w-full border border-ink-border shadow-[0_18px_32px_-20px_#000] transition-colors group-hover:border-amber ${
                    slot.key === "artist" ? "rounded-full" : "rounded-md"
                  }`}
                />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-data text-[0.625rem] uppercase tracking-wide text-paper-muted">
                  {slot.label}
                </span>
                <span className="line-clamp-2 break-words font-display text-sm leading-snug text-paper transition-colors group-hover:text-amber">
                  {slot.entity.title}
                </span>
                {slot.entity.artistName && (
                  <span className="truncate font-data text-xs text-paper-muted">{slot.entity.artistName}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Vinilo que asoma de la funda (spec profile-showcase, "Vinilo que asoma en la Tarjeta de
// Identidad"; openspec: redesign-user-profile-phase3): un disco detrás de la carátula del
// álbum y del himno, con la etiqueta en el tono del perfil, que sale a medias con el cursor
// o el foco del teclado. Sin cursor (táctil) asoma apenas y quieto; con movimiento reducido
// no se anima. Decorativo: oculto a lectores de pantalla.
function Vinyl() {
  return (
    <span
      aria-hidden="true"
      data-vinyl=""
      className="absolute inset-[4%] rounded-full shadow-[0_10px_24px_-12px_#000] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[36%] group-hover:rotate-[40deg] group-focus-visible:translate-x-[36%] group-focus-visible:rotate-[40deg] motion-reduce:transition-none [@media(hover:none)]:translate-x-[14%]"
      style={{
        background:
          "repeating-radial-gradient(circle at center, #0d0c0a 0 1.5px, #1d1a16 1.5px 3px)",
      }}
    >
      <span className="absolute inset-[34%] rounded-full bg-[var(--profile-tone,var(--color-amber))]" />
      <span className="absolute inset-[48%] rounded-full bg-ink" />
    </span>
  );
}

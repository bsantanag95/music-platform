import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";

interface BandAction {
  href: string;
  label: string;
}

/** Pila de tres fundas, decorativa: muestra lo que se puede armar con las listas de la propia página. */
function SleeveStack({ covers }: { covers: string[] }) {
  const shown = covers.slice(0, 3);
  if (shown.length === 0) return null;
  const place = ["left-0 top-3 -rotate-6 brightness-75", "left-5 top-1.5 -rotate-2 brightness-90", "left-10 top-0 rotate-3"];
  return (
    <div aria-hidden="true" className="relative hidden h-24 w-36 shrink-0 sm:block">
      {shown.map((cover, index) => (
        <span key={`${cover}-${index}`} className={`absolute size-20 shadow-[0_14px_24px_-14px_rgba(0,0,0,0.95)] ${place[index]}`}>
          <CoverThumb cover={cover} label="" className="size-full rounded ring-1 ring-ink" />
        </span>
      ))}
    </div>
  );
}

/**
 * Banda de `/lists` (openspec: redesign-lists-phase3): una invitación dentro del recorrido, con la misma superficie que el resto
 * de la página. La usan la invitación a crear cuenta sin sesión y el estado vacío global.
 */
export function ListsBand({
  headingId,
  title,
  description,
  primary,
  secondary,
  covers = [],
}: {
  headingId: string;
  title: string;
  description: string;
  primary: BandAction;
  secondary?: BandAction;
  covers?: string[];
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex w-full flex-col gap-5 rounded-2xl border border-ink-border bg-ink-surface px-6 py-6 sm:flex-row sm:items-center sm:gap-8 sm:px-8"
    >
      <SleeveStack covers={covers} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id={headingId} className="font-display text-2xl font-bold tracking-[-0.015em] text-paper">
          {title}
        </h2>
        <p className="max-w-[60ch] font-body text-paper-muted">{description}</p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:items-center lg:flex-row lg:gap-4">
        <Link
          href={primary.href}
          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md bg-amber px-5 font-display text-sm font-medium text-ink transition-colors hover:bg-amber-hover"
        >
          {primary.label}
        </Link>
        {secondary ? (
          <Link
            href={secondary.href}
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap font-data text-sm text-paper-muted transition-colors hover:text-paper"
          >
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

// Invitación a crear una cuenta de `/lists` sin sesión (redesign-lists-phase2, forma final en redesign-lists-phase3): después del
// lector, con una pila de fundas de las listas de la página.
export async function ListsSignUpBand({ covers = [] }: { covers?: string[] }) {
  const t = await getTranslations("lists");
  return (
    <ListsBand
      headingId="lists-join-heading"
      title={t("community.rail.joinTitle")}
      description={t("community.rail.joinDescription")}
      primary={{ href: "/auth/register", label: t("community.rail.joinAction") }}
      secondary={{ href: "/auth/login", label: t("community.rail.signIn") }}
      covers={covers}
    />
  );
}

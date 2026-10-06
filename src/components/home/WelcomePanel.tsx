import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import { relativeFeedDate } from "@/components/feed/feed-dates";
import { Greeting } from "@/components/home/Greeting";
import { greetingKey } from "@/components/home/greeting-key";
import { QuickLinks } from "@/components/home/QuickLinks";
import type { FeedComment, FeedListenEntry, FeedRating, FeedReview } from "@/services/feed/feed";

export { greetingKey } from "@/components/home/greeting-key";

type LastTouch = FeedListenEntry | FeedRating | FeedComment | FeedReview;

interface WelcomePanelProps {
  name: string;
  username: string;
  lastActivity: LastTouch | null;
  // Inyectable para test; en producción siempre es "ahora".
  now?: Date;
}

export function lastTouchKey(
  kind: LastTouch["kind"],
): "lastTouchListen" | "lastTouchRating" | "lastTouchComment" | "lastTouchReview" {
  if (kind === "rating") return "lastTouchRating";
  if (kind === "comment") return "lastTouchComment";
  if (kind === "review") return "lastTouchReview";
  return "lastTouchListen";
}

// Panel de bienvenida de Inicio con sesión: saludo con hora del día + "última
// vez" (reutiliza la primera entrada de "Tu rastro reciente", sin fetch
// propio) + accesos rápidos, todo en una sola superficie tonal (misma receta
// que OnboardingPrompt/ResumeList) en vez del saludo de texto suelto que
// había antes. Ver docs/05-features/home.md.
export async function WelcomePanel({ name, username, lastActivity, now = new Date() }: WelcomePanelProps) {
  const tHome = await getTranslations("home");

  return (
    <section className="relative grid w-full max-w-3xl gap-6 overflow-hidden rounded-lg border border-ink-border bg-ink-surface p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-6">
      {/* Halo ámbar tenue detrás del saludo: da calidez sin competir con el contenido. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-amber/[0.07] blur-3xl"
      />

      <div className="relative flex min-w-0 flex-col gap-4">
        <p className="text-balance font-display text-2xl leading-tight tracking-tight text-paper sm:text-[1.75rem]">
          <Greeting
            initialKey={greetingKey(now)}
            morning={tHome("greetingMorning")}
            afternoon={tHome("greetingAfternoon")}
            evening={tHome("greetingEvening")}
          />
          {", "}
          <Link
            href={`/users/${encodeURIComponent(username)}`}
            className="rounded-sm text-amber underline decoration-amber/30 decoration-1 underline-offset-[6px] transition-colors hover:text-amber-hover hover:decoration-amber-hover"
          >
            {name}
          </Link>
        </p>

        {lastActivity ? (
          <Link
            href={targetHref(
              lastActivity.target.type,
              lastActivity.target.id,
              lastActivity.target.title,
              lastActivity.target.artistName ?? null,
            )}
            className="group flex items-center gap-3.5 rounded-md border border-ink-border bg-ink/70 p-2.5 pr-4 transition-[background-color,border-color] duration-150 hover:border-amber/60 hover:bg-ink"
          >
            <CoverThumb
              cover={lastActivity.target.coverThumbUrl}
              label=""
              className="size-14 shrink-0 shadow-md shadow-black/40"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-data text-[0.6875rem] uppercase tracking-wider text-paper-muted">
                <span>{tHome("lastTouchEyebrow")}</span>
                <span aria-hidden="true" className="text-ink-border">
                  ·
                </span>
                <span className="normal-case tracking-normal">
                  {await relativeFeedDate(lastActivity.createdAt)}
                </span>
              </span>
              <span className="mt-1 block truncate font-display text-base text-paper transition-colors group-hover:text-amber">
                {tHome(lastTouchKey(lastActivity.kind), { title: lastActivity.target.title })}
              </span>
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4 shrink-0 text-paper-muted transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-amber"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        ) : (
          <p className="max-w-sm rounded-md border border-dashed border-ink-border p-3 font-body text-sm text-paper-muted">
            {tHome("lastTouchEmpty")}
          </p>
        )}
      </div>

      <div className="relative">
        <QuickLinks />
      </div>
    </section>
  );
}

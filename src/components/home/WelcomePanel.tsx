import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import { relativeFeedDate } from "@/components/feed/feed-dates";
import { Greeting } from "@/components/home/Greeting";
import { greetingKey } from "@/components/home/greeting-key";
import { QuickLinks } from "@/components/home/QuickLinks";
import type { FeedComment, FeedListenEntry, FeedRating } from "@/services/feed/feed";

export { greetingKey } from "@/components/home/greeting-key";

type LastTouch = FeedListenEntry | FeedRating | FeedComment;

interface WelcomePanelProps {
  name: string;
  username: string;
  lastActivity: LastTouch | null;
  // Inyectable para test; en producción siempre es "ahora".
  now?: Date;
}

export function lastTouchKey(kind: LastTouch["kind"]): "lastTouchListen" | "lastTouchRating" | "lastTouchComment" {
  if (kind === "rating") return "lastTouchRating";
  if (kind === "comment") return "lastTouchComment";
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
    <section className="grid w-full max-w-3xl gap-6 rounded-lg border border-ink-border bg-ink-surface p-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
      <div className="flex flex-col gap-4">
        <p className="text-balance font-display text-2xl text-paper">
          <Greeting
            initialKey={greetingKey(now)}
            morning={tHome("greetingMorning")}
            afternoon={tHome("greetingAfternoon")}
            evening={tHome("greetingEvening")}
          />
          {", "}
          <Link
            href={`/users/${encodeURIComponent(username)}`}
            className="underline decoration-paper-muted decoration-1 underline-offset-4 transition-colors hover:text-amber hover:decoration-amber"
          >
            {name}
          </Link>
        </p>

        {lastActivity ? (
          <Link
            href={targetHref(lastActivity.target.type, lastActivity.target.id)}
            className="group flex items-center gap-3 rounded-md border border-ink-border bg-ink p-3 transition-colors hover:border-amber"
          >
            <CoverThumb cover={lastActivity.target.coverThumbUrl} label="" className="size-12" />
            <span className="min-w-0 flex-1">
              <span className="block font-data text-xs uppercase tracking-wide text-paper-muted">
                {tHome("lastTouchEyebrow")}
              </span>
              <span className="mt-0.5 block truncate font-display text-base text-paper transition-colors group-hover:text-amber">
                {tHome(lastTouchKey(lastActivity.kind), { title: lastActivity.target.title })}
              </span>
              <span className="font-data text-xs text-paper-muted">
                {await relativeFeedDate(lastActivity.createdAt)}
              </span>
            </span>
          </Link>
        ) : (
          <p className="max-w-sm font-body text-sm text-paper-muted">{tHome("lastTouchEmpty")}</p>
        )}
      </div>

      <QuickLinks />
    </section>
  );
}

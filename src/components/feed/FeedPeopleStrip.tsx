"use client";

import { useTranslations } from "next-intl";
import { AuthorAvatar } from "./FeedActivityList";
import type { AuthorSummary } from "@/lib/api/schemas";

interface FeedPeopleStripProps {
  authors: AuthorSummary[];
  // Nombre de usuario elegido; `""` es "Todas".
  active: string;
  // Ids con actividad nueva desde la última visita: llevan punto y van primero.
  withNews: ReadonlySet<string>;
  onChange: (username: string) => void;
}

// Franja de personas de `/me/feed` (redesign-feed-people, D5): la gente como entrada principal del feed, en lugar
// del `<select>` de autor. Botones con `aria-pressed` en una sola fila desplazable; elegir otra vez a la persona activa
// vuelve a "Todas". El punto de novedades lleva texto para lectores de pantalla.
export function FeedPeopleStrip({ authors, active, withNews, onChange }: FeedPeopleStripProps) {
  const t = useTranslations("feed");
  // Con novedades primero; dentro de cada grupo se conserva el orden alfabético del servidor.
  const ordered = [...authors.filter((a) => withNews.has(a.id)), ...authors.filter((a) => !withNews.has(a.id))];

  return (
    <div
      role="group"
      aria-label={t("people.label")}
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <PersonButton selected={active === ""} label={t("people.all")} onClick={() => onChange("")}>
        <span
          aria-hidden="true"
          className="inline-flex size-10 items-center justify-center rounded-full border border-ink-border font-data text-sm text-paper-muted"
        >
          ∗
        </span>
      </PersonButton>
      {ordered.map((author) => {
        const selected = author.username === active;
        const name = author.displayName ?? `@${author.username}`;
        return (
          <PersonButton
            key={author.id}
            selected={selected}
            label={name}
            hint={withNews.has(author.id) ? t("people.hasNews") : undefined}
            onClick={() => onChange(selected ? "" : author.username)}
          >
            <span className="relative">
              <AuthorAvatar author={author} size="lg" />
              {withNews.has(author.id) ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-ink bg-amber"
                />
              ) : null}
            </span>
          </PersonButton>
        );
      })}
    </div>
  );
}

function PersonButton({
  selected,
  label,
  hint,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`group flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-md px-1 py-1.5 font-data text-[11px] transition-colors ${
        selected ? "text-paper" : "text-paper-muted hover:text-paper"
      }`}
    >
      <span
        className={`rounded-full p-0.5 ring-2 transition-colors ${
          selected ? "ring-amber" : "ring-transparent group-hover:ring-ink-border"
        }`}
      >
        {children}
      </span>
      <span className="w-full truncate text-center">{label}</span>
      {hint ? <span className="sr-only">{`, ${hint}`}</span> : null}
    </button>
  );
}

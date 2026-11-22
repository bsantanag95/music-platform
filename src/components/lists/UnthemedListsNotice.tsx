"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { getMyLists, updateList } from "@/lib/api/lists";
import { queryKeys } from "@/lib/query/keys";
import type { ListTheme } from "@/lib/api/schemas";
import { ListThemePicker } from "./ListThemeFields";

const FIRST = 5;
const ALL = 50;

/**
 * Aviso de clasificación de `/me/lists` (openspec: add-list-themes-phase1): cuántas listas propias no tienen tema y, por
 * cada una, los temas en chips. Elegir uno guarda con la misma edición de lista (`PATCH`) y la saca del aviso. Nunca
 * sugiere ni preselecciona un tema a partir del título.
 */
export function UnthemedListsNotice({ count }: { count: number }) {
  const t = useTranslations("lists.theme");
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(FIRST);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  const params = { theme: "none" as const };
  const { data } = useQuery({
    queryKey: [...queryKeys.myLists(params), limit],
    queryFn: () => getMyLists(1, limit, params),
    enabled: count > 0,
    staleTime: 15_000,
  });

  if (count === 0) return null;
  const lists = data?.lists ?? [];

  const assign = async (id: string, title: string, theme: ListTheme) => {
    setBusyId(id);
    setFailedId(null);
    try {
      await updateList(id, { theme });
      setAnnounce(t("unthemedAssigned", { title, theme: t(`names.${theme}`) }));
      await queryClient.invalidateQueries({ queryKey: ["lists", "mine"], exact: false });
    } catch {
      setFailedId(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      aria-labelledby="unthemed-lists-title"
      className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-surface p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="unthemed-lists-title" className="font-display text-lg text-paper">
          {t("unthemedTitle", { count })}
        </h2>
        <p className="font-body text-sm text-paper-muted">{t("unthemedDescription")}</p>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
      <ul className="flex flex-col">
        {lists.map((list) => (
          <li
            key={list.id}
            aria-busy={busyId === list.id}
            className="flex flex-col gap-2 border-t border-ink-border py-3 first:border-t-0 first:pt-0"
          >
            <span className="font-display text-sm text-paper">{list.title}</span>
            <ListThemePicker
              name={`unthemed-${list.id}`}
              variant="chips"
              value={null}
              legend={t("label")}
              onChange={(theme) => void assign(list.id, list.title, theme)}
            />
            {failedId === list.id ? (
              <span role="alert" className="font-data text-xs text-danger">
                {t("unthemedError")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {count > lists.length && limit < ALL ? (
        <button
          type="button"
          onClick={() => setLimit(ALL)}
          className="inline-flex min-h-11 w-fit items-center font-data text-sm text-paper-muted underline decoration-dotted hover:text-paper"
        >
          {t("unthemedSeeAll")}
        </button>
      ) : null}
    </section>
  );
}

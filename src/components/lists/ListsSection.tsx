"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { ListForm } from "./ListForm";
import { LISTS_TABS, type ListsTab } from "./lists-tabs";

export { parseListsTab, LISTS_TABS, type ListsTab } from "./lists-tabs";

interface ListsSectionContextValue {
  /** Una pestaña informa su total (suma de `counts`) cada vez que recibe una respuesta (D4). */
  reportTotal: (tab: ListsTab, total: number) => void;
  /** Abre el diálogo de "Nueva lista" (el estado vacío de Mis listas lo usa). */
  openNewList: () => void;
}

const ListsSectionContext = createContext<ListsSectionContextValue>({
  reportTotal: () => {},
  openNewList: () => {},
});

export function useListsSection() {
  return useContext(ListsSectionContext);
}

// Sección /me/lists (openspec: redesign-me-lists-toolbar): cabecera con "Nueva lista" en las dos pestañas, pestañas
// Mis listas y Guardadas con su total y un enlace a Comunidad, donde vive Descubrir (D5). La pestaña activa vive en
// `?tab=` para ser enlazable y sobrevivir a la recarga; cada cambio de pestaña es una navegación (el panel se resuelve en
// el servidor). Semántica de tablist con flechas, con `<Link>` porque la fuente de verdad es la URL.
export function ListsSection({
  activeTab,
  initialTotals,
  initialNewListOpen = false,
  children,
}: {
  activeTab: ListsTab;
  /** Totales de cada pestaña leídos en el servidor; luego los actualiza la pestaña activa. */
  initialTotals: Record<ListsTab, number>;
  /** `?new=1` (el botón "Crear lista" de `/lists`): abre el diálogo al cargar. */
  initialNewListOpen?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("lists");
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [totals, setTotals] = useState(initialTotals);
  const [newListOpen, setNewListOpen] = useState(initialNewListOpen);

  const reportTotal = useCallback(
    (tab: ListsTab, total: number) =>
      setTotals((current) =>
        current[tab] === total ? current : { ...current, [tab]: total },
      ),
    [],
  );
  const context = useMemo(
    () => ({ reportTotal, openNewList: () => setNewListOpen(true) }),
    [reportTotal],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const i = LISTS_TABS.indexOf(activeTab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (i + 1) % LISTS_TABS.length
        : (i - 1 + LISTS_TABS.length) % LISTS_TABS.length;
    const next = LISTS_TABS[nextIndex]!;
    document.getElementById(`lists-tab-${next}`)?.focus();
    document.getElementById(`lists-tab-${next}`)?.click();
  };

  return (
    <ListsSectionContext.Provider value={context}>
      <div className="flex w-full flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
            <p className="font-body text-sm text-paper-muted">
              {t("description")}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <button
              type="button"
              onClick={() => setNewListOpen(true)}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start rounded-md border border-amber bg-amber px-3.5 font-display text-sm text-ink transition-colors hover:bg-amber-hover sm:self-auto [@media(pointer:coarse)]:min-h-11"
            >
              <span aria-hidden>+</span>
              {t("newList")}
            </button>
            {/* En pantallas angostas el enlace a Comunidad va junto al botón: en la fila de pestañas ocupaba una fila propia. */}
            <Link
              href="/lists"
              className="inline-flex min-h-11 items-center font-data text-xs text-paper-muted transition-colors hover:text-amber sm:hidden"
            >
              {t("discoverLink")}
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-ink-border">
          <div
            role="tablist"
            aria-label={t("tablistLabel")}
            onKeyDown={onKeyDown}
            className="flex gap-6"
          >
            {LISTS_TABS.map((tab) => {
              const selected = tab === activeTab;
              return (
                <Link
                  key={tab}
                  id={`lists-tab-${tab}`}
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  href={{ pathname, query: tab === "mine" ? {} : { tab } }}
                  className={`-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 font-display text-sm transition-colors ${
                    selected
                      ? "border-amber text-paper"
                      : "border-transparent text-paper-muted hover:text-paper"
                  }`}
                >
                  {t(`tabs.${tab}`)}
                  <span className="font-data text-xs text-paper-muted">
                    {totals[tab]}
                  </span>
                </Link>
              );
            })}
          </div>
          <Link
            href="/lists"
            className="mb-2 ml-auto hidden min-h-8 items-center font-data text-xs sm:inline-flex text-paper-muted transition-colors hover:text-amber [@media(pointer:coarse)]:min-h-11"
          >
            {t("discoverLink")}
          </Link>
        </div>

        <div role="tabpanel" aria-labelledby={`lists-tab-${activeTab}`}>
          {children}
        </div>
      </div>

      <Dialog
        open={newListOpen}
        title={t("newList")}
        onClose={() => setNewListOpen(false)}
      >
        <ListForm
          bare
          onCreated={() => {
            setNewListOpen(false);
            void queryClient.invalidateQueries({
              queryKey: ["lists", "mine"],
              exact: false,
            });
            // Desde Guardadas, la lista nueva está en Mis listas (D3).
            if (activeTab !== "mine") router.push("/me/lists");
          }}
          onCancel={() => setNewListOpen(false)}
        />
      </Dialog>
    </ListsSectionContext.Provider>
  );
}

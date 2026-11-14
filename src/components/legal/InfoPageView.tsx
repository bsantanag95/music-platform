import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

// Vista común de las páginas informativas y legales (Acerca de, Ayuda, Fuentes de datos,
// Términos, Privacidad, Cookies, Directrices). Es presentacional y no tiene i18n propio (convención
// de `components/`): recibe el texto ya traducido desde `src/lib/info-pages.ts`.

export interface InfoTable {
  caption: string;
  headers: string[];
  rows: string[][];
}

export interface InfoSection {
  id: string;
  title: string;
  paragraphs?: string[];
  /** Lista de puntos (p. ej. lo que todavía está por definir). */
  items?: string[];
  table?: InfoTable;
}

export interface InfoRelatedLink {
  href: string;
  label: string;
}

export interface InfoPageViewProps {
  title: string;
  lead: string;
  /** Aviso de "pendiente de revisión legal" — ausente en las páginas que no son políticas. */
  notice?: string;
  sections: InfoSection[];
  lastUpdated: string;
  tocLabel: string;
  relatedLabel: string;
  related: InfoRelatedLink[];
  /** Texto accesible para los enlaces externos (abren en una pestaña nueva). */
  newTabLabel: string;
}

// Con tantas secciones, un índice al inicio evita desplazarse a ciegas en un texto largo.
const MIN_SECTIONS_FOR_TOC = 5;

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const LINK_CLASS =
  "text-paper underline decoration-ink-border underline-offset-2 transition-colors hover:text-amber";

/**
 * Convierte `[texto](destino)` en enlaces: `/ruta` va por el `Link` localizado, `https://` abre en
 * pestaña nueva con aviso para lectores de pantalla y `mailto:` es un enlace simple. Es la única
 * marca que aceptan los textos; el resto se muestra tal cual.
 */
export function renderInline(text: string, newTabLabel: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const [whole, label = "", href = ""] = match;
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    if (href.startsWith("/")) {
      nodes.push(
        <Link key={start} href={href} className={LINK_CLASS}>
          {label}
        </Link>,
      );
    } else if (href.startsWith("mailto:")) {
      nodes.push(
        <a key={start} href={href} className={LINK_CLASS}>
          {label}
        </a>,
      );
    } else {
      nodes.push(
        <a key={start} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {label}
          <span className="sr-only"> ({newTabLabel})</span>
        </a>,
      );
    }
    last = start + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function InfoPageView({
  title,
  lead,
  notice,
  sections,
  lastUpdated,
  tocLabel,
  relatedLabel,
  related,
  newTabLabel,
}: InfoPageViewProps) {
  const inline = (text: string) => renderInline(text, newTabLabel);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-3xl text-paper">{title}</h1>
        <p className="font-body text-lg text-paper-muted">{inline(lead)}</p>
        {notice ? (
          <p
            role="note"
            className="rounded-md border border-ink-border bg-ink-surface p-4 font-body text-sm text-paper-muted"
          >
            {inline(notice)}
          </p>
        ) : null}
      </header>

      {sections.length >= MIN_SECTIONS_FOR_TOC ? (
        <nav aria-label={tocLabel} className="rounded-md border border-ink-border p-4">
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-paper">
            {tocLabel}
          </h2>
          <ol className="mt-3 grid list-decimal gap-x-8 gap-y-1.5 pl-5 font-body text-sm text-paper-muted sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#info-${section.id}`}
                  className="transition-colors hover:text-paper focus-visible:text-paper"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`info-${section.id}`}
          className="flex flex-col gap-3"
        >
          <h2 id={`info-${section.id}`} className="scroll-mt-24 font-display text-xl text-paper">
            {section.title}
          </h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="font-body text-paper-muted">
              {inline(paragraph)}
            </p>
          ))}
          {section.items ? (
            <ul className="flex list-disc flex-col gap-2 pl-5 font-body text-paper-muted">
              {section.items.map((item) => (
                <li key={item}>{inline(item)}</li>
              ))}
            </ul>
          ) : null}
          {section.table ? <InfoTableView table={section.table} inline={inline} /> : null}
        </section>
      ))}

      <div className="flex flex-col gap-6 border-t border-ink-border pt-6">
        <nav aria-label={relatedLabel} className="flex flex-col gap-3">
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-paper">
            {relatedLabel}
          </h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 font-data text-sm">
            {related.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-paper-muted transition-colors hover:text-paper focus-visible:text-paper"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="font-data text-xs text-paper-muted">{lastUpdated}</p>
      </div>
    </main>
  );
}

function InfoTableView({
  table,
  inline,
}: {
  table: InfoTable;
  inline: (text: string) => ReactNode[];
}) {
  // Desde `sm` es una tabla normal. En móvil cada fila pasa a ser una tarjeta con la etiqueta de cada
  // columna encima de su valor (`data-label`): cuatro columnas de prosa no caben en 375 px. Al cambiar el
  // `display` algunos navegadores pierden la semántica de tabla, así que los roles van explícitos.
  return (
    <div className="rounded-md border border-ink-border sm:overflow-x-auto">
      <table
        role="table"
        aria-label={table.caption}
        className="w-full border-collapse text-left font-body text-sm max-sm:block"
      >
        <caption className="sr-only">{table.caption}</caption>
        <thead role="rowgroup" className="max-sm:sr-only">
          <tr role="row" className="border-b border-ink-border bg-ink-surface">
            {table.headers.map((header) => (
              <th
                key={header}
                role="columnheader"
                scope="col"
                className="px-3 py-2 font-display text-xs uppercase tracking-wide text-paper"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-sm:block">
          {table.rows.map((row) => (
            <tr
              key={row[0]}
              role="row"
              className="border-b border-ink-border align-top last:border-b-0 max-sm:block max-sm:px-3 max-sm:py-3"
            >
              {row.map((cell, index) =>
                index === 0 ? (
                  <th
                    key={index}
                    role="rowheader"
                    scope="row"
                    className="px-3 py-2 font-data text-xs font-bold text-paper max-sm:block max-sm:px-0 max-sm:pb-1 max-sm:pt-0 max-sm:text-sm"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={index}
                    role="cell"
                    data-label={table.headers[index]}
                    className="px-3 py-2 text-paper-muted max-sm:block max-sm:px-0 max-sm:py-1 max-sm:before:mb-0.5 max-sm:before:block max-sm:before:font-data max-sm:before:text-[0.7rem] max-sm:before:uppercase max-sm:before:tracking-wide max-sm:before:text-paper max-sm:before:content-[attr(data-label)]"
                  >
                    {inline(cell)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

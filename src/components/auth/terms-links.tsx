import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

// Etiquetas de `t.rich` para los textos de aceptación de los Términos (openspec: add-terms-acceptance):
// `<terms>` y `<privacy>` son enlaces a las páginas, en pestaña nueva para no sacar a la persona del
// formulario. Sin hooks ni estado: lo usan tanto el formulario (cliente) como las páginas (servidor).
export function termsLinkTags(newTabLabel: string) {
  const link = (href: string) => {
    const tag = (chunks: ReactNode) => (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-paper underline decoration-ink-border underline-offset-2 transition-colors hover:text-amber"
      >
        {chunks}
        <span className="sr-only"> ({newTabLabel})</span>
      </Link>
    );
    return tag;
  };
  return { terms: link("/terms"), privacy: link("/privacy") };
}

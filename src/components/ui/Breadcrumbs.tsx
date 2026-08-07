import { Link } from "@/i18n/navigation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

// Breadcrumbs de navegación locale-aware. El último item representa la página
// actual y no se renderiza como enlace. Los datos musicales no se traducen.
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className="flex w-full">
      <ol className="flex flex-wrap items-center gap-1 font-data text-xs text-paper-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">/</span>}
              {isLast || !item.href ? (
                <span aria-current={isLast ? "page" : undefined} className="text-paper">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-paper"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

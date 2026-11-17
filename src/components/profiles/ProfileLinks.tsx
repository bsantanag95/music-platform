import { describeStoredLink } from "@/lib/profile-links";
import { LinkKindIcon } from "./LinkKindIcon";
import type { ProfileView } from "@/services/profiles/profile-view";

interface ProfileLinksProps {
  links: ProfileView["links"];
  /** Traductor del namespace `users`, resuelto por el Server Component que lo compone. */
  t: (key: string, values?: Record<string, string | number>) => string;
}

// Enlaces externos del perfil como íconos de su sitio, sin texto visible (spec
// profile-identity, "Enlaces como íconos en el perfil"): el nombre accesible y
// el tooltip llevan el sitio y el usuario o el dominio. Un enlace de un tipo
// por usuario que no coincide con su sitio (dato anterior a la validación) usa
// el ícono genérico. Los dibuja la cabecera del perfil, con y sin acceso.
export function ProfileLinks({ links, t }: ProfileLinksProps) {
  if (links.length === 0) return null;
  return (
    <ul aria-label={t("profileLinksLabel")} className="flex flex-wrap gap-2">
      {links.map((link) => {
        const info = describeStoredLink(link.kind, link.url);
        const site = t(`linkKind.${link.kind}`);
        const label = info.detail ? t("linkAria", { site, detail: info.detail }) : site;
        return (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={label}
              title={label}
              className="inline-flex size-9 items-center justify-center rounded border border-ink-border text-paper-muted transition-colors hover:border-amber hover:text-paper"
            >
              <LinkKindIcon kind={link.kind} generic={!info.consistent} className="size-[1.1rem]" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

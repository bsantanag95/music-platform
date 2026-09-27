import { useTranslations } from "next-intl";

// Etiquetas de versión de una grabación (openspec: redesign-song-page, `song-versions`): una
// por atributo del vínculo con la obra (`live`, `cover`, `instrumental`, …), traducida, o el
// texto de MusicBrainz si no hay traducción. Sirve en la lista del álbum, en las pistas
// adicionales y en la página de canción.

interface VersionAttributeTagsProps {
  attributes: string[];
  className?: string;
}

export function VersionAttributeTags({ attributes, className = "ml-2" }: VersionAttributeTagsProps) {
  const t = useTranslations("catalog.versionAttributes");
  if (attributes.length === 0) return null;
  return (
    <>
      {attributes.map((attribute) => (
        <span
          key={attribute}
          className={`${className} rounded border border-ink-border px-1.5 py-0.5 align-middle font-data text-xs text-paper-muted`}
        >
          {t.has(attribute) ? t(attribute) : attribute}
        </span>
      ))}
    </>
  );
}

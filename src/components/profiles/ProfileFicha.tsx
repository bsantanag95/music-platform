import { hasMusicIdentity, type MusicIdentityData } from "@/lib/music-identity";

interface ProfileFichaProps {
  identity: MusicIdentityData;
  /**
   * Traductor del namespace `users`, resuelto una sola vez por el Server Component
   * que lo compone (síncrono a propósito, igual que `ProfileLinks`: un
   * componente async anidado no se resuelve al testear con `render()`).
   */
  t: (key: string, values?: Record<string, string | number>) => string;
  /** Nombres de los géneros elegidos, desde la taxonomía (openspec: add-genre-taxonomy). */
  genreLabels: Record<string, string>;
}

const LABEL = "font-data text-[11px] text-paper-muted";
const VALUE = "m-0 font-body text-[0.9375rem] leading-snug text-paper";

// La ficha de disco del perfil (spec profile-music-identity, "Ficha de la
// Placa"): etiquetas en tipografía de datos sobre su valor, como los créditos
// de un disco, en dos columnas dentro de la franja de identidad (openspec:
// redesign-user-profile-phase1). Cada fila se omite si está vacía y la ficha
// entera si la persona no completó nada, sin dejar hueco. Solo la dibuja un
// perfil accesible: no la usa la tarjeta del perfil privado. Nunca muestra
// números de actividad ni logros.
export function ProfileFicha({ identity, t, genreLabels }: ProfileFichaProps) {
  // Un género retirado u oculto no tiene etiqueta y se ignora (openspec: show-genres, D5).
  const shownGenres = identity.genres.filter((genre) => genre in genreLabels);
  if (!hasMusicIdentity({ ...identity, genres: shownGenres })) return null;

  const list = (namespace: string, keys: readonly string[]) =>
    keys.map((key) => t(`musicIdentity.${namespace}.${key}`)).join(" · ");

  return (
    <dl aria-label={t("musicIdentity.ficha.aria")} className="m-0 grid gap-x-5 gap-y-3 sm:grid-cols-2">
      {identity.selfRoles.length > 0 && (
        <div className="min-w-0">
          <dt className={LABEL}>{t("musicIdentity.ficha.roles")}</dt>
          <dd className={VALUE}>{list("roles", identity.selfRoles)}</dd>
        </div>
      )}
      {shownGenres.length > 0 && (
        <div className="min-w-0">
          <dt className={LABEL}>{t("musicIdentity.ficha.genres")}</dt>
          <dd className={VALUE}>{shownGenres.map((genre) => genreLabels[genre]).join(" · ")}</dd>
        </div>
      )}
      {identity.listeningFormats.length > 0 && (
        <div className="min-w-0">
          <dt className={LABEL}>{t("musicIdentity.ficha.formats")}</dt>
          <dd className={VALUE}>{list("formats", identity.listeningFormats)}</dd>
        </div>
      )}
      {identity.prompts.map((prompt) => (
        <PromptRow key={prompt.promptKey} promptKey={prompt.promptKey} answer={prompt.answer} t={t} />
      ))}
    </dl>
  );
}

// La etiqueta corta va sobre la respuesta; la pregunta completa va de tooltip.
function PromptRow({
  promptKey,
  answer,
  t,
}: {
  promptKey: string;
  answer: string;
  t: ProfileFichaProps["t"];
}) {
  return (
    <div className="min-w-0">
      <dt className={LABEL} title={t(`musicIdentity.prompts.${promptKey}.question`)}>
        {t(`musicIdentity.prompts.${promptKey}.short`)}
      </dt>
      <dd className={`${VALUE} italic`}>{answer}</dd>
    </div>
  );
}

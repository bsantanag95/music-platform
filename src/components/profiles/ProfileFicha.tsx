import { hasMusicIdentity, type MusicIdentityData } from "@/lib/music-identity";

interface ProfileFichaProps {
  identity: MusicIdentityData;
  /**
   * Traductor del namespace `users`, resuelto una sola vez por el Server Component
   * que lo compone (síncrono a propósito, igual que `ProfileIdentity`: un
   * componente async anidado no se resuelve al testear con `render()`).
   */
  t: (key: string, values?: Record<string, string | number>) => string;
}

const LABEL = "pt-0.5 font-data text-[11px] uppercase tracking-wide text-paper-muted";

// La ficha de disco de la Placa (spec profile-music-identity, "Ficha de la
// Placa"): etiquetas en tipografía de datos con su valor al lado, como los
// créditos de un disco. Cada fila se omite si está vacía y el bloque entero —con
// su divisor— si la persona no completó nada, sin dejar hueco. Solo la dibuja la
// Placa de un perfil accesible: no la usa la tarjeta del perfil privado. Nunca
// muestra números de actividad ni logros.
export function ProfileFicha({ identity, t }: ProfileFichaProps) {
  if (!hasMusicIdentity(identity)) return null;

  const list = (namespace: string, keys: readonly string[]) =>
    keys.map((key) => t(`musicIdentity.${namespace}.${key}`)).join(" · ");

  return (
    <>
      <hr className="border-0 border-t border-ink-border" />
      <dl
        aria-label={t("musicIdentity.ficha.aria")}
        className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2"
      >
        {identity.selfRoles.length > 0 && (
          <>
            <dt className={LABEL}>{t("musicIdentity.ficha.roles")}</dt>
            <dd className="m-0 font-body text-sm text-paper">{list("roles", identity.selfRoles)}</dd>
          </>
        )}
        {identity.genres.length > 0 && (
          <>
            <dt className={LABEL}>{t("musicIdentity.ficha.genres")}</dt>
            <dd className="m-0 font-body text-sm text-paper">{list("genres", identity.genres)}</dd>
          </>
        )}
        {identity.listeningFormats.length > 0 && (
          <>
            <dt className={LABEL}>{t("musicIdentity.ficha.formats")}</dt>
            <dd className="m-0 font-body text-sm text-paper">{list("formats", identity.listeningFormats)}</dd>
          </>
        )}
        {identity.prompts.map((prompt) => (
          <PromptRow key={prompt.promptKey} promptKey={prompt.promptKey} answer={prompt.answer} t={t} />
        ))}
      </dl>
    </>
  );
}

// La etiqueta corta cabe en la columna; la pregunta completa va de tooltip.
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
    <>
      <dt className={LABEL} title={t(`musicIdentity.prompts.${promptKey}.question`)}>
        {t(`musicIdentity.prompts.${promptKey}.short`)}
      </dt>
      <dd className="m-0 font-body text-sm italic text-paper">{answer}</dd>
    </>
  );
}

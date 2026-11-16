import { getTranslations } from "next-intl/server";
import { StripHeading } from "./StripHeading";

interface FingerprintSummaryProps {
  username: string;
  /** Etiqueta de la década predominante ("1980s"), o null si la huella no tiene décadas. */
  topDecade: string | null;
  /** Frases del resumen cualitativo, sin la de la década (ya destacada arriba). */
  phrases: string[];
}

// Resumen de la huella de gusto en la franja de identidad (spec
// `taste-fingerprint`, "Resumen cualitativo para los niveles 1 y 2"; openspec:
// redesign-user-profile-phase1): la década predominante como dato grande y las
// frases derivadas de la misma huella debajo, sin gráficos ni cifras. La huella
// completa (curvas, crestas) vive aparte, en la vista de Nivel 3, enlazada desde
// el rótulo. Server Component; no se renderiza sin datos.
export async function FingerprintSummary({ username, topDecade, phrases }: FingerprintSummaryProps) {
  if (!topDecade && phrases.length === 0) return null;
  const t = await getTranslations("users");

  return (
    <section aria-labelledby="huella-de-gusto" className="min-w-0">
      <StripHeading
        id="huella-de-gusto"
        link={{ href: `/users/${username}/fingerprint`, label: t("strip.fingerprintFull"), ariaLabel: t("level3.fingerprint") }}
      >
        {t("strip.fingerprint")}
      </StripHeading>
      {topDecade && (
        <>
          <p className="font-display text-5xl font-bold leading-[0.9] tracking-tight text-paper sm:text-[3.5rem]">
            {topDecade}
          </p>
          <p className="mt-2 font-data text-xs text-paper-muted">{t("strip.topDecade")}</p>
        </>
      )}
      {phrases.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {phrases.map((phrase) => (
            <li key={phrase} className="font-body text-sm text-paper-muted">
              {phrase}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

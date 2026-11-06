import { getLocale } from "next-intl/server";
import type { ShareTargetKind } from "@/lib/share/kinds";
import { sharePayloadFor } from "@/services/share/metadata";
import { loadShareTarget } from "@/services/share/targets";
import { loadProfileTargetByUsername } from "@/services/share/targets/profile";
import { ShareButton } from "./ShareButton";

// Botón Compartir de una página de destino (Server Component). Carga el objetivo como anónimo —el mismo que
// los metadatos, cacheado en el request— y le pasa a la hoja todo resuelto. Sin objetivo no hay botón.

type ShareActionProps = (
  | { kind: Exclude<ShareTargetKind, "profile">; refId: string }
  | { kind: "profile"; username: string }
) & {
  className?: string;
  /** Contenedor del botón: sin objetivo no se dibuja, así no deja un hueco en la página. */
  wrapperClassName?: string;
};

export async function ShareAction(props: ShareActionProps) {
  const locale = (await getLocale()) === "en" ? "en" : "es";
  const target =
    props.kind === "profile"
      ? await loadProfileTargetByUsername(props.username, locale)
      : await loadShareTarget(props.kind, props.refId, locale);
  if (!target) return null;
  const button = <ShareButton payload={sharePayloadFor(target)} className={props.className} />;
  return props.wrapperClassName ? <div className={props.wrapperClassName}>{button}</div> : button;
}

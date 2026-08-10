import type { AuthProviderProtocol, ExternalIdentity } from "./types";

/**
 * Traduce un perfil de proveedor ya validado a la identidad comun de la app.
 *
 * El adaptador no inicia OAuth, no intercambia authorization codes y no crea
 * sesiones: esas responsabilidades pertenecen al flujo de autenticacion
 * compartido que se implementara cuando se habilite un proveedor.
 */
export interface AuthProviderAdapter<TProfile = unknown> {
  readonly provider: string;
  readonly protocol: AuthProviderProtocol;
  toIdentity(profile: TProfile): ExternalIdentity;
}

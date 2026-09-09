import { apiFetch } from "./client";
import { OnboardingResponseSchema, type OnboardingResponse } from "./schemas";

/**
 * Cierra el onboarding de dos puertas: siembra los Álbumes favoritos de la
 * Puerta 1 (posiblemente vacíos) y marca al usuario como onboardeado.
 * Idempotente en el servidor.
 */
export function completeOnboarding(
  albumReleaseGroupIds: string[],
): Promise<OnboardingResponse> {
  return apiFetch("/api/me/onboarding", OnboardingResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ albumReleaseGroupIds }),
  });
}

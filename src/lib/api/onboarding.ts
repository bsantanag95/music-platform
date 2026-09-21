import { apiFetch } from "./client";
import { OnboardingResponseSchema, type OnboardingResponse } from "./schemas";

/**
 * Cierra el onboarding de dos puertas: crea los favoritos de álbum de la
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

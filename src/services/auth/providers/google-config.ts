export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
}

const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const scopes = process.env.GOOGLE_OAUTH_SCOPES ?? "openid email profile";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Faltan variables de Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI) en el entorno.",
    );
  }

  return { clientId, clientSecret, redirectUri, scopes };
}

export { GOOGLE_ISSUER, GOOGLE_AUTH_URL, GOOGLE_TOKEN_URL, GOOGLE_JWKS_URL };

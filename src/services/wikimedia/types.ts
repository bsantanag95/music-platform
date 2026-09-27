// Forma (recortada a lo que se usa) de las respuestas de las APIs de Wikimedia
// (openspec: enrich-artist-profile, ADR 0021).

export interface WDLangValue {
  language: string;
  value: string;
}

export interface WDClaim {
  mainsnak: { datavalue?: { value: unknown; type?: string } };
  rank?: "preferred" | "normal" | "deprecated";
  /** Calificadores del claim, p. ej. `P582` (fecha de fin) en un país histórico. */
  qualifiers?: Record<string, unknown[]>;
}

export interface WDEntity {
  id: string;
  missing?: string;
  labels?: Record<string, WDLangValue>;
  descriptions?: Record<string, WDLangValue>;
  sitelinks?: Record<string, { site: string; title: string }>;
  claims?: Record<string, WDClaim[]>;
}

export interface WDEntitiesResponse {
  entities?: Record<string, WDEntity>;
  error?: { code: string; info?: string };
}

export interface WPExtractPage {
  pageid?: number;
  title: string;
  missing?: boolean;
  extract?: string;
  fullurl?: string;
}

export interface WPExtractResponse {
  query?: { pages: WPExtractPage[] };
  error?: { code: string; info?: string };
}

export interface CommonsExtMetadataValue {
  value: string;
}

export interface CommonsImageInfo {
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  extmetadata?: Partial<Record<"LicenseShortName" | "LicenseUrl" | "Artist" | "NonFree" | "AttributionRequired", CommonsExtMetadataValue>>;
}

export interface CommonsImageInfoResponse {
  query?: { pages: { title: string; missing?: boolean; imageinfo?: CommonsImageInfo[] }[] };
  error?: { code: string; info?: string };
}

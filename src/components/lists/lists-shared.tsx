import type { ReactNode } from "react";

// Grilla de tarjetas de lista: una columna en mobile, dos desde `md`. Compartida
// por las tres pestañas de /me/lists y por el perfil ajeno.
export function ListsGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

const ENTITY_KEY: Record<string, "entityTypeArtist" | "entityTypeAlbum" | "entityTypeSong"> = {
  artist: "entityTypeArtist",
  "release-group": "entityTypeAlbum",
  recording: "entityTypeSong",
};

export function entityTypeKey(entityType: string) {
  return ENTITY_KEY[entityType] ?? "entityTypeArtist";
}

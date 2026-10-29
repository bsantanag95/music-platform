## Context

`listConnectionsPage` ya lee `user_follow.created_at` (para el orden Recientes y el cursor) pero no lo devuelve. La
afinidad entre dos personas existe (`getProfileAffinity`, spec `profile-affinity`), pero es una lectura completa por
par: no sirve para 50 filas.

## Decisions

### D1 — Desde cuándo

`listConnectionsPage` devuelve `followedAt` (ISO) de la relación listada. La fila lo muestra como mes y año, con el
verbo según la vista: "Te sigue desde" en tus Seguidores, "La sigues desde" en tus Seguidos, "Desde" en un perfil
ajeno (la relación es entre el dueño y la persona, no con quien mira). Sigue la línea de detalle de `/me/artists`:
`@usuario · Te sigue desde oct 2026 · 8 discos en común`, cada unidad sin partirse.

### D2 — Discos en común por lote

`countSharedAlbums(viewerId, ids)` en una consulta:

- Discos del visitante: `release_group` en sus favoritos o valorados con 4★ o más.
- Discos de cada persona, solo lo que el visitante puede ver: favoritos con audiencia `public`, o `followers` si el
  visitante la sigue (aceptada), y solo si su perfil es público o el visitante la sigue; valoraciones de 4★ o más solo
  si el visitante la sigue (mismo criterio que `getProfileAffinity`, donde las valoraciones las ven los seguidores).
- Cuenta distintos `release_group` en la intersección, por persona.

La fila lo muestra desde **3** (`SHARED_ALBUMS_MIN`): "1 disco en común" no dice nada y empuja a comparar. Nunca para
uno mismo, sin sesión ni con bloqueo. El endpoint lo devuelve como `sharedAlbums` (o `null` bajo el umbral) para que
"Mostrar más" y los filtros lo traigan igual.

Alternativa descartada: reutilizar `getProfileAffinity` por fila — 7 lecturas por persona.

### D3 — Panel lateral

`ConnectionsRail` (servidor, solo desde `lg`):

- Tus Seguidores: "Para seguir de vuelta", hasta 5 de `listConnectionsPage(segment: notBack, limit: 5)` con
  `FollowButton` ("Seguir de vuelta") y "Ver todos" hacia `?segment=notBack`.
- Perfil ajeno con sesión: "En común con <nombre>", con el total de seguidores en común
  (`getMutualFollowersPreview`) y enlace a la pestaña "Seguidos en común".

Sin contenido no se renderiza, y la página solo pasa a dos columnas (`max-w-6xl`) cuando lo hay, como `/me/artists`.
Se espera con `await` dentro de la vista (un componente asíncrono anidado no se pinta en las pruebas).

## Risks / Trade-offs

- `countSharedAlbums` escanea favoritos y valoraciones de hasta 50 personas por página: con los índices por usuario
  (`idx_favorite_user_created`, el de `rating`) queda acotado; se mide contra Postgres antes de cerrar.
- Las cifras del panel no se actualizan al seguir de vuelta desde la lista (sí desde el propio panel).

## 1. Datos

- [x] 1.1 Crear `drizzle/0081_rating_share.sql` (tabla `rating_share`, `CHECK` de `share_event`) y aplicarla en scratch
- [x] 1.2 Espejar en `src/db/schema.ts`, agregar `rating` y `listen` a `SHARE_TARGET_KINDS` y actualizar `docs/03-data/sql-model.md`
- [x] 1.3 Servicio de la marca (marcar, quitar, idempotente, solo álbum y canción propios) con pruebas
- [x] 1.4 `ownShareEvents` con valoraciones y escuchas; `rating_share` en la exportación de datos; pruebas

## 2. Imágenes

- [x] 2.1 `detailedScore` en `ShareCard` y `AuthorNote`; nota grande en la valoración; pruebas del renderizador
- [x] 2.2 `loadRatingTarget` (anónimo y modo dueño) con pruebas: marca, destacada, sin marca, perfil privado, artista
- [x] 2.3 `loadListenTarget` (anónimo y modo dueño) con pruebas: audiencia, destacada, cita, reacción, mes y año
- [x] 2.4 `?personal=1` en la ruta de imágenes (sesión, dueño, `private, no-store`, genérica al resto) con pruebas
- [x] 2.5 Textos en `messages/{es,en}/share.json`

## 3. Página de relación

- [x] 3.1 `src/services/profiles/relation.ts` (`getRelationView`) con pruebas por visitante: dueño, seguidor, anónimo, perfil privado, bloqueo
- [x] 3.2 Rutas `/users/[username]/album/[id]` y `/song/[id]`, componentes y `404`; pruebas
- [x] 3.3 `?escucha=` en la página (primera y marcada; ignorar lo no visible) con pruebas
- [x] 3.4 Metadatos y botón Compartir de la relación según la prioridad de la spec, con pruebas

## 4. API y hoja

- [x] 4.1 `GET/POST/DELETE /api/me/share/[kind]/[ref]` (`needs_gesture`, `private_profile`, `PROFILE_PRIVATE`, suspensión) con pruebas; `docs/04-api/contracts.md` y `errors.md`
- [x] 4.2 `ShareButton` con carga bajo demanda y estados en `ShareSheet`; pruebas de los tres estados y del paso sin cerrar
- [x] 4.3 Botón y "Dejar de compartir" en `AlbumRelationPanel` y `SongRelationPanel`, con pruebas
- [x] 4.4 Botón en las filas de `/me/diary`, sin escuchas de artista, con pruebas
- [x] 4.5 Regenerar `client-messages`

## 5. Documentación

- [x] 5.1 ADR nuevo: marca de valoración compartida e imagen privada del dueño
- [x] 5.2 `docs/05-features/sharing.md` (estado, inventario, D5) y `docs/01-domain/business-rules.md`
- [x] 5.3 Smoke `scripts/smoke-test-share-relation.ts` y su entrada en `AGENTS.md`

## 6. Verificación

- [x] 6.1 Smoke contra Postgres real: `updated_at` intacto, marca, cascada, relación por visitante, estados, `ownShareEvents`
- [x] 6.2 Revisión visual de las imágenes (es y en) con muestras PNG
- [x] 6.3 `curl` como anónimo, seguidor y dueño: metadatos, `404`, imagen personal sin caché
- [x] 6.4 Navegador en escritorio y a 375 px: flujo completo de la hoja desde panel y diario, con el build final
- [x] 6.5 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-06)

- `scripts/smoke-test-share-relation.ts` pasa contra Postgres real (BD de scratch): marca sin tocar `rating.updated_at`,
  idempotencia, edición, cascada, valoración de artista, objetivos como anónimo y dueño, relación por visitante, `?escucha=`,
  estados de la hoja, perfil privado y eventos al eliminar una cuenta. Esa lógica se prueba ahí y no con mocks: es SQL.
- HTTP sobre el build de producción: anónimo `404` con todo privado y `200` tras la marca; dueño `200`; API sin sesión `401`; imagen
  personal `private, no-store`, y genérica para un anónimo. Se revisaron los PNG de valoración y escucha.
- Navegador, con sesión de prueba y build final: en el panel, aviso, "Hacer pública y compartir", paso a la hoja normal sin cerrarse y
  "Dejar de compartir"; a 375 px en el diario, menú ⋯, aviso de la impresión y gesto; página de relación con `?escucha=`. Sin
  desplazamiento horizontal. El panel del navegador estaba oculto: se revisó por el DOM, sin capturas.
- Hallazgo corregido: tras "Dejar de compartir", una copia inmutable de la imagen seguiría en un CDN. Valoraciones y escuchas van
  siempre con la caché corta.
- Tiempos en producción: imagen de valoración 0,12–0,13 s. El worktree no tiene `public/uploads`, así que no se midió la descarga
  de carátulas locales.

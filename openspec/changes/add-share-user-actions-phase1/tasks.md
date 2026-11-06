## 1. Medición y tipos

- [x] 1.1 Crear `drizzle/0080_share_event_user_kinds.sql` (reemplaza `chk_share_event_target_kind`) y aplicarla en la BD de scratch
- [x] 1.2 Agregar `review`, `comment`, `list`, `camino`, `user_collection` y `fingerprint` a `SHARE_TARGET_KINDS`; actualizar `docs/03-data/sql-model.md`
- [x] 1.3 Borrar en `account-lifecycle.ts` los eventos de colección, huella, reseñas, comentarios, listas y Caminos de la cuenta, con pruebas (incluida la de que los de otra cuenta se conservan)

## 2. Moderación en la vista ajena

- [x] 2.1 Filtrar `moderation_status` en `getUserListDetail` y `getUserCaminoDetail` salvo para el dueño, con pruebas de ambos casos

## 3. Marco

- [x] 3.1 Sumar `quote`, `stars` y `byline` a `ShareCard` y dibujarlos en el renderizador (opcionales: no cambian la versión de las imágenes existentes)
- [x] 3.2 Pruebas del renderizador: cita larga, con estrellas (sin número) y sin nota

## 4. Objetivos

- [x] 4.1 `targets/user-content.ts`: objetivo de reseña (genérico si está oculta o la cuenta está desactivada), con pruebas
- [x] 4.2 Objetivo de lista (pública, `standard`, visible, no generada; mosaico o tipográfica), con pruebas
- [x] 4.3 Objetivo de Camino, sin progreso del dueño, con pruebas
- [x] 4.4 Objetivo de colección del perfil (solo entradas públicas), con pruebas
- [x] 4.5 Objetivo de huella (frases propias es/en, sin curva de valoraciones), con pruebas
- [x] 4.6 Textos en `messages/{es,en}/share.json` y despacho en `loadShareTarget`

## 5. Comentario

- [x] 5.1 `getCommentPermalink` en `social.ts` (objeto comentado, cuenta desactivada, bloqueo, respuesta → raíz), con pruebas
- [x] 5.2 Objetivo de comentario, con pruebas
- [x] 5.3 Página `/comment/[commentId]` con metadatos, redirección de respuestas, `404` y "Ver la conversación"; pruebas de la página
- [x] 5.4 `commentSharePayload` y botón Compartir en las filas raíz de `Comments`, sin consultas por fila; pruebas (también que las respuestas no lo muestran)
- [x] 5.5 `?thread=` en álbum y canción: traer la raíz, ponerla primera y desplazar; pruebas

## 6. Páginas

- [x] 6.1 Reseña: metadatos en `/review/<id>` y `ShareAction` en la página (en el modal se descartó: Escape cerraba hoja y modal a la vez)
- [x] 6.2 Lista y Camino: metadatos y `ShareAction` en la vista ajena y en `/me/lists/<id>` y `/me/caminos/<id>`
- [x] 6.3 Colección y huella: metadatos y `ShareAction` en la página del perfil, y `ShareAction` en `/me/collection`
- [x] 6.4 Ajustar las pruebas de esas páginas y regenerar `client-messages`

## 7. Documentación

- [x] 7.1 `docs/05-features/sharing.md`: inventario corregido (§3.1), estado y detalle final de lo implementado
- [x] 7.2 `docs/01-domain/business-rules.md`: valoraciones y comentarios sin audiencia propia; reglas nuevas de Compartir
- [x] 7.3 `docs/04-api/contracts.md`: tipos nuevos y ruta `/comment/<id>`

## 8. Verificación

- [x] 8.1 Revisión visual de cada imagen nueva (es y en) con muestras PNG
- [x] 8.2 `curl` como anónimo: metadatos de reseña, comentario, lista, Camino, colección y huella, y genérica en lo no público
- [x] 8.3 Navegador en escritorio y a 375 px: botón en cada página, comentario, `?thread=` en álbum y hoja sobre el modal de reseña (falló: botón solo en la página)
- [x] 8.4 Tiempo de generación en producción de lista y reseña contra el presupuesto de `sharing.md`
- [x] 8.5 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-06)

- `scripts/smoke-test-share-user-content.ts` pasa contra Postgres real (BD de scratch): objetivos como anónimo, dirección
  de un comentario (respuesta a raíz, oculto, cuenta desactivada, bloqueo), moderación de listas y Caminos, y borrado de
  eventos con la cuenta. `smoke-test-account-settings.ts` no llega a la eliminación: falla antes, en "su lista pública
  figura en el descubrimiento", código que este cambio no toca: por eso el borrado de eventos se prueba en el smoke nuevo.
- `curl` como anónimo sobre el build de producción: metadatos correctos en reseña, comentario de álbum y de artista, listas
  de discos, canciones y artistas, Camino, colección y huella (es y en). Un comentario inexistente da `404` y su imagen, la
  genérica. Lista privada: `404` y sin botón. Con sesión de dueño: botón en lista pública, Camino y colección, y sin botón
  en la lista privada; el enlace de la hoja es el de la vista pública.
- Navegador: hoja del comentario, "Ver la conversación" en un álbum (el comentario queda a la vista) y 375 px sin
  desplazamiento horizontal en huella, Camino y comentario. El panel estaba oculto: la revisión fue por el DOM y no por
  capturas. Las imágenes se revisaron como PNG.
- Hallazgo: con la hoja abierta sobre el modal de reseña, Escape cerraba los dos diálogos. El botón quedó solo en la página.
- Tiempos en producción, segundo pedido: lista 0,07–0,10 s, Camino 0,07 s, colección 0,08 s, huella 0,09–0,13 s, comentario
  0,11–0,15 s, reseña 0,19 s; primer pedido de reseña 0,58 s. Dentro del presupuesto de `sharing.md` (< 300 ms en caliente).
  El worktree no tiene `public/uploads`: varias imágenes salieron con recuadros y caché corta, así que no se midió la
  descarga de carátulas locales.

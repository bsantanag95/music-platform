## 1. Reseñas

- [x] 1.1 `ReviewIndex`: `emptyAction` dentro del bloque vacío; título «Todavía nadie reseñó este disco»
- [x] 1.2 `ReviewComposer compact`: solo la acción (login sin sesión, «Escribir reseña» con sesión), mismo ancla y formulario
- [x] 1.3 Página Reseñas: sin reseñas, el compositor compacto va como `emptyAction` y no se repite debajo
- [x] 1.4 Tests de reseñas: vacío sin sesión, vacío con sesión (abre el formulario), con reseñas sin cambios

## 2. Comentarios, pestaña y franja

- [x] 2.1 `Comments`: sin sesión y sin comentarios, una frase con el enlace; con comentarios, el enlace arriba
- [x] 2.2 `AlbumTabs`: contador de Reseñas solo con reseñas
- [x] 2.3 `DiscographyStrip`: `h2` a `text-xl`
- [x] 2.4 Tests de comentarios (álbum, artista, canción), pestañas y franja
- [x] 2.5 Mensajes (es/en): título del vacío de reseñas

## 3. Documentación y verificación

- [x] 3.1 `pnpm run i18n:client-messages`
- [x] 3.2 `docs/05-features/catalog-browsing.md`: una invitación por lugar; la propuesta A completa
- [x] 3.3 `pnpm run verify` y `pnpm run build`
- [x] 3.4 Navegador a 1440 y 390 px, sin sesión: Reseñas vacía, Comentarios vacíos en álbum, artista y canción, pestaña sin «0», franja

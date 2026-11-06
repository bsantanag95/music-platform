## 1. Formato

- [x] 1.1 `drizzle/0082_share_event_story.sql`, `story` en `SHARE_FORMATS` y `schema.ts`, y `docs/03-data/sql-model.md`
- [x] 1.2 `StoryFrame` y medios en vertical (vinilo, mosaico, foto, identidad, tipográfico) dentro de los márgenes seguros
- [x] 1.3 `format` en `renderShareImage` y en la ruta, también con `personal=1`; pruebas de tamaño, genérica y privada
- [x] 1.4 Revisión visual con muestras: disco, título largo, mosaico, foto, perfil, reseña larga, lista tipográfica y genérica

## 2. Caché

- [x] 2.1 `IMMUTABLE_KINDS` en la ruta: solo catálogo; reemplaza el caso de `rating` y `listen`; pruebas por tipo

## 3. Hoja

- [x] 3.1 `storyImageUrl` en el payload y selector de formato en `ShareSheet` y `OwnShareSheet`, con pruebas
- [x] 3.2 Archivo en "Compartir…" con `canShare`, con caída al enlace, y formato en el evento; pruebas
- [x] 3.3 `GET /api/share/payload/[kind]/[ref]` con límite por IP, `404` y pruebas; `docs/04-api/contracts.md`
- [x] 3.4 `LazyShareSheet` (carga, error, objeto que ya no se ve) con pruebas

## 4. Menús

- [x] 4.1 Compartir en `AlbumQuickActions`, para visitantes con y sin sesión, con pruebas
- [x] 4.2 Compartir en `MyListCardMenu` y `CaminoCardMenu`, solo si es público, con pruebas

## 5. Ofrecimiento

- [x] 5.1 `ShareOfferToast` sobre `UndoToast`, que no cambia; pruebas
- [x] 5.2 Reseña publicada en `ReviewComposer`, sin ofrecer al editar; pruebas
- [x] 5.3 Lista que pasa a pública en `ListDetail`; pruebas
- [x] 5.4 Camino público completado en `CaminoManager`; pruebas

## 6. Documentación

- [x] 6.1 `docs/05-features/sharing.md` (estado, D3, bloque A completo) y `docs/01-domain/business-rules.md`
- [x] 6.2 Regenerar `client-messages`

## 7. Verificación

- [x] 7.1 `curl`: tamaño de Historia, caché por tipo, payload y `404`
- [x] 7.2 Navegador con el build final, en escritorio y a 375 px: selector, menús ⋯ y aviso tras publicar una reseña
- [x] 7.3 Tiempo de generación de la Historia contra el presupuesto de `sharing.md` (< 800 ms en caliente)
- [x] 7.4 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-06)

- HTTP sobre el build de producción: Historia de 1080×1920 también para la genérica, formato inválido `400`; catálogo con caché inmutable,
  Camino con la corta aunque la versión coincida; payload `200` para un álbum y `404` `SHARE_TARGET_NOT_FOUND` para una lista privada.
- Navegador con sesión de prueba y build final, por el DOM (el panel estaba oculto, sin capturas): aviso al pasar una lista a pública, al
  publicar una reseña y al completar un Camino público, sin diálogo y sin robar el foco; desde el aviso se abre la hoja y sigue abierta
  después de los 6 s; selector de formato y descarga con sufijo; Compartir en el menú de un disco, con enlace canónico; 375 px sin
  desplazamiento horizontal. La lectura de 440 px fue del panel, que soltó la emulación: `innerWidth` también daba 440.
- No probado en un móvil real: compartir el archivo a Instagram. Solo se probó con `navigator.share` simulado.
- Muestras PNG revisadas: disco, título largo, mosaico, perfil y reseña larga. El contenido queda dentro de los márgenes de 250 px.
- **Presupuesto no cumplido:** la Historia tarda 0,89–0,97 s en caliente, contra 0,8 s en `sharing.md`; el Enlace, 0,21–0,26 s, y la primera
  Historia con una carátula remota, 4,1 s. El catálogo se genera una vez por
  versión; lo de una persona, cada 5 minutos si se pide.

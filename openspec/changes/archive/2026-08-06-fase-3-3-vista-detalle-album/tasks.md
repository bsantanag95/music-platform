## 1. Read-model y servicios de catálogo

- [x] 1.1 Crear `src/services/catalog/album-detail.ts` con el tipo y servicio del read-model de álbum que incluya `releaseGroup`, edición seleccionada, carátula, tracks y créditos.
- [x] 1.2 Implementar en el read-model la distinción entre `ALBUM_NOT_FOUND`, `NO_EDITIONS_FOUND` y detalle completo, reutilizando `findOrIngestTracklist`.
- [x] 1.3 Extraer al read-model la consulta de tracks y créditos, incluyendo `recordingId`, y ordenar explícitamente por disc_number ASC, position ASC y añadir un tercer criterio estable si la implementación lo requiere.
- [x] 1.4 Modificar `src/app/api/catalog/release-group/[id]/route.ts` para consumir el read-model y conservar exactamente el payload REST público actual.
- [x] 1.5 Actualizar `TrackSchema` en `src/lib/api/schemas.ts` para incluir `recordingId`, ya presente en la respuesta y el contrato REST.

## 2. Página y componentes del álbum

- [x] 2.1 Crear `src/app/[locale]/(catalog)/album/[id]/page.tsx` como Server Component que consuma directamente el read-model.
- [x] 2.2 Resolver `ALBUM_NOT_FOUND` con `notFound()` y renderizar `NO_EDITIONS_FOUND` mediante `EmptyState` con mensajes localizados.
- [x] 2.3 Crear `src/components/catalog/AlbumCover.tsx` con `next/image`, carátula miniatura del backend y fallback accesible sin construir URLs manualmente.
- [x] 2.4 Crear `src/components/catalog/TrackList.tsx` con agrupación visual por discNumber, orden recibido, posición, título y duración formateada como mm:ss, utilizando una etiqueta localizada cuando durationSec sea null.
- [x] 2.5 Mostrar los créditos como texto utilizando name, role y joinPhrase, sin generar enlaces hacia perfiles de artistas.
- [x] 2.6 Mantener los datos musicales sin traducir y resolver todos los textos de interfaz mediante el namespace `album`.
- [x] 2.7 Mapear explícitamente el read-model a props de presentación sin exponer tipos Drizzle ni el modelo interno a los componentes.

## 3. Internacionalización

- [x] 3.1 Agregar el namespace `album` a `messages/es/catalog.json` con títulos, etiquetas de disco, duración, créditos, carátula y estados.
- [x] 3.2 Agregar las mismas claves traducidas a `messages/en/catalog.json`.
- [x] 3.3 Verificar la consistencia recursiva de claves entre los catálogos `es` y `en`.

## 4. Pruebas

- [x] 4.1 Agregar pruebas del read-model o del route handler para álbum inexistente, álbum sin ediciones y payload compartido.
- [x] 4.2 Agregar pruebas de `TrackList` para álbum de uno y varios discos, orden por posición y duración nula.
- [x] 4.3 Agregar pruebas de créditos destacados visibles sin enlaces y ausencia de créditos adicionales cuando no corresponda.
- [x] 4.4 Agregar pruebas de `AlbumCover` para carátula disponible, carátula ausente y fallback accesible.
- [x] 4.5 Agregar pruebas de la página o su composición para español e inglés, sin traducir títulos musicales.

## 5. Documentación y validación

- [x] 5.1 Actualizar `docs/04-api/contracts.md` únicamente si la implementación modifica el shape público del endpoint; si no cambia, dejar constancia en la revisión de que el read-model es interno.
- [x] 5.2 Actualizar `docs/02-architecture/code-walkthrough.md` y el plan frontend para documentar el read-model compartido, el orden SQL y el estado de la Etapa 3.3 cuando corresponda.
- [x] 5.3 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`.
- [x] 5.4 Ejecutar el smoke test relevante contra Postgres real por la modificación de `src/services/catalog/` y verificar correctamente Pink Floyd, Roger Waters y un álbum multidisco.
- [x] 5.5 Verificar manualmente `/es/album/<id>` y `/en/album/<id>`, un álbum multidisco, un álbum sin carátula, un track con crédito y un álbum sin ediciones.

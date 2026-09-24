## Context

La página de álbum (`src/app/[locale]/(catalog)/album/[id]/page.tsx`) hoy es: breadcrumb,
carátula + título + año + `WorkTypeBadge`, **siete acciones apiladas en columna**
(`MarkAsListened`, `FavoriteButton`, `WantToListenButton`, `AddToListButton`,
`ShowInListsButton`, `ViewAllListsLink`, `CollectionAlbumAction`), `TrackList` y
`SocialSection` (rating dual + reseñas + comentarios, todo al pie).

La exploración (sesión del 2026-09-24) partió del objetivo "que Artista / Álbum / Canción
se sienta como una biblioteca" con Metal-Archives como referencia, y se hizo en este orden:
qué página primero → estructura en baja fidelidad → cabecera → pestaña Canciones.

Datos disponibles hoy frente a lo que la biblioteca pediría:

| Dato | Estado |
|---|---|
| Título, `category`, fecha canónica, carátula 250 px, edición representativa, tracklist, duraciones, créditos `primary`/`featured` | ✅ |
| `recording.variant_type` / `variant_of_id` | ✅ |
| `membership` (persona ↔ grupo, rol, fechas) | ✅ a nivel artista |
| Rating agregado (`count`, `averageStars`, `averageDetailedScore`) | ✅ |
| Reacciones de la comunidad por grabación (`recording-reactions.ts`, solo `public`) | ✅ |
| `collection_entry`, `wanted_entry`, `user_list_item` | ✅ (sin consultas de agregado) |
| Sello, créditos de personal, resumen de todas las ediciones, listas de otras ediciones | ❌ — cambio de datos aparte |
| Género (MusicBrainz), numeración de vinilo, créditos de composición | ❌ — sin planificar |

**Hallazgo verificado (2026-09-24, request pública a MusicBrainz sobre *The Dark Side of
the Moon*):** el lookup `/release-group/{id}?inc=releases+media` que usa hoy la ingesta
devuelve **25 ediciones de 150** (`release-count` del browse `/release?release-group=`). El
lookup parece ordenar por fecha ascendente (la original del 1973-03-24 es la primera), así
que la edición representativa acierta en este caso, pero es un orden no documentado: riesgo
latente, no bug observado. El browse, en 2 páginas de 100, trae `label-info` (sello y
catálogo), `media[].format`, `media[].track-count`, país, estado, embalaje y
desambiguación. Distribución de las ediciones oficiales por cantidad total de pistas: 9
(39 — misma lista con dos pistas fusionadas), 10 (65 — la original), 20 y 30 (4 y 8 —
ediciones dobles), 74, 152 y 193 (una cada una — cajas).

Restricción dura: la carátula es **miniatura de 250 px** por licencia
(`docs/03-data/data-licensing.md`); no existe una versión hero.

## Goals / Non-Goals

**Goals:**

- Página de álbum con lectura de ficha de catálogo: cabecera densa, contenido por pestañas,
  navegación rápida Artista ↔ Álbum ↔ Canción.
- Separar visual y estructuralmente las tres capas: **la obra** (ficha, canciones),
  **la comunidad** (agregados, reseñas, comentarios) y **lo personal** (panel "Tu relación").
- Resolver el problema de los siete botones mostrando estado en vez de acciones sueltas.
- Diseñar con los datos existentes dejando huecos para la fase 2, sin filas vacías.

**Non-Goals:**

- Ingerir sello, créditos de personal, resumen de ediciones o listas de otras ediciones
  (cambio de datos aparte, del que este depende solo para mostrar esas zonas).
- Páginas dedicadas por edición o formato (no somos Discogs): las ediciones se listan y
  sus pistas adicionales se muestran dentro de la página del álbum.
- Formación calculada por fechas de pertenencia: mostraría a quien era miembro ese año,
  no a quien tocó en el disco.
- Pestaña "Notas adicionales" (no hay fuente de datos con licencia clara).
- Letras (copyright).
- Rediseño de las páginas de Canción y Artista (siguen después y reutilizan estas piezas).

## Decisions

### D1. Orden de trabajo: Álbum → Canción → Artista

Álbum es la unidad cultural central y la página que define los componentes compartidos
(cabecera con carátula, bloque de rating, fila de pista). Canción es un álbum con menos
contenido; Artista es sobre todo organizador de piezas ya existentes.
*Descartado*: Artista primero (inventa piezas sin haberlas pensado) y Canción primero (la
página más delgada fija un lenguaje visual que queda corto).

### D2. Estructura: cabecera con panel lateral acotado + pestañas a ancho completo

```
┌─────────────────────────────────────────────────────────────────────┐
│ Breadcrumb                                                          │
├────────────┬──────────────────────────────────────┬─────────────────┤
│ Carátula   │ Antetítulo: tipo de obra             │ TU RELACIÓN     │
│ (≤250 px)  │ Título · Artista(s)                  │ ★ tu nota       │
│            │ Ficha técnica (grilla)               │ tu reseña       │
│            │ Comunidad: 4 cifras + histograma     │ escuchas · ♥ ·… │
├────────────┴──────────────────────────────────────┴─────────────────┤
│ Canciones │ Créditos  │ Ediciones │ Reseñas (N)                     │
├─────────────────────────────────────────────────────────────────────┤
│ Contenido de la pestaña (ancho completo)                            │
├─────────────────────────────────────────────────────────────────────┤
│ ◀ anterior · franja de discografía · siguiente ▶                    │
│ Comentarios                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

Se evaluaron tres variantes: **A** ficha con pestañas (Metal-Archives), **B** panel lateral
personal (Letterboxd), **C** página continua con índice fijo. Se eligió A + el panel de B,
con el panel **terminando donde empiezan las pestañas** para que la tracklist use el ancho
completo (la objeción a B era que comprimía títulos largos, duración y menú por pista).
*Descartado C*: deja reseñas y comentarios contiguos; las pestañas los separan mejor
(principio "Opinión ≠ conversación", `content-hierarchy.md`).

### D3. Pestañas con URL propia; Canciones siempre por defecto; contador solo en Reseñas

Una pestaña que solo existe en estado de React no se puede enlazar, rompe "atrás" y oculta
contenido a buscadores. Mecanismo recomendado: segmento de ruta
(`/album/{id}`, `/album/{id}/credits`, `/album/{id}/editions`, `/album/{id}/reviews`)
con un layout común que renderiza la cabecera una vez; alternativa aceptable:
`?tab=` (descartada en D15). La pestaña por defecto es
**siempre Canciones**: una biblioteca es predecible. Solo Reseñas lleva contador.

### D4. Comentarios fuera de las pestañas, al final

Las reseñas son obra (postura crítica con rating) y viven en su pestaña; los comentarios
son conversación y viven al pie, siempre visibles.

### D5. Reseñas: índice compacto + modal con URL propia

Híbrido Metal-Archives (índice que abre en modal) + Letterboxd (cada reseña tiene página).
Implementación: ruta real `/{locale}/review/[id]` + **ruta interceptada** desde la página
del álbum (rutas paralelas `@modal` + `(.)`/`(..)` de Next App Router). Clic en el índice →
modal sin perder pestaña ni scroll; URL directa, recarga o enlace compartido → página
completa. El índice muestra título (o, si no hay, un extracto del cuerpo), nota, autor y
fecha; ordenable por recientes, mejor nota y peor nota. En el modal: anterior / siguiente
dentro del índice y "abrir página completa".
*Descartado*: reseñas completas en línea (la página crece sin límite) y modal sin URL
(no se puede compartir ni enlazar desde feed, perfil o notificaciones).

### D6. Cabecera: ficha técnica

- El **tipo de obra siempre visible como antetítulo**, incluido "Álbum de estudio"
  (antes `studio` no llevaba etiqueta): es un campo de la ficha, no una advertencia.
- **Todos los artistas principales** del release-group con su `joinPhrase` (hoy
  `primaryArtist` es uno solo; las colaboraciones pierden artistas).
- Filas: Lanzamiento (precisión conocida: día, mes o año), Duración (N pistas · total),
  **Edición** (la representativa + acceso a la pestaña Ediciones). Sello y Género aparecen
  en fase 2. **Solo se renderizan filas con dato**, nunca "—".
- La fila Edición es obligatoria por honestidad: la tracklist es de la edición
  representativa, no del álbum abstracto.

### D7. Cabecera: bloque de comunidad

Cuatro cifras (media ★ + puntaje detallado 0–100; valoraciones + reseñas; lo coleccionan +
lo buscan; en N listas) e **histograma de distribución** de estrellas (½ a 5). Umbral
**5**:
- < 5 valoraciones: se muestra el conteo sin media ni histograma.
- < 5 en colección o en búsqueda: "menos de 5".

Los agregados cuentan todas las entradas, incluidas las privadas; el umbral es lo que
impide que un total identifique a una persona. "Pendiente" (want-to-listen) **no** se
agrega: su spec declara que no tiene superficie pública.
"Popularidad ≠ convergencia": una eventual línea "en tu red" es un bloque aparte, fuera de
este cambio.

### D8. Panel "Tu relación": estado, no botones

Muestra: tu nota (estrellas + detallada, editable en línea), tu reseña (Escribir / Editar),
escuchas ("3 escuchas · última 12 sep" + Registrar), favorito, Pendiente, colección
("Lo tienes · Vinilo" / "En tu búsqueda"), listas ("En 2 de tus listas" + Añadir, Ver en
listas). Cada línea es su propia acción. Estados: **anónimo** (invitación a iniciar sesión),
**sin interacción** (acciones mínimas: valorar, registrar escucha, Pendiente, favorito,
`···`), **con interacción** (estado). La valoración propia **sube de `SocialSection` a este
panel**; la media se muestra en el bloque de comunidad. En móvil el panel va entre la ficha
y las pestañas, compacto (tu nota, escuchas, registrar, ♥, `···`).

### D9. Nombres que no chocan

El conflicto era el verbo "querer" en dos señales distintas. Se separan por vocabulario:

| Señal | Antes | Ahora | Comunidad |
|---|---|---|---|
| `want_to_listen_entry` | Quiero escuchar | **Pendiente** | (no se agrega) |
| `collection_entry` | Lo tengo | **Lo tienes** / **Colección** | lo coleccionan |
| `wanted_entry` | Lo quiero | **En tu búsqueda** | lo buscan |

El renombre es **global** (misma clave i18n en artista, álbum, menús rápidos y listados
propios), no solo en el álbum.

### D10. Pestaña Canciones

- Encima de la lista: la edición mostrada y acceso a Ediciones.
- Cabecera por disco con **subtotal** (pistas · duración); total al pie. Si falta alguna
  duración, el total se muestra como "≥ mm:ss", nunca como exacto.
- **Títulos sin truncar** (hoy `truncate` en `TrackList.tsx`); duración, marcas y menú en
  columnas fijas a la derecha.
- Créditos: `featured` como hoy **más el artista principal de la pista cuando difiere del
  del álbum** (compilaciones, splits).
- **Variantes**: etiqueta "En vivo" / "Remix" / "Regrabación" desde `variant_type`, con
  enlace "versión de *X*" a `variant_of_id`.
- **Favorita de la comunidad** (no media por pista): marca en las pistas con más
  reacciones fuertes (`loved` + `obsessed`, públicas), máximo 3 por álbum, con umbral
  mínimo de 5 reacciones fuertes por pista. Motivo: el Modelo C pone el consumo y la
  reacción como primarios en la canción; una columna de medias casi vacía hace que la
  lista se sienta abandonada.
- **Tu estado por pista siempre visible** (no al pasar el cursor, que no existe en móvil):
  marca de "la escuchaste".
- Menú `···`: Registrar escucha, Reaccionar | Valorar, Favorito, Añadir a lista, Ver en
  listas | Ir a la canción.
- Móvil: duración y marcas bajo el título.

### D11. Consultas nuevas, sin cambios de esquema

Todo sale de tablas existentes: histograma (`rating` agrupado por `stars`), conteos de
`collection_entry` / `wanted_entry` (distintos `user_id`), `user_list_item` (listas
visibles), reacciones fuertes por grabación del álbum (una consulta agrupada por
`recording_id`, no N), escuchas propias por grabación, créditos `primary` del
release-group. Se agrupan en un read-model de "comunidad del álbum" separado de
`getAlbumDetail` para no acoplar la ficha pública con datos por usuario.

### D12. Pestaña Créditos: solo personas acreditadas, en cuatro niveles

La pestaña se llama **Créditos**, no "Formación". *Descartado*: formación calculada
(`membership` del artista principal cuyas fechas abarcan el lanzamiento). Muestra a quien
era miembro ese año, no a quien tocó: incluiría a quien se fue ese mismo año o no
participó. Además hoy casi no hay fechas: `normalizeReleaseDate` descarta las fechas
parciales y las pertenencias de MusicBrainz suelen venir solo con año.

Fuente: relaciones de MusicBrainz de nivel edición y grabación (las trae el cambio de
datos). `membership` se usa solo para **clasificar**, no para filtrar. Se guardan todos los
roles; la jerarquía decide qué se ve:

1. **Integrantes de la banda**: acreditados en el disco y miembros del artista principal.
   Bloque destacado. Cada fila junta todos sus roles (también los no instrumentales, como
   letra o coproducción), que no se repiten en otros niveles. Sin distintivo de fundador.
2. **Músicos invitados**: intérpretes acreditados que no son miembros.
3. **Producción y sonido**: producción, ingeniería, grabación, mezcla, masterización.
   Visible y compacto.
4. **Arte y otros**: diseño, fotografía, notas de carpeta y todo tipo no clasificado.
   Contraído ("+N créditos").

La asignación tipo de relación → nivel es una tabla fija en código; un tipo desconocido
cae en el nivel 4 y nunca se pierde. Por persona se agrupan las pistas ("todas",
"pistas 7, 8"). Si no hay créditos, la pestaña no se muestra; los `featured` siguen
visibles en la tracklist.

### D13. Pestaña Ediciones: tabla, no páginas

Tabla con año, país, formato, sello · número de catálogo, cantidad de pistas y enlace a
MusicBrainz (atribución, y "mencionar sin página propia"). Filtro por formato; solo
oficiales por defecto (promo y bootleg detrás de un checkbox); orden por fecha; la edición
representativa marcada como "mostrada", igual que la fila Edición de la cabecera y el
encabezado de Canciones. Las ediciones con pistas adicionales llevan "+N pistas", que
lleva a su sección en Canciones. Las ediciones **no** cambian la tracklist principal:
`docs/00-product/content-hierarchy.md` ("un selector de tracklist") se corrige en este
cambio.

### D14. Pistas adicionales: secciones desplegables en Canciones (patrón Wikipedia)

*Descartado*: páginas por edición (patrón Metal-Archives), incluso solo para las que traen
bonus tracks. Esas páginas no tendrían contenido propio: valoraciones y reseñas son del
`release_group`, y cada pista ya tiene `/song/{id}`.

- Bajo la lista original, el bloque "Pistas adicionales en otras ediciones", con una
  frase fija que aclara que estas pistas no forman parte del álbum original.
- Una sección por **variante**: ediciones oficiales agrupadas por lista de pistas.
  **Todas contraídas por defecto.**
- El encabezado identifica la variante: nombre (título o desambiguación), año, sello,
  formato y, si agrupa varias, "N ediciones (GB, US, JP)", más la marca "+N pistas".
- Al desplegar, solo las pistas que la variante agrega: grabaciones que no están en la
  lista original, comparando también el título normalizado para no tomar un remaster con
  otro MBID como pista nueva. Tener más pistas no basta: hay ediciones de 9 pistas que
  fusionan dos canciones de la original.
- Las **cajas** (muchas pistas o embalaje de caja) se rotulan "Caja · N pistas" y enlazan
  a MusicBrainz sin desplegar la lista.
- La lista de cada variante se trae la primera vez que alguien abre la sección (cacheo
  bajo demanda); antes, el encabezado usa solo datos del resumen de ediciones.

## Risks / Trade-offs

- **[Agregar datos privados]** La wishlist es privada y la colección tiene entradas
  privadas; mostrar totales es una exposición nueva. → Umbral de 5, solo totales (nunca
  quién), y el cambio queda explícito en las specs de `physical-collection` y
  `collection-wishlist`.
- **[Pestañas casi vacías]** La cobertura de créditos en MusicBrainz es desigual (muy
  buena en rock clásico y jazz, escasa en discos recientes o de nicho). → Una pestaña sin
  contenido no se muestra; no se rellena con datos aproximados.
- **[Dependencia de datos]** Créditos, Ediciones, Sello y pistas adicionales dependen del
  cambio de datos aparte. → Este cambio se implementa primero con esas zonas ocultas; se
  activan solas cuando hay datos.
- **[Rutas interceptadas]** Añaden complejidad al árbol de rutas (slots `@modal`, rutas
  `default.tsx`) y a `next-intl`. → Cubrir con tests de página y `pnpm run build`; el
  typecheck sobre `.next/types` detecta firmas de `params`.
- **[Rendimiento]** La cabecera suma varias consultas agregadas. → Paralelizar con
  `Promise.all`, una consulta agrupada por tipo de agregado, y dejar el histograma y los
  conteos fuera del camino crítico de la tracklist si hiciera falta (streaming).
- **[Renombre global]** Cambiar "Quiero escuchar" / "Lo quiero" toca varias superficies y
  tests. → Cambiar solo claves i18n y textos; los identificadores de código y la API no
  cambian.

### D15. Decisiones de implementación confirmadas (2026-09-24)

- **Pestañas por segmentos de ruta**: `/album/[id]` (Canciones), `/album/[id]/credits`,
  `/album/[id]/editions`, `/album/[id]/reviews` (slugs en inglés por `conventions.md`), con un layout común en un grupo de rutas `(tabs)` que renderiza
  la cabecera una vez. La subruta existente `/album/[id]/lists` se conserva.
- **Franja de discografía**: orden cronológico (`first_release_date`, luego
  `first_release_year`, luego título) y solo álbumes de la misma `category` que el actual.
- **Listas**: no hay bloque "En listas de la comunidad" en este cambio; la cifra del bloque
  de comunidad enlaza a la página existente `/album/[id]/lists`.
- **Variante sin nombre propio**: "Edición {año} · {formato}".

## Open Questions

- **Cambio de datos**: se planifica aparte (`enrich-album-editions-and-credits`).

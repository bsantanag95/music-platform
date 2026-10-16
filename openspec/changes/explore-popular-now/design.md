## Context

`/explore` tiene un riel "Más reseñados" (`listMostReviewed`: conteo de `review`, mínimo `MIN_REVIEWS_PER_ALBUM` = 1, se
omite con menos de `MIN_ALBUMS_FOR_SECTION` = 6 discos) y el orden `popular` de los listados cuenta valoraciones. La
plantilla de colección `most-reviewed-month` usa reseñas del mes. Las señales que existen, con su objetivo y su privacidad:

| Tabla | Objetivos | Privacidad propia | Scratch |
|---|---|---|---|
| `favorite` | artista, disco, canción | `audience` (private/followers/public) | — |
| `review` | disco (y otros) | `moderation_status` | 19 |
| `listen_entry` (diario) | artista, disco, canción | `audience` | 120 |
| `rating` | artista, disco, canción | — (perfil) | 86 (36 disco, 49 canción) |
| `user_list_item` | artista, disco, canción | `user_list.audience` | 116 |
| `collection_entry` | disco | `audience` | 19 |
| `want_to_listen_entry` | artista, disco | — | 13 |
| `wanted_entry` | disco | — | 9 |
| `artist_follow` | artista | — | 18 |

35 usuarios; 72 discos con alguna señal.

## Goals / Non-Goals

**Goals:**
- Una sola definición de popularidad, explicable, reutilizada por la sección, el orden de los listados y la colección mensual.
- Que la sección muestre algo honesto con pocos datos y mejore sola.
- Respetar lo que cada persona marcó como privado y no exponer a nadie.

**Non-Goals:**
- Personalización, fuentes externas, popularidad de listas, una tabla materializada (decisión 7).

## Decisions

1. **Personas distintas con peso por gesto.** Para cada objetivo, cada persona aporta la suma de los pesos de los **tipos** de
   gesto distintos que hizo sobre él (cada tipo una vez), con un tope de **4** por persona y objetivo. La puntuación del objetivo
   es la suma sobre las personas. Pesos: favorito 3; reseña 2; escucha, valoración, lista y colección 1; pendiente por escuchar y
   en búsqueda 0,5; seguir a un artista 2 (solo artistas). Así diez escuchas de una persona valen 1 y no 10, y quien escucha,
   valora, reseña y marca favorito llega al tope sin dominar. Desempate: personas distintas, luego la actividad más reciente,
   luego el id. Las estrellas no cuentan por su valor: "Mejor valorados" sigue aparte.
2. **Qué cuenta cada objetivo.**
   - *Álbum*: los gestos con `release_group_id`.
   - *Canción*: los gestos con `recording_id` (valoración, favorito, escucha, lista).
   - *Artista*: los gestos directos (`artist_id`: seguir, favorito, valoración, escucha, pendiente, lista) **más** los gestos sobre
     sus discos, atribuidos al artista principal del disco (`credit` en la primera posición). Una persona sigue aportando a un
     artista como mucho el tope, aunque haya escuchado cinco de sus discos.
3. **Privacidad.** Cuentan solo cuentas activas (`activeUserCondition`: sin desactivadas). Las filas con `audience = 'private'`
   (favoritos, diario, colección) y los ítems de listas privadas no cuentan: la persona dijo que eso era suyo. Las reseñas ocultas por
   moderación no cuentan. Las valoraciones, pendientes y "en búsqueda" no tienen audiencia propia y cuentan como cifra anónima, igual
   que hoy alimentan "Mejor valorados". Nunca se expone quién; la cifra "N personas" solo se muestra desde **5** (el mismo umbral que
   las cifras de los géneros), por debajo el ítem aparece sin número.
4. **Ventana que se agranda sola.** "Popular ahora" usa los gestos de los últimos **30 días**; si así no hay al menos el mínimo de la
   pestaña (álbumes: `MIN_ALBUMS_FOR_SECTION`, 6; artistas y canciones: 5) con **2 personas** o más, prueba 90 días, luego desde
   siempre, y en ese último paso baja el umbral a **1 persona**. Se queda con el primer escalón que llega al mínimo y lo informa
   (`window: "month" | "quarter" | "all"`) para que el subtítulo lo diga. Cada pestaña elige su escalón por separado. Si ni desde
   siempre llega, la pestaña no aparece; sin pestañas, la sección se omite. La fecha de cada gesto es su `created_at` (la valoración,
   su `updated_at`: cambiar la nota es actividad).
5. **Una consulta por objetivo y ventana, sin tabla materializada.** Una unión de los gestos (`union all` de las tablas con su
   peso, su usuario, su objetivo y su fecha), agrupada por persona y objetivo para aplicar tipos distintos y tope, y luego por objetivo.
   Las tablas son pequeñas (cientos de filas) y crecen con la actividad, no con el catálogo. El resultado de "Popular ahora" se guarda
   **15 minutos** en memoria con `ttl-cache.ts` (la actividad nueva aparece pronto y la portada no repite la consulta en cada visita).
6. **Orden "Populares" de los listados = puntuación de siempre.** `listAlbumsFiltered` con `sort: popular` hace `left join` a la
   puntuación de todos los tiempos agregada por disco (una subconsulta derivada, no correlacionada: se calcula una vez sobre las
   tablas de gestos) y ordena por ella desc y luego por el orden "Destacados". Los discos sin actividad quedan al final en orden
   "Destacados". La etiqueta pasa de "Más valorados" a "Populares" / "Popular".
7. **Sin tabla materializada.** Con cientos de gestos, la consulta es barata; materializar obligaría a mantener triggers en nueve
   tablas. Si la actividad crece hasta que cueste, la puntuación se puede materializar con el mismo contrato (decisión que quedaría en
   un ADR nuevo). Se mide en la implementación.
8. **Interfaz.** La sección `popular` va justo después de Colecciones: es la prueba social de que hay gente usando la plataforma.
   Título "Popular ahora" con el subtítulo de la ventana; pestañas accesibles (`role="tablist"`, flechas, la primera activa) que en el
   servidor ya traen las tres listas (no hay petición al cambiar). Álbumes: el riel de carátulas de siempre (`AlbumRail`), con la cifra
   "N personas" sobre la carátula solo desde 5. Artistas: lista numerada de hasta 10 con foto si la hay (Commons) o inicial, nombre y la
   cifra cuando corresponde. Canciones: lista numerada de hasta 10 con la carátula del disco, título y artista. Sin JavaScript se ve la
   pestaña de álbumes.
9. **Colección mensual.** `most-reviewed-month` sale del registro de plantillas y entra `popular-month` ("Lo más popular de {mes}" /
   "Most popular of {month}"), familia `rankings`, mismo peso de comunidad, con la puntuación sobre el mes del período, umbral de 2
   personas y omisión si no hay discos. Su presentador numera los discos, resume el mes y pone "N personas" desde 5 (sin cartela por
   debajo). Las colecciones archivadas de `most-reviewed-month` se conservan con su título y familia guardados (comportamiento existente
   para plantillas retiradas) y caen al presentador de la familia. El título localizado de `most-reviewed-month` se queda en
   `titles.ts` para que las archivadas sigan diciéndose en los dos idiomas; su presentador sí sale del registro (una prueba exige que
   todo presentador corresponda a una plantilla registrada).
10. **Navegación rápida.** El ancla `mas-resenados` desaparece y entra `popular` ("Popular"), en su nueva posición.

## Risks / Trade-offs

- **Pocos datos**: con 35 personas la sección de "desde siempre" mostrará discos con una o dos personas detrás; el subtítulo lo dice
  y la cifra no aparece hasta 5, para no presumir.
- **Pesos arbitrarios**: son una decisión de producto, documentada en `business-rules.md` y centralizada en una constante, para
  ajustarlos sin tocar la consulta.
- **Valoraciones y pendientes sin audiencia propia** cuentan anónimamente; si se quisiera excluir a los perfiles privados, es un filtro
  más en la misma unión.
- **Atribución al artista principal**: un disco con varios artistas solo suma al primero acreditado.
- **Costo**: unión de nueve tablas por consulta; se mide en scratch y, con la caché de 15 minutos, la portada la paga como mucho cuatro
  veces por hora por instancia.

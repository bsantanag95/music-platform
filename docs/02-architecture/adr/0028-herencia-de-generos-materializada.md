# ADR 0028 — Herencia de géneros materializada

## Estado

Aceptado (cambio `add-genre-artist-discovery`, 2026-10). Complementa el ADR 0023 (la herencia acotada a 3 géneros) y el
ADR 0025 (votos); no cambia ninguna regla de producto.

## Contexto

Un álbum sin géneros propios con puntaje positivo hereda los 3 primeros géneros de estilo de su artista principal
(ADR 0023). La vista `release_group_effective_genre` (migración `0057`) lo calculaba en lectura con una búsqueda lateral
por **cada** release-group: su primer crédito principal y, de ese artista, sus 3 primeros géneros de estilo. Medido
(2026-10-05) sobre la base de scratch tras completar 746 discografías (58,5 mil release-groups):

| | Antes (7,6 mil release-groups) | Con 58,5 mil, vista antigua |
|---|---|---|
| Recorrer la vista completa | ~50 ms | **362 ms** |
| Cifras de la cabecera de un género | ~50 ms | 250–320 ms |
| Listado de álbumes de un género | ~40 ms | 250–290 ms |
| Pestaña Artistas de un género | 14–180 ms | 440–860 ms |

El costo es lineal con el catálogo y ningún predicado por género se empuja dentro de la rama de herencia (el planificador
la evalúa entera, o, con un `EXISTS` correlacionado y pocas filas exteriores, la reevalúa por fila). Completar
discografías (descubrimiento de artistas) multiplica el catálogo, así que el suelo de rendimiento de todas las páginas
de género dejaba de ser aceptable.

## Decisión

1. **Se materializa solo la herencia** en `release_group_inherited_genre (release_group_id, genre_id, position)`, con
   índice por `genre_id` y claves foráneas en cascada. No se guarda el puntaje ni los votos.
2. **La vista conserva su interfaz** (mismas columnas, tipos y semántica). La rama propia (puntaje > 0) no cambia; la
   heredada lee de la tabla, exige `genre.kind = 'style'` y la ausencia de puntaje positivo **en lectura**. Votar, retirar
   un voto o cambiar las semillas del álbum no requiere mantenimiento: se refleja al instante.
3. **La tabla la mantienen triggers**, no la aplicación (una regla derivada no puede depender de que cada escritor
   recuerde actualizarla):
   - `credit` (por fila, solo créditos principales de álbum): recalcula el álbum afectado;
   - `artist_genre_seed` (por sentencia, con tablas de transición, porque reemplazar las semillas borra e inserta varias
     filas): recalcula los álbumes donde esos artistas son principales;
   - `genre` (cambio de `kind`): recalcula los álbumes de los artistas que tienen ese género.
   Una sola función de recálculo, idempotente (`recompute_inherited_genres`), y `rebuild_inherited_genres()` para
   reconstruir todo si se sospecha de un desfase.
4. **La migración** crea la tabla, la llena desde la definición anterior, instala los triggers y redefine la vista. El
   smoke compara, sobre el catálogo real, la vista nueva con la definición antigua (diferencia vacía en ambos sentidos:
   103.356 filas idénticas en la verificación).

## Alternativas descartadas

- **Vista materializada con `REFRESH`.** Un refresco completo (~0,4 s) tras cada voto, ingesta o cambio de semillas, con una
  ventana de datos viejos; los votos y el panel de géneros deben verse al instante.
- **Reescribir la vista para partir de los artistas con semillas.** No baja del orden de los release-groups de esos
  artistas, que tras completar discografías son casi todos.
- **Cachear en la aplicación.** Cada servicio la reinventaría y los votos quedarían desfasados.
- **Triggers también para el puntaje.** El puntaje depende de semillas, votos y cuentas desactivadas (más tablas y casos)
  y es barato de leer (cientos de filas): se deja en lectura.

## Consecuencias

- Una tabla, seis funciones y cuatro triggers nuevos (migración `0060`); la vista conserva su definición pública.
- Las escrituras de créditos y semillas pagan un recálculo (≤ 3 filas, dos búsquedas por índice); medido en el relleno de
  746 artistas sin problema.
- Con 58,5 mil release-groups: recorrer la vista 362 → 33 ms; cifras de la cabecera 250–320 → 55–90 ms; listado de álbumes
  250–290 → 45–100 ms; pestaña Artistas 440–860 → 100–520 ms (el peor caso es el orden `descubrir`, que calcula la señal
  de comunidad para todos los artistas del género).
- Un caso que cambie la herencia sin pasar por `credit`, `artist_genre_seed` o `genre.kind` quedaría desfasado hasta una
  reconstrucción; hoy no existe (la herencia solo depende de esas tres tablas y del puntaje, que se lee en vivo).

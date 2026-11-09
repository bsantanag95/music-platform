## Context

Segunda fase de `add-year-in-discs`. Decisiones tomadas al abrirla (2026-11-09): Top 5 prellenado por la nota y editable, solo con discos del año; un disco
oculto desaparece del todo, también de las cifras; la imagen junta hasta 10 carátulas.

Estado de partida (Fase 1): `readYearInDiscs(owner, year, tz)` arma meses, cifras y `topDiscs` (los 4 más escuchados) en tres consultas; la marca
`year_share` guarda la zona; el objetivo `year` compone el marco común en Enlace e Historia con hasta 4 carátulas (ADR 0049). ADR 0051 permite hasta 10
en una Lámina armada por una persona; ADR 0053, 10 en la discografía.

## Goals / Non-Goals

**Goals:**

- Que el año diga lo que la persona quiere decir: su Top 5 y sin lo que prefiere no mostrar.
- Una imagen de Publicación que se lea de un vistazo: lo mejor del año arriba, el año abajo.

**Non-Goals:**

- Diciembre y "Arma la tuya" (Fase 3). Canciones en el Top 5. Notas en la imagen.

## Decisions

### 1. Modelo

Migración `0088`:

- `year_top (user_id, year, position, release_group_id)`: PK `(user_id, year, position)`, único `(user_id, year, release_group_id)`, `CHECK position
  BETWEEN 1 AND 5`, `CHECK year BETWEEN 2000 AND 2100`, `ON DELETE CASCADE` desde `app_user` y `release_group`.
- `year_hidden (user_id, year, release_group_id, hidden_at)`: PK `(user_id, year, release_group_id)`, mismo `CHECK` de año y cascadas.

Sin filas de `year_top`, el Top 5 es el prellenado (se calcula en cada lectura). Guardarlo reemplaza las cinco filas en una transacción.

### 2. Top 5

Prellenado: entre los discos del año (no ocultos), los que tienen nota del dueño, de mejor a peor (la detallada si existe; si no, las estrellas × 20); a
igual nota, los más escuchados ese año; si hay menos de cinco con nota, se completa con los más escuchados sin nota. Guardado: de 1 a 5 discos, sin
repetir, todos escuchados ese año y no ocultos (`VALIDATION_ERROR` si no). Al leer, un disco guardado que ya no tiene escuchas ese año o que se ocultó no
aparece; el resto conserva su orden.

`PUT /api/me/year/<año>/top` con `{ releaseGroupIds }`. `DELETE` vuelve al prellenado.

### 3. Ocultar

`POST /api/me/year/<año>/hidden/<releaseGroupId>` y `DELETE` para volver a mostrar. Ocultar exige que el disco tenga escuchas ese año. Un disco oculto no
cuenta en nada: las consultas de la Fase 1 excluyen sus escuchas (`release_group_id NOT IN (ocultos)`) para el calendario, las escuchas, los discos, los
discos nuevos y los artistas descubiertos. Las escuchas de canciones y artistas no cambian. Ocultar quita el disco del Top 5 guardado.

El dueño ve sus ocultos en una sección aparte de su página, con "Mostrar". Nadie más sabe que existen.

### 4. Edición en la página

Para el dueño, la página del año suma "Tu Top 5" (los cinco con "Cambiar", que abre una lista de los discos del año con su nota para elegir y ordenar
con botones subir y bajar, operables con teclado y toque) y, en cada disco del calendario, un botón "Ocultar del año" (una sola acción: no hace falta un menú). Sin modo de edición aparte. Cada acción guarda al
toque y refresca la página.

### 5. Imagen

`YearFrame` en Publicación (1080×1350, por defecto) e Historia: título y firma, el Top 5 numerado con carátulas, el calendario en 4 × 3 celdas (nombre del
mes y su disco más escuchado) y las cifras distintas de cero. Carátulas, hasta 10 distintas (ADR 0051): primero las del Top 5; después, por orden de
escuchas del mes, la del disco de cada mes, hasta completar 10; un mes sin carátula muestra el título de su disco; un mes sin escuchas, vacío. Enlace sigue
en el marco común con las 4 primeras del Top 5.

- **Por qué ADR 0051 y no uno nuevo:** con Top 5 y ocultos, el año es una Lámina curada por su dueño, como el Top N. Se anota en `data-licensing.md`.

## Risks / Trade-offs

- **[Ocultar cambia las cifras y alguien lo nota]** → nadie más ve el antes; es la decisión de la persona.
- **[Un Top 5 guardado envejece]** → se filtra al leer y se completa con el prellenado si quedan menos de cinco.
- **[Imagen con doce celdas y pocas carátulas]** → los meses sin carátula muestran el título; se revisa con muestras.

## Migration Plan

`0088` en scratch durante el cambio. En la BD real va después de `0079` a `0087`.

## Open Questions

Ninguna.

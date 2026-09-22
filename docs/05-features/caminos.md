# Camino

**Fase:** 5 (roadmap). **Estado:** ✅ Implementado (cambio `add-camino`). Este documento es la
especificación de producto cerrada; el detalle de implementación vive en el change de OpenSpec y
en `04-api/contracts.md`.

## Motivación

"Recorrido" (`/artist-journeys`) resolvió un solo caso: el progreso de un usuario sobre la
discografía de un artista. El nombre y la ruta quedaron anclados a ese caso — no admiten, sin
ambigüedad, un conjunto de álbumes armado a mano sin relación con un artista único, ni el
progreso de un usuario sobre una lista curada por otra persona. Camino generaliza el mecanismo
de progreso derivado de Recorrido para esos dos casos nuevos, sin tocar Recorrido ni Listas.

## Camino dinámico

- Subtipo de lista (`kind = 'custom_journey'` sobre `user_list`), un solo tipo de entidad fijo:
  `release-group`. A diferencia de Recorrido, un Camino **no** se asocia a ningún artista ni se
  pre-puebla desde una discografía — nace vacío y su contenido es exactamente lo que el
  propietario agregue con el tiempo.
- Campos: título obligatorio (≤100 caracteres), descripción opcional (≤500), audiencia propia
  (`private`/`followers`/`public`) — mismo criterio que Listas.
- Álbumes: agregar y quitar en cualquier momento, de forma idempotente, con orden manual. El alta
  reusa la acción contextual "Añadir a..." ya existente en las páginas de catálogo (extendida con
  una sección de Caminos para objetivos de álbum) — sin buscador de catálogo embebido en el
  detalle (mismo criterio ya cerrado en `rework-list-detail`).
- Progreso: derivado en lectura contra el diario del propietario, nunca persistido — mismo
  mecanismo que Recorrido (`src/services/journeys/progress.ts`), generalizado para no depender de
  un artista. Estados: **completo** (al menos un álbum, todos escuchados) o **en curso**
  (cualquier otro caso, incluida selección vacía). Archivar/desarchivar conserva contenido y
  progreso; el borrado es físico e irreversible.

## Vista de detalle: mismo diseño que Recorrido, propia y trackeada diferenciadas

La gestión propia (`/me/caminos/[id]`) y la lectura trackeada (`/users/[username]/caminos/[id]`)
comparten encabezado y lista de álbumes con la página de gestión de Recorrido — ambos tratan
álbumes: carátula (o disco de reemplazo), badge de estado, barra de progreso con fracción, orden
(fecha de lanzamiento/alfabético) y modo de visualización (Lista/Gráfico). Dos diferencias, ambas
por el mismo motivo — un Camino puede mezclar álbumes de artistas distintos, a diferencia de un
recorrido, siempre del mismo:

- Cada fila muestra el artista acreditado del álbum, no solo el título.
- No hay editor de selección embebido: el alta de álbumes sigue siendo la acción contextual
  "Añadir a..." de cada álbum (ver más arriba); "Quitar" pega directo al servidor en vez de
  acumularse en un borrador.

Registrar y quitar una escucha por álbum, sin salir de la página, funciona en ambos contextos
pero contra diarios distintos: en la gestión propia, contra el diario del propietario (igual que
Recorrido); en la lectura trackeada, contra el diario de **quien trackea**, y solo mientras el
tracking está activo — sin él, la lista es de solo exploración, sin ningún ✓ ni acción de
escucha. Dos personas trackeando el mismo Camino ven marcas de escuchado independientes entre sí,
mismo criterio que el progreso agregado.

## Tracking de progreso sobre una lista ajena

- Cualquier usuario que guardó una lista ajena **de álbumes** (`entityType = 'release-group'`,
  `kind` `standard` o `custom_journey`) puede activar su propio seguimiento de progreso sobre
  ella — eje independiente de "Seguir" (`list_save.tracking`, junto a `following`).
- La decisión es exclusiva de quien trackea: el dueño de la lista original no la autoriza, no
  puede impedirla y no se entera. Activar tracking sobre una lista todavía no guardada crea el
  guardado y el tracking en una sola operación.
- El progreso se deriva igual que en un Camino propio, pero contra el diario de quien trackea, no
  del dueño de la lista — dos personas distintas trackeando la misma lista ven progresos
  distintos.
- Intentar trackear una lista de artistas o de canciones responde `400 VALIDATION_ERROR`.

## Descubribilidad: estante de perfil + Header

Un Camino visible solo por su URL directa era, en la práctica, invisible: `/caminos` (descubrimiento)
exige al menos un trackeo activo para listar una entrada, y un Camino recién creado sin ningún
seguidor todavía no aparece ahí ni en ninguna superficie del perfil (excluido de "Listas" a
propósito). Dos accesos cierran ese hueco:

- **Estante "Caminos" en el perfil** (`/users/[username]`, Nivel 2): mismo tratamiento que el
  estante "Listas" — riel horizontal acotado, tarjeta-puerta "+N" a la página dedicada
  `/users/[username]/caminos` cuando hay más de los que caben, colapsado para un visitante sin
  Caminos visibles y vacío-invitando-a-crear para el propio dueño. Cada tarjeta ofrece la acción
  de tracking, salvo en el propio perfil del dueño (no se puede trackear el propio Camino).
- **Acceso general del Header**: `/caminos` (descubrimiento) se agregó a la barra general de
  navegación, junto a "Listas" — visible con y sin sesión, distinto del acceso a `/me/caminos`
  (gestión propia) que ya vivía en el menú de usuario.

## Superficie `/me/caminos`

Requiere sesión. Dos pestañas — mismo patrón que "Mis listas · Guardadas · Descubrir" en
`/me/lists` (decisión tomada comparando 4 mockups de diseño: mezclar Caminos propios y listas
trackeadas en una sola lista ordenable generaba dos significados distintos de "Estado" y de
acción por fila para el mismo campo):

- **Mis Caminos**: buscador, orden (recientes / alfabético / por estado), filtro por estado y los
  mismos tres modos de visualización que Recorrido (Detallada / Índice / Gráfico, preferencia
  persistida en el navegador) — esta pestaña es homogénea (todo propio, misma acción por entrada),
  así que admite el mecanismo completo de Recorrido sin las asimetrías de una lista mezclada.
- **Trackeados**: buscador (por título o dueño) + orden (recientes / más progreso), sin filtro de
  estado (no hay "archivado" para una lista ajena) ni modo de vista — deliberadamente más liviana,
  mismo criterio que "Guardadas" frente a "Mis listas".

Acceso desde el menú de usuario del Header y el panel de gestión del perfil propio, junto al
acceso ya existente a Recorrido.

## Lectura ajena

Un Camino público es visible para otros usuarios en `/users/[username]/caminos/[caminoId]` — ruta
propia, **no** `/users/[username]/lists/[listId]`: un Camino nunca vive detrás de los endpoints
de `lists` (mismo criterio de exclusión que ya aplica a Recorrido respecto de toda lectura
genérica de `user_list`: Mis listas, Guardadas, Descubrir, conteos de la huella de gusto, el
widget "Retomá una lista" de Inicio, los eventos de feed). La vista de lectura muestra el
progreso propio del dueño (informativo) y ofrece el control de tracking al visitante; con
tracking activo, ver "Vista de detalle" más arriba para el progreso y las marcas de escuchado
propias del visitante.

## Descubrimiento público `/caminos`

Vitrina de Caminos populares — accesible sin sesión —, ordenada por **conteo de trackeo activo**
(no por guardado simple, a diferencia de "Populares" de `/lists`): "N siguiendo su progreso" por
tarjeta, sin posiciones numeradas ni distintivos de "top". Solo se listan listas con al menos un
trackeo activo. Filtros por género (al menos un álbum con esa etiqueta) y por artista (búsqueda
por nombre, no autocompletado con id, sobre al menos un álbum acreditado).

## Decisiones cerradas

- El nombre "Camino" se eligió explícitamente para no confundirse con "Recorrido" (se
  descartaron "Ruta", "Trayecto", por sonar demasiado cerca) y por no evocar gamificación (se
  descartó "Maratón").
- Solo álbumes en v1 — canciones y artistas quedan fuera; no hay un evento de "escuchado" tan
  limpio para esos tipos como `listen_entry` por `release_group_id`.
- El dueño de una lista no controla si admite tracking — la decisión es siempre de quien trackea.
- Convertir una Lista existente en Camino (o viceversa) queda fuera de v1: son objetos distintos.
- El progreso de Camino no se integra al feed de actividad (mismo tratamiento que Recorrido).

## Ideas futuras (backlog, no comprometidas)

- Criterio de coincidencia del filtro de género en `/caminos` (hoy: "al menos un álbum"; una
  variante por umbral de proporción quedó fuera).
- Tope de ítems por Camino dinámico (hoy: sin límite, igual que Listas).
- Autocompletado con id para el filtro de artista en `/caminos` (hoy: búsqueda por nombre).

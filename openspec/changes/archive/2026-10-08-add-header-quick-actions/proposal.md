## Why

El control "Registrar" del Header ya es la versión express de una acción: en vez de ir a Buscar → perfil del
artista → álbum o canción → registrar, abre un modal, se busca el objetivo y se registra. Pero es la única
acción que tiene ese atajo. Valorar, marcar un favorito, dejar algo Pendiente, agregar a una lista o crear una
lista exigen hoy ir a una página (de catálogo o de gestión) y hacer la acción ahí: el menú de usuario ya lleva a
la página de gestión en dos pasos, lo que duele es el tercero, la acción dentro de la página.

Convertir el control en un punto de acciones rápidas de escritura lleva esas acciones a un máximo de tres pasos
desde cualquier página, sin tocar el camino de registrar una escucha, que es el que más se usa y debe seguir sin
fricción (PRODUCT.md: registrar una escucha "no requiere juicio").

## What Changes

- El control "Registrar" (solo con sesión) pasa a llamarse **"Añadir"**, se mueve de la barra general a la **zona
  de usuario, junto al menú** (`ES EN` · `+ Añadir` · `Nombre ▾`; en el panel móvil, cabeza del bloque de usuario) y
  abre un diálogo de acciones rápidas en lugar del modal de registrar escucha. El diálogo se abre siempre en **Escucha**, con el
  foco en el buscador, de modo que registrar una escucha sigue costando lo mismo que hoy (clic + escribir).
- El diálogo ofrece seis acciones como **chips**: Escucha, Valorar, Favorito, Pendiente, A lista y Nueva lista.
  - **Escucha:** idéntica al flujo actual (buscar → elegir → crear la escucha → ampliarla).
  - **Valorar:** buscar → elegir → tocar estrellas (guarda al instante, conserva el puntaje detallado si sigue
    siendo coherente, como el panel "Tu relación") y, opcionalmente, escribir la **puntuación 1–100**, que guarda solo
    el puntaje y deja que el servidor derive las estrellas.
  - **Favorito / Pendiente:** buscar → elegir → se aplica al instante, con "Deshacer". Si el objetivo ya estaba
    marcado se informa y se ofrece quitarlo, sin quitarlo por accidente. Pendiente no admite canciones.
  - **A lista:** buscar → elegir → el panel de listas propias que ya existe (`AddToListPanel`).
  - **Nueva lista:** nombre + tipo (artistas, álbumes o canciones) → crear. La audiencia no se pregunta: se aplica
    la audiencia por defecto de la persona. Al terminar se ofrece **Agregar a esta lista**, que lleva al chip
    "A lista" con el tipo ya fijado, porque las listas no tienen buscador de catálogo propio.
- Nuevo endpoint `GET /api/me/marks?type=&id=` con las marcas de la persona sobre un artista, álbum o canción
  (favorito, Pendiente, estrellas y puntaje detallado). Es necesario porque `POST /api/me/favorites` y
  `POST /api/me/want-to-listen` **alternan** (quitan si ya existe) y el diálogo no tiene el estado precargado
  como las páginas de catálogo.
- Se corrige `docs/04-api/contracts.md`: describe esos dos `POST` como idempotentes, pero el código real alterna.
  Manda el código (ADR 0006).
- Se extrae el buscador de objetivos de `RegisterListenDialog` a un componente compartido por todas las acciones
  con objetivo, y `RegisterListenDialog` / `RegisterListenButton` se reemplazan por el diálogo nuevo.

## Capabilities

### New Capabilities

- `header-quick-actions`: el diálogo de acciones rápidas del Header: control "Añadir", chips, buscador de
  objetivos compartido, el comportamiento express de cada acción, el estado previo para no deshacer marcas por
  accidente y la creación de lista sin audiencia explícita.

### Modified Capabilities

- `cross-view-navigation`: el control "Registrar" de la barra general pasa a ser "Añadir", se ubica en la zona de
  usuario junto al menú (y a la cabeza del bloque de usuario del panel móvil) y abre el diálogo de acciones rápidas.
- `listen-diary`: el punto de entrada global para registrar una escucha pasa a ser el chip "Escucha" del diálogo
  de acciones rápidas; el comportamiento de creación (audiencia `private`, ampliación, append-only) no cambia.

## Goals

- Llevar valorar, favorito, Pendiente, agregar a lista y nueva lista a un máximo de tres pasos desde cualquier
  página, con sesión.
- No empeorar el camino de registrar una escucha: sigue siendo abrir y escribir.
- Reutilizar los componentes y contratos de escritura existentes; añadir solo lo imprescindible (un endpoint de
  lectura de marcas).

## Non-Goals

- Colección, Caminos y recorridos de artista: se dejan para una segunda tanda (su alta exige más campos).
- Acceso móvil fuera de la hamburguesa (icono "+" visible) y atajo de teclado: seguimiento aparte.
- Recordar el último chip usado: el diálogo abre siempre en Escucha para que el control sea predecible.
- Cambiar el menú de usuario ni las páginas de gestión: el menú sigue siendo para ver y gestionar; el "+" es para
  escribir.
- Refactorizar los paneles "Tu relación" ni `ListForm`: no se tocan.
- Cambiar contratos de escritura existentes (`POST /api/me/favorites`, etc.) ni la audiencia de nada ya creado.

## Impact

- **Frontend:** `src/components/layout/Header.tsx` (control), nuevo `src/components/quick-actions/` (diálogo,
  chips, buscador de objetivos, paneles por acción); retiro de `src/components/diary/RegisterListenDialog.tsx` y
  `RegisterListenButton.tsx` con sus pruebas, que migran.
- **API:** nuevo `GET /api/me/marks` (+ `src/lib/api/marks.ts`, esquema Zod, servicio
  `src/services/catalog/target-marks.ts` sobre `isFavorited`, `isWantToListen` y el rating propio).
- **i18n:** nuevo namespace `quickActions` (es/en, registrado en `src/i18n/request.ts`); las claves `diary.global.*`
  se mueven allí.
- **Docs:** `docs/04-api/contracts.md` (endpoint nuevo + corrección de los `POST` que alternan),
  `docs/05-features/phase-5-design.md` (control del Header), `docs/05-features/listening-diary-and-ratings.md`
  (punto de entrada global).
- **Sin migraciones ni dependencias nuevas.**

## Why

La auditoría de la portada pública (2026-11-14, `/es` sin sesión a 1440, 820 y 390 px; mockups en `mockups/home-2026-11/`) encontró que el
primer viewport no hace su trabajo: el titular junta cuatro ideas en tres líneas, la bajada de 14 px se pierde sobre el muro de carátulas, el
único botón («Comienza») abre un modal intermedio y lo que distingue al producto —registrar la escucha y valorarla con estrellas y un puntaje de
1 a 100— no aparece hasta el carrusel del final. Además, por debajo de 1024 px el buscador del Header queda escondido dentro del menú, aunque
buscar un artista es la tarea principal. Se eligió la dirección «C · Disquería». Esta es la Fase 1 de tres: cabecera, primer viewport y textos.

## What Changes

- **Header (todas las páginas, con y sin sesión):** por debajo de `lg` el buscador sale del menú y se abre desde un botón propio en la barra,
  en una fila bajo la cabecera; el menú deja de contenerlo.
- **Hero del visitante sin sesión, en dos columnas:** titular de una sola idea («El álbum es una obra.» + «Tu historial, también.»), bajada
  legible sobre fondo liso, **buscador grande** (el mismo componente y comportamiento que el del Header) con accesos de ejemplo, y una
  **caja de carátulas** en perspectiva hecha con el mosaico existente (`public/hero/wall.webp`), con una **entrada de ejemplo** fija (álbum,
  estrellas, puntaje 1–100 y contexto de escucha) rotulada como ejemplo. Revierte la decisión de `redesign-frontend` de no tener buscador en el
  hero.
- **Acciones directas:** «Crear cuenta» enlaza a `/auth/register` y «Inicia sesión» a `/auth/login`; se elimina `GetStartedModal`.
- **Textos:** tuteo uniforme y errata corregida en los mensajes de Inicio (`heroLine*`, `anonSubtagline`, `feature1Title`) en español, y su
  equivalente en inglés.
- **Listas públicas recientes:** dejan de mostrarse listas sin elementos.
- **Acceso a Usuarios:** el botón suelto entre secciones pasa a ser un enlace dentro del bloque de la comunidad.

### Goals

- Que quien llega sin sesión entienda en el primer viewport qué es el sitio, pueda buscar y pueda crear cuenta sin pasos intermedios.
- Búsqueda alcanzable en un toque en cualquier ancho y en cualquier página.

### Non-Goals

- El cuerpo de la portada (colecciones, mejor valorados, comunidad) a ancho completo: **Fase 2**.
- Lanzamientos como horario, funciones con mini interfaces y cierre: **Fase 3**.
- Cambiar las tipografías de la aplicación: queda anotado como análisis futuro (ver `design.md`).
- Cambios en `/explore` o en el Inicio con sesión, salvo el Header compartido.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `home`: el hero sin sesión incluye un buscador, una entrada de ejemplo y acciones directas de registro e inicio de sesión (sin modal); las
  listas públicas recientes excluyen listas vacías.
- `header-search`: en pantallas angostas la búsqueda del Header se abre desde un control propio de la barra, no desde el menú.

## Impact

`src/components/layout/{Header,HeaderSearch}.tsx`, `src/components/home/{AnonHero,HeroCoverWall,AnonymousHome,CommunityActivity}.tsx`,
nuevos `HeroCrate.tsx` y `HeroSampleEntry.tsx`, eliminado `GetStartedModal.tsx`; `src/lib/config/hero-covers.ts` (accesos de ejemplo);
`src/services/home/home.ts` (`listPublicLists`); mensajes `messages/{es,en}/home.json` y `common`/`layout` del Header;
`src/i18n/client-messages.json` regenerado; tests de Header, HeaderSearch, AnonymousHome y del servicio; `docs/05-features/home.md`.
Sin cambios de API, esquema ni dependencias. Las páginas informativas y legales no se ven afectadas.

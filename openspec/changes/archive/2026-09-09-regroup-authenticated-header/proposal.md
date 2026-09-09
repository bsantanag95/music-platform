## Why

El Header autenticado hoy mezcla dos ejes en una sola fila: lo que el sitio ofrece a
cualquiera (Buscador, Explorar) y las superficies personales del usuario (Diary, Feed,
Favorites, Lists, Collection como cinco enlaces `/me/*` fijos). Sitios comparables
(Letterboxd, Backloggd) separan ambos: la barra general lista descubrimiento y todo lo que
identifica a la persona vive agrupado bajo su nombre. El proyecto ya empezó ese camino —
`OwnerHubPanel` reúne esas superficies dentro del perfil y el propio código anota la
intención de separar sesión/identidad de la navegación de contenido — pero el Header aún no
lo refleja.

## What Changes

- La **barra general** del Header conserva únicamente Buscador y Explorar como navegación
  de contenido; deja de mostrar los cinco enlaces `/me/*` en el nivel superior.
- Se introduce un **menú de usuario** desplegable anclado al nombre visible (reemplaza el
  clúster nombre + Salir actual). Agrupa: Mi perfil, Diario, Favoritos, Listas, Colección,
  Artistas seguidos, Feed / Actividad, Seguidores, Seguidos, Solicitudes (con indicador de
  pendientes cuando sea mayor que cero), Ajustes y Salir.
- **Feed / Actividad** pasa a vivir dentro del menú de usuario: es una superficie que
  depende de quién sos, no una oferta general del sitio.
- El menú de usuario y el `Panel del dueño` del perfil pasan a exponer **el mismo conjunto
  de destinos de gestión**, definido en una única fuente compartida, para que no puedan
  divergir.
- El panel móvil del Header se recompone en torno a la misma división (barra general +
  sección de usuario colapsable) en lugar de listar todo en una sola columna.
- **Fuera de alcance** (sprint posterior, sobre la estructura ya asentada): un acceso
  global `+ Registrar` en el Header y las Listas públicas con enfoque de exploración
  (Listas, Miembros) en la barra general.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `cross-view-navigation`: nueva regla sobre la estructura del Header para el usuario
  autenticado — barra general (Buscador, Explorar) separada de un menú de usuario anclado
  al nombre que agrupa las superficies personales, incluido Feed; los enlaces `/me/*` ya no
  ocupan el nivel superior de la barra; el menú muestra el indicador de solicitudes de
  seguimiento pendientes; el panel móvil respeta la misma división.
- `social-profiles`: el requisito `Panel del dueño` se ajusta para exigir que el panel del
  perfil y el menú de usuario del Header expongan el mismo conjunto de destinos de gestión
  desde una fuente compartida.

## Impact

- **Componentes**: `src/components/layout/Header.tsx` (reestructura mayor: `NAV_ITEMS`,
  `SessionCluster` → menú desplegable, panel móvil), `src/components/profiles/OwnerHubPanel.tsx`
  (consume la fuente compartida de destinos).
- **Nuevo módulo**: una definición única de los destinos de gestión del usuario (href +
  clave de traducción + badge opcional) reutilizada por el Header y el panel del perfil.
- **i18n**: nuevas claves en `messages/{es,en}/common.json` (abrir/cerrar menú de usuario,
  etiquetas que hoy solo existían en `users.*`) y posible consolidación de etiquetas
  repetidas entre `common.*` y `users.*`.
- **Accesibilidad**: el menú desplegable necesita patrón de menú accesible (foco, `Escape`,
  `aria-expanded`/`aria-controls`), en línea con el panel móvil existente.
- **Tests**: `src/components/layout/Header.test.tsx` y los tests del perfil que verifican el
  panel del dueño.
- **Sin cambios** en contratos REST, base de datos ni en el flujo de `/explore` (su
  requisito de acceso desde la navegación global se mantiene).

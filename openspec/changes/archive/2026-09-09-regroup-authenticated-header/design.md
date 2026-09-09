## Context

El `Header` (`src/components/layout/Header.tsx`) es un Client Component (necesita
`usePathname`/`useRouter` para el selector de locale). Hoy renderiza, en una sola fila para
`md+`:

```
Logo · HeaderSearch · [Explorar?] · Diary · Feed · Favorites · Lists · Collection   |   ES/EN · Username · Salir
```

Los cinco enlaces personales viven en la constante `NAV_ITEMS` y se pintan tanto en la fila
`md+` como en el panel móvil (`menuOpen`). El clúster de sesión (`SessionCluster`) muestra el
nombre visible enlazado al perfil más un botón `Salir`. El propio archivo ya documenta la
intención de separar "a dónde ir" de "quién soy / preferencias".

En paralelo, el perfil del dueño (`/users/{username}`) ya monta `OwnerHubPanel`
(`src/components/profiles/OwnerHubPanel.tsx`), que lista casi las mismas superficies `/me/*`
más `followers`, `following`, `follow-requests`, `blocks`, `settings`, con un badge de
solicitudes pendientes. Ese panel toma el conteo de `HubSection` (Server Component) vía
`pendingRequests`.

El requisito `album-discovery › Acceso desde la navegación global` fija que el enlace a
`/explore` aparezca en encabezado y pie cuando el catálogo editorial está habilitado; eso no
cambia.

## Goals / Non-Goals

**Goals:**

- Separar en el Header la **barra general** (Buscador, Explorar) del **menú de usuario**
  anclado al nombre visible.
- Mover las superficies personales (Diario, Favoritos, Listas, Colección, Artistas seguidos,
  Feed, Seguidores, Seguidos, Solicitudes, Ajustes, Salir) dentro de ese menú.
- Definir **una única fuente** de los destinos de gestión del usuario, consumida por el menú
  del Header y por `OwnerHubPanel`.
- Conservar el badge de solicitudes de seguimiento pendientes en el menú.
- Mantener el panel móvil coherente con la misma división.
- Mantener typecheck, lint, test y build en verde y la accesibilidad del menú.

**Non-Goals:**

- El acceso global `+ Registrar` en el Header (sprint posterior; hoy `MarkAsListened`
  siempre nace desde una página de entidad y no existe un flujo de registro sin `target`).
- Listas públicas / Miembros con enfoque de exploración en la barra general (sprint
  posterior).
- Rediseño visual del perfil o de `OwnerHubPanel` más allá de consumir la fuente compartida.
- Cambios en contratos REST, base de datos o en el comportamiento de `/explore`.
- Notificaciones (campana) al estilo Backloggd.

## Decisions

### 1. Fuente única de destinos de gestión

Nuevo módulo `src/components/layout/user-menu-items.ts` (sin JSX) que exporta la lista
ordenada de destinos como datos: `{ href, labelKey, group }`, más un helper que acepta el
conteo de solicitudes pendientes y devuelve la lista con el `badge` resuelto.

- El Header y `OwnerHubPanel` importan esa lista y sólo aportan su propio marcado.
- Las claves de traducción se unifican bajo un namespace único. Hoy el Header usa
  `common.*` y el panel usa `users.*`; se elige **`common.*`** como hogar canónico (el
  Header ya vive ahí) y `OwnerHubPanel` pasa a leer de ahí. Se retiran las claves `users.*`
  que queden huérfanas.
- `Mi perfil` (`/users/{username}`) es parte de la lista sólo en el menú del Header; el
  panel del perfil no se autoenlaza. El helper marca ese ítem como `headerOnly` para no
  alterar `OwnerHubPanel`.

**Alternativa descartada:** dejar dos listas y cubrir la coherencia con un test de
snapshot compartido. Rechazada: el objetivo explícito es que no puedan divergir, y un test
no impide que alguien edite una sola.

### 2. Menú de usuario como desplegable controlado por `useState`

El menú es un botón (`aria-haspopup`, `aria-expanded`, `aria-controls`) con un cheurón hacia
abajo junto al nombre, que despliega un panel con los enlaces. Estado local `open` en el
componente `UserMenu`.

**Apertura al posar el cursor** (interacción primaria en escritorio): `onMouseEnter` del
contenedor abre, `onMouseLeave` cierra. El contenedor envuelve control + panel y el panel
arranca pegado al control (sin `margin` que deje un hueco muerto) para que mover el cursor
del nombre al panel no dispare `mouseleave`.

**Sin cursor:** el clic sobre el control alterna (táctil y teclado), `Escape` cierra
devolviendo el foco al control, y se cierra también por navegación (`usePathname` effect) y
por click fuera (`pointerdown` en `document` mientras esté abierto).

- No se introduce ninguna dependencia de UI. El proyecto no tiene librería de menús y el
  patrón requerido es acotado.
- Se extrae un componente `UserMenu` en el mismo archivo o en
  `src/components/layout/UserMenu.tsx` para no inflar `Header`.
- El foco vuelve al botón al cerrar con `Escape`. Los ítems son `Link`s navegables con
  `Tab`; no se implementa navegación con flechas (menú de enlaces, no `menuitem`
  roving-tabindex) — se usa `role="menu"`/`menuitem` sólo si no complica el foco, si no se
  deja como lista de enlaces en un `<nav aria-label>`.

**Alternativa descartada:** `<details>/<summary>`. Más simple pero el cierre por click fuera
y por navegación con `next/link` client-side queda frágil y el control de foco es peor.

### 3. Feed dentro del menú de usuario

`/me/feed` sale de la barra general y entra en la lista de `user-menu-items.ts` en el grupo
de superficies personales, etiquetado "Feed" / "Actividad" según copy existente. No se
añade al `OwnerHubPanel` salvo que se decida lo contrario (hoy el panel no lista feed; se
mantiene esa decisión para no ampliar alcance — la fuente compartida permite `headerOnly`
igual que `Mi perfil`).

### 4. Panel móvil

Debajo de `md` el Header sigue colapsando en un panel. Se recompone en dos bloques
separados por un divisor: (a) barra general — `HeaderSearch` + Explorar; (b) sección de
usuario — los mismos ítems del menú desplegable como lista vertical, más ES/EN y `Salir` al
pie. Sin desplegable anidado en móvil: la lista va expandida dentro del panel ya abierto.

### 5. Purpose en `cross-view-navigation`

El spec `openspec/specs/cross-view-navigation/spec.md` no tiene sección `## Purpose`, que
`openspec archive` exige en todo spec tocado. Se añade como parte de este cambio (tarea
explícita), con una frase que describa el alcance actual del spec.

## Risks / Trade-offs

- **[Regresión de descubribilidad de las superficies `/me/*`]** → antes eran un clic desde
  cualquier página; ahora son dos (abrir menú → elegir). Mitigación: es el patrón esperado
  en apps comparables y el perfil sigue ofreciendo el panel completo; las rutas directas
  `/me/*` siguen existiendo y se pueden marcar/compartir.
- **[Accesibilidad del desplegable]** → un menú mal implementado rompe teclado y lectores.
  Mitigación: reutilizar los patrones ya probados del panel móvil (`Escape`, `aria-*`),
  tests de Testing Library sobre apertura/cierre/foco, y preferir lista de enlaces en
  `<nav>` sobre semántica `menu` completa si esta última complica el foco.
- **[Divergencia i18n al migrar `users.*` → `common.*`]** → claves huérfanas o duplicadas.
  Mitigación: barrido de `messages/{es,en}` y test que verifique que cada `labelKey` de
  `user-menu-items.ts` resuelve en ambos locales.
- **[Colisión con `redefine-content-hierarchy`]** → ese cambio no toca el Header; el riesgo
  es sólo de merge textual. Bajo.

## Why

La auditoría de `/lists` del 2026-11-21 revisó `/es/lists` sin sesión a 1440, 1024 y 390 px. Los mockups están en
`mockups/lists-2026-11/`.

Encontró que la página está por debajo del marco que ya tienen Inicio y Explorar:

- El contenido mide 1152 px, frente a 1408.
- El título mide 36 px y no tiene frase de entrada.
- Los títulos de sección miden 20 px.
- En el teléfono, los chips de tipo comparten fila con «Ordenar»: «Canciones» queda fuera de la pantalla y los chips miden 28 px de alto.

Se eligió la propuesta «B · Lector», sumándole el exhibidor y la banda de la propuesta A. Esta es la Fase 1 de tres: marco, entrada y
filtros.

## What Changes

- **Marco:** la página pasa al contenedor ancho de Inicio y Explorar (`max-w-[88rem]`, márgenes fluidos, 64–80 px entre secciones) y
  gana una frase de entrada bajo un título de 40–64 px.
- **Jerarquía:** las secciones de la vitrina usan el encabezado de página compartido (`SectionHeading`, de 30–40 px). Son Destacadas,
  De la gente que sigues, Populares y Recientes.
- **Filtros:**
  - El tipo pasa de chips a un control segmentado de 44 px.
  - Búsqueda y orden también miden 44 px.
  - Desde `lg` van en una fila; por debajo, los segmentos ocupan su propia fila a todo el ancho, sin desplazamiento.

### Goals

- Mismo marco y escala que el resto del sitio.
- Filtros completos y tocables en el teléfono.

### Non-Goals

- Las filas, el lector con vista previa y la retirada del riel lateral: **Fase 2**.
- El exhibidor de la destacada, la banda para crear cuenta y el pulido de estados: **Fase 3**.
- El estado filtrado por dentro (sigue con su grilla) y las páginas de una lista.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `community-lists`: el filtro por tipo del toolbar pasa a control segmentado, con controles de 44 px y una fila propia en el teléfono.

## Impact

- **Página:** `src/app/[locale]/lists/page.tsx`.
- **Componentes:** `src/components/lists/{CommunityListsToolbar,CommunityListSection}.tsx`.
- **Mensajes:** `messages/{es,en}/lists.json` (frase de entrada) y `client-messages.json` si cambia el toolbar.
- **Tests:** los del toolbar y los de la página.
- **Documentación:** `docs/05-features/lists.md`, o el documento que describa la página.
- **Sin cambios:** API, esquema y dependencias. Las páginas informativas no cambian.

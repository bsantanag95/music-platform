## Why

La página `/explore/collections` es hoy una columna de secciones por familia con una o dos tarjetas cada una: en 1280 px
hay más aire que contenido, el primer pantallazo es solo título y una frase genérica, y nada dice a quien llega por
primera vez qué abrir primero. Además las tarjetas muestran solo título y conteo (los presentadores ya saben decir por qué
una colección está ahí, pero solo el detalle los usa), aparecen colecciones con 0 álbumes, la pila de carátulas se sale del
escenario de la tarjeta y el archivo muestra filtros aunque esté vacío.

## What Changes

- **Una colección destacada arriba**, grande, con la pila de carátulas, el sello de familia, el título, la frase de
  contexto del presentador y la acción de abrirla. Es la primera de las vigentes en el orden editorial (el mismo del riel de
  `/explore`), sin consulta nueva.
- **Una sola rejilla de vigentes** en vez de una sección por familia: el tipo lo dice el sello de cada tarjeta y pasa a ser
  un **filtro** (`?familia=`) que se aplica a vigentes y archivo a la vez. Solo se ofrecen los tipos que tienen contenido.
- **Frase de contexto en cada tarjeta** de la página (el resumen del presentador: "Cumplen años en octubre de 2026 · de 20
  a 70 años", "Grammy 2025 · 2 de febrero de 2025"), hasta dos líneas y en lugar de la descripción, sin tocar el contrato de los
  presentadores.
- **Cabecera con una frase que explica qué es una colección** frente a una lista de personas, con enlace a Listas.
- **Colecciones sin álbumes no se listan** en ninguna superficie (página, riel de `/explore`, Inicio anónima y archivo).
- **La pila de carátulas cabe en su escenario**: cinco fundas en la tarjeta de la página, con el abanico abierto al pasar el
  mouse dentro del marco.
- **Archivo compacto**: tarjetas densas (seis por fila), el bloque se omite si está vacío y, con un filtro activo, el vacío
  ofrece volver a "Todas". La etiqueta larga de la familia de rankings se acorta para que quepa en el sello y en el chip.

Fuera de alcance:

- Cambiar cómo se generan, rotan u ordenan las colecciones, o el contrato de los presentadores.
- El detalle de una colección y el riel de `/explore` (salvo no listar colecciones vacías y el sello más corto).
- Personalizar la página por quien la visita (sigue siendo la misma para todas las personas).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `explore-collections-hub`: la página de colecciones pasa de "grupos por familia" a destacada + rejilla filtrable +
  archivo compacto; la tarjeta lleva la frase de contexto; las colecciones sin álbumes no se listan; el filtro por familia se
  comparte entre vigentes y archivo.

## Impact

- `src/app/[locale]/(catalog)/explore/collections/page.tsx` (composición nueva) y componentes nuevos de la destacada y la
  barra de filtro.
- `src/components/discovery/CollectionRail.tsx` y `CollectionSleeves.tsx` (línea de contexto, tamaño de la pila).
- `src/services/discovery/discovery.ts`: condición de "tiene álbumes" en la condición común de colecciones, familias con
  contenido y resúmenes del hub (un lote de álbumes por colección y un presentador por colección, solo su resumen).
- Mensajes `catalog.json` (es/en): cabecera, filtro, destacada, etiqueta corta de rankings.
- Docs: ADR 0040, `docs/05-features/explore.md`. Sin migraciones ni cambios de API.

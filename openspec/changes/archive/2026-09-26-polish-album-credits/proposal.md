## Why

La pestaña Créditos ya muestra los datos correctos, pero se lee peor de lo que debería. Hay
roles que llegan sin traducir ("other vocals", "grand piano", "video director"), los roles
de un intérprete salen en el orden de MusicBrainz ("coros, voz principal"; "percusión,
batería"), las pistas se listan una por una aunque sean diez seguidas ("pistas 2, 3, 4, 5,
6, 7, 8, 9, 10, 11"), y los niveles contraídos parecen texto suelto, muy espaciado y sin
señal de que se pueden abrir. En la base de prueba, 19 atributos y 8 tipos de rol no tienen
traducción (136 de ~10.000 usos).

## What Changes

- **Traducciones faltantes**: se agregan a `es` y `en` los atributos y tipos de rol que hoy
  llegan crudos (inventario tomado de los créditos reales ingeridos), y una prueba que
  mantiene iguales las claves de ambos idiomas. El fallback al texto de MusicBrainz se
  mantiene para lo que falte en el futuro.
- **Orden de los roles de intérprete por peso**: voz principal primero, luego los
  instrumentos, luego coros y demás voces de apoyo, y al final la percusión menor
  (percusión, pandereta, shakers, palmas, …). Solo se reordenan los roles de instrumento y
  voz; los demás conservan el orden actual (producción primero en su nivel, etc.). Como
  consecuencia, el "+N" esconde los roles de menor peso.
- **Pistas compactas**: tres o más pistas consecutivas del mismo disco se muestran como
  rango ("pistas 2–11", con ambos extremos enlazados); si una persona está en todas las
  pistas menos una o dos, se muestra "todas salvo la 1" (el número excluido sigue enlazado).
- **Niveles contraídos legibles**: los niveles contraídos (Composición, Músicos invitados,
  Producción y sonido, Arte y otros) se agrupan en una lista compacta con divisores finos,
  un chevron visible, fondo al pasar el mouse, y el nombre del nivel en un color distinto
  del resumen de nombres. Arte y otros adopta el mismo formato que los demás.

## Goals / Non-Goals

**Goals**
- Que ningún rol o instrumento frecuente del catálogo se vea en inglés en `es`.
- Que el rol principal de cada intérprete sea lo primero que se lee.
- Que la línea de pistas no ocupe más de una línea en los casos habituales.
- Que los niveles contraídos se reconozcan como desplegables.

**Non-Goals**
- No se cambia qué personas aparecen ni en qué nivel, ni la regla de "todo contraído salvo
  el primer nivel".
- No se toca la vista Por canción (sus filas no listan pistas) más allá de heredar las
  traducciones y el orden de roles.
- No se agrega la autoría en las filas de integrantes, el ancho del bloque de integrantes
  ni el enlace de atribución a MusicBrainz (quedan para otro cambio).
- No se cambia el modelo de datos ni la ingesta.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `catalog-album`: filas de crédito compactas (rangos de pistas y "todas salvo"), orden de
  roles de intérprete por peso, traducciones de roles e instrumentos, y presentación de los
  niveles contraídos de la pestaña Créditos.

## Impact

- `src/components/album/credit-roles.ts` (orden de roles, formato de pistas) y sus pruebas.
- `src/components/album/AlbumCredits.tsx` (pistas en rango/exclusión, estilo de niveles
  contraídos) y sus pruebas.
- `messages/es/catalog.json`, `messages/en/catalog.json` (roles y atributos nuevos, textos
  "todas salvo").
- `docs/05-features/catalog-browsing.md` (descripción de la pestaña Créditos).
- Sin migraciones, sin cambios de API, sin dependencias nuevas.

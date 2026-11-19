## Why

El fondo de la cabecera del Inicio con sesión («¿Qué escuchaste hoy?», `redesign-signed-in-home-phase1`) es el mismo mosaico curado
de la portada pública (`public/hero/wall.webp`) para todo el mundo. Es la única superficie de la cabecera que no dice nada de la
persona: con sus propios discos de fondo, el Inicio se siente suyo desde el primer viewport. Las escuchas recientes no sirven para
esto porque el estante «Lo último que escuchaste», justo debajo, ya las muestra; los favoritos de álbum (identidad estable) y los
álbumes más escuchados sí aportan algo distinto.

## What Changes

- El fondo de la cabecera con sesión se arma con **los álbumes de la persona**, en este orden de prioridad:
  1. **Álbumes marcados como favoritos** (solo objetivos de álbum), del más reciente al más antiguo.
  2. **Álbumes más escuchados** (por cantidad de escuchas, no por fecha), para completar.
  3. **El mosaico general** para las celdas que falten.
- Solo cuentan los álbumes con carátula. Por debajo de un **mínimo de 6 álbumes**, el fondo es el mosaico general entero, igual que
  hoy (una sola imagen, sin peticiones extra).
- El fondo conserva su papel decorativo: misma opacidad baja, misma máscara que lo deja ver solo hacia la derecha, oculto para
  tecnologías de asistencia, sin enlaces. Por debajo de `lg`, donde el titular queda sobre más superficie de fondo, la máscara es más
  agresiva para no competir con «¿Qué escuchaste hoy?».
- Las carátulas personales se cargan sin prioridad y solo en las celdas visibles (como mucho 20), en miniatura de 250 px.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `home`: nuevo requisito para el fondo de la cabecera de Inicio con sesión (origen de las carátulas, prioridad, mínimo y relleno con
  el mosaico general, carácter decorativo).

## Impact

- **Datos:** nueva consulta `listMyBackdropAlbums(userId, limit)` en `src/services/home/home.ts` (favoritos de álbum + álbumes más
  escuchados, sin duplicados, con carátula). Sin cambios de esquema, API ni migraciones; usa `idx_favorite_user_created` e
  `idx_listen_entry_user_created`.
- **Componentes:** `SignedInHero` (recibe las carátulas), nuevo `HeroBackdrop` (rejilla de celdas con las del mosaico general como
  relleno, recortadas con `heroWallTilePosition`), `AuthenticatedHome` (pide los álbumes en paralelo con el resto).
- **Rendimiento:** hasta 20 miniaturas de 250 px adicionales en Inicio con sesión cuando la persona supera el mínimo; ninguna si no.
- **Licencia:** las mismas miniaturas de 250 px del espejo o de Cover Art Archive que ya muestra el estante (`docs/03-data/data-licensing.md`).
- **Docs:** `docs/05-features/home.md` (cabecera del Inicio con sesión). Las páginas informativas no describen el fondo.
- Sin dependencias nuevas.

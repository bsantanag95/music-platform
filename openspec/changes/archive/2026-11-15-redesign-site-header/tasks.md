## 1. Estructura y marca

- [x] 1.1 Fila de escritorio en rejilla de tres zonas: marca + navegación | buscador | cuenta
- [x] 1.2 `Logo withName`: monograma + `appName` desde `sm`, nombre accesible «{appName} — Inicio»; el pie sigue sin nombre; pantalla de foco con la misma marca
- [x] 1.3 Navegación en `font-display`, `px-3 py-2`, fondo al pasar el cursor, subrayado ámbar en la sección actual

## 2. Buscador

- [x] 2.1 Modo `header` del buscador compacto: ancho fluido (mín. ~12rem, máx. 30rem), alto 40 px, pista `/` con el campo vacío y sin foco
- [x] 2.2 Atajo `/` en `Header`: enfoca el campo en escritorio o abre la fila por debajo de `lg`; ignorado en campos editables, con modificadores o con un diálogo modal abierto
- [x] 2.3 Tests del atajo (enfoca, abre la fila, no actúa en un campo ni con Ctrl) y del ancho fluido

## 3. Cuenta

- [x] 3.1 Sin sesión: «Iniciar sesión» fantasma y «Crear cuenta» primario (`common.createAccount`), `h-10`
- [x] 3.2 Selector de idioma más grande; «Añadir», campana y menú de usuario sin cambios, centrados en la fila
- [x] 3.3 Tests de `Header`: orden marca → navegación → buscador, acciones sin sesión, marca con nombre

## 4. Documentación y verificación

- [x] 4.1 Mensajes `messages/{es,en}/common.json` y `pnpm run i18n:client-messages`
- [x] 4.2 `DESIGN.md` (Navigation) y `docs/05-features/phase-5-design.md` §10.1 (orden, marca, atajo)
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 4.4 Verificación en el navegador a 1024, 1280, 1440, 820 y 390 px con y sin sesión en Inicio, álbum y `/search` (sin desbordes, atajo `/` con teclado)

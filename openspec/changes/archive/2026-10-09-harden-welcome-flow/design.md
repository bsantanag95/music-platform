## Decisiones

**D1 — `sessionStorage`, no servidor.** La selección es del flujo en curso en esa pestaña; persistirla en servidor exigiría un endpoint y una tabla para algo que dura minutos y se descarta al cerrar. `sessionStorage` sobrevive a recargas y se limpia al cerrar la pestaña.

**D2 — Hidratar tras el primer render.** El HTML del servidor siempre sale con el estado inicial; `useSessionState` lee el almacenamiento en un efecto y escribe solo después de hidratar (si no, el primer render vacío pisaría lo guardado). Todo acceso va en `try/catch`: en modo privado o con el almacenamiento bloqueado el hook se comporta como `useState`.

**D3 — Claves por persona y limpieza al cerrar.** `welcome:<userId>:{step,albums,artists,listens}`. Otra cuenta en la misma pestaña empieza de cero; al cerrar con éxito `clearSessionState("welcome:<userId>:")` borra las cuatro. Un valor con otra forma se descarta con una guarda de tipo por clave (no se confía en lo que hay en el almacenamiento).

**D4 — Navegación completa tras autenticarse.** `router.refresh()` solo existía para que el Header (layout compartido) se renderizara con la sesión. Una navegación completa lo hace con una sola petición y sin trabajo abortado; cuesta recargar los recursos estáticos (cacheados). Se aísla en `hard-navigate.ts` porque jsdom no implementa `location.assign`. La URL lleva el prefijo de idioma (`/es`, `/en`; `localePrefix` por defecto «always»), con el idioma preferido de la cuenta si difiere. `pending` se conserva hasta que cambia la página.

**D5 — «Ir a Inicio» sin `refresh`.** Inicio es dinámico (Next 15 no cachea páginas dinámicas en el cliente por defecto) y el cierre del onboarding no cambia el layout.

## Medición (dev, scratch, 2026-10-09)

| | Antes | Después |
|---|---|---|
| Peticiones de `/welcome` tras registrarse | 2 (una abortada) | 1 |
| Recargar en el paso 2 con un álbum elegido | vuelve al paso 1, sin álbum | paso 2, álbum conservado |

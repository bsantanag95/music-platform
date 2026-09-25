## Context

Medido con una cuenta con ambos roles a 800 px: logo 32 + buscador 144 + navegación 656 +
idioma y usuario 155 + separaciones ≈ 1.067 px. Sin los dos enlaces de rol, ≈ 833 px. El
Header colapsa hoy por debajo de `md` (768 px).

## Decisions

- **D1. Grupo `tools` en `user-menu-items.ts`.** Ítems `moderation` (`/moderation`,
  requiere `moderation.review_content` o `moderation.suspend_social`) y `administration`
  (`/admin`, requiere `editorial.author`), superficies `header` y `panel`, con un campo
  `requires` (cualquiera de los permisos). `buildUserMenuItems` recibe `permissions` y
  filtra; sin `requires`, el ítem se muestra siempre. El grupo va antes de `account`.
- **D2. `lg` en lugar de `md`** en las clases del Header (fila de escritorio, botón del
  panel, panel). Con los roles fuera de la barra, la fila completa necesita ≈ 833 px, que
  entra holgada en 1024 px.

## Risks / Trade-offs

- Moderación y Administración quedan a un clic más → son herramientas de uso puntual y el
  menú se abre al posar el cursor.
- Tablets en horizontal (768–1023 px) pasan a ver el panel colapsado → preferible a una
  página con desplazamiento horizontal.

## Migration Plan

Solo UI.

## Open Questions

Ninguna.

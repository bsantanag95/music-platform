# Convención: Naming de Design Tokens de Color

<!-- Sugerido para: /docs/02-architecture/conventions.md o como sección nueva -->

## Contexto

El sistema de diseño ("The Vinyl Listening Room") define los tokens de color en dos lugares con vocabularios distintos:

- **`src/app/globals.css`** (fuente de verdad en producción): nombres literales de color — `amber`, `petrol`.
- **`design-system.md`** (documento de diseño / Impeccable): nombres de rol semántico — `primary`, `secondary`.

Ninguno de los dos está "mal": son dos capas distintas de un mismo sistema (rol de uso vs. instancia de color concreta). El problema es que no existía un mapeo explícito entre ambos, lo cual es el mismo patrón de deriva documental ya identificado en el proyecto (caso ADR 0006, tRPC vs. REST).

## Decisión

**El CSS es la fuente de verdad para el nombre de la variable.** `globals.css` ya está en producción; es más barato alinear la documentación al código que renombrar variables CSS en uso. El design-system.md mantiene sus nombres de **rol** (`primary`, `secondary`) como capa de intención de diseño, pero cada rol debe declarar explícitamente a qué variable CSS y a qué display name corresponde.

### Tabla de mapeo canónica

| Rol semántico (design-system.md) | Variable CSS (`globals.css`) | Display name (naming creativo) | Hex |
|---|---|---|---|
| `primary` | `--color-amber` | VU Gold | `#e8b84b` |
| `primary-hover` | `--color-amber-hover` | VU Gold Hover | `#f2c866` |
| `secondary` | `--color-petrol` | Vintage Teal | `#4a7c7c` |
| `secondary-hover` | `--color-petrol-hover` | Vintage Teal Hover | `#5b9494` |
| `danger` | `--color-danger` | Wax Seal | `#d96c5f` |
| `ink` | `--color-ink` | Ink | `#14120f` |
| `ink-surface` | `--color-ink-surface` | Vinyl Surface | `#1f1b17` |
| `ink-border` | `--color-ink-border` | Groove Line | `#2e2a24` |
| `paper` | `--color-paper` | Paper | `#f2ede4` |
| `paper-muted` | `--color-paper-muted` | Aged Linen | `#a89e8e` |

**Regla:** cualquier documento, componente o skill que necesite referirse a un color debe usar la variable CSS (`--color-amber`) como identificador técnico definitivo. Los nombres de rol (`primary`) y los display names (`VU Gold`) son capas de lectura humana sobre esa misma variable — nunca identificadores alternativos independientes.

## Resolución del duplicado `--color-accent`

`globals.css` define actualmente:

```css
--color-amber: #e8b84b;
--color-accent: #e8b84b;
```

Dos variables, mismo valor, sin comentario que justifique la duplicación. Esto es redundancia sin propósito declarado — exactamente el tipo de ambigüedad que hace que dos agentes/desarrolladores diverjan en qué variable usar en componentes nuevos.

**Decisión: eliminar `--color-accent` y `--color-accent-hover`.** `amber` ya es el nombre que carga el peso semántico e identitario del sistema — está atado a "The Rarity Rule", al VU-meter, a la metáfora central del norte creativo. `accent` es un nombre genérico que no aporta significado adicional y compite innecesariamente por el mismo rol.

- Si en algún componente ya existe una referencia a `--color-accent` en el código, debe migrarse a `--color-amber` antes de remover la variable (buscar usos con `grep -r "color-accent" src/` o equivalente).
- Si se prefiere no tocar código todavía por costo/riesgo, como paso intermedio se puede dejar `--color-accent` como alias documentado explícitamente:
  ```css
  /* Alias legado — usar --color-amber en código nuevo. Pendiente de remoción. */
  --color-accent: var(--color-amber);
  --color-accent-hover: var(--color-amber-hover);
  ```
  Esto evita que ambos valores diverjan por error si `amber` cambia en el futuro, y dexa un rastro explícito de que es deuda técnica, no una decisión de diseño.

## Acción sugerida

1. Confirmar si `--color-accent` tiene usos reales en el código (`grep`).
2. Si no hay usos: eliminar directamente.
3. Si hay usos: migrar a `--color-amber` en la misma tanda de cambios, o aplicar el alias temporal de arriba y trackear la remoción como tarea pendiente en `04-risks.md` o en el checklist de OpenSpec correspondiente.
4. Añadir esta tabla de mapeo (o un link a este documento) en `design-system.md`, sección Colores, para que quede visible junto a los nombres creativos.

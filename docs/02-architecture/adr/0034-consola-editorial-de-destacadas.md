# ADR 0034 — Consola editorial para destacar, programar y pausar colecciones de /explore

## Estado

Aceptado (cambio `manage-explore-featured-console`, 2026-10). Segundo paso tras la generación automática
([ADR 0033](0033-colecciones-destacadas-generadas-por-plantillas.md)).

## Contexto

Con ADR 0033 el riel de `/explore` se llena solo, pero las personas con rol editorial no tenían forma de decidir qué se
destaca: la única escritura sobre `user_list_featured` era un script. Los roles (`editorial_curator`, `admin`), la
consola `/admin` y el flujo borrador → propuesta → publicada ya existen (ADR 0013); faltaba el eslabón entre "lista
oficial publicada" y "destacada en Explorar", y un control sobre las plantillas automáticas.

## Decisión

1. **Permisos sin cambios.** Ver los paneles exige `editorial.author`; destacar, quitar, reordenar, programar y
   gestionar plantillas exigen `editorial.publish`. Destacar decide lo que ve la portada de todos, así que queda con quien
   ya publica; permitirlo a `editorial_curator` reintroduciría el acoplamiento autoría/publicación que resolvió ADR 0013.
   El servidor impone el permiso aunque la UI oculte los controles.
2. **Elegibilidad en el servicio** (`src/services/discovery/featured.ts`): solo se destaca una lista de `@exploracion`,
   `kind='standard'`, de álbumes, pública, visible, oficial y no retirada. Errores estables: `FEATURE_NOT_ELIGIBLE`,
   `FEATURE_NOT_PUBLISHED`. Destacar una lista ya destacada es idempotente (solo aplica vigencia y peso).
3. **El riel exige la elegibilidad al leer** (`featuredRailCondition()`): una curada cuya lista se retira, se oculta o
   deja de ser pública sale del riel sin perder su fila y vuelve si se republica. Las generadas no son oficiales, así que
   no se les exige.
4. **Orden atómico por conjunto completo.** `PUT /featured/order` recibe todos los ids vigentes o programados; asigna
   `weight` descendente y `rank` consecutivo en una transacción con `FOR UPDATE` y falla con `FEATURED_ORDER_CONFLICT`
   si el conjunto difiere. La UI reordena con botones subir/bajar (accesibles, sin arrastrar).
5. **Quitar** borra la fila de una curada y **vence** la de una generada (no se borra: lleva el historial del período).
   Al rotar de período, la lista nueva hereda `weight` y `rank` de la anterior de la plantilla para que el orden
   editorial sobreviva.
6. **Pausar plantillas** (`explore_collection_template_state`, migración `0070`). Una plantilla pausada no se regenera por
   visita ni por script (salvo `--include-paused`); pausar vence su colección vigente y reanudar devuelve la de su período
   vigente. "Regenerar ahora" corre en segundo plano (`202`) respetando el lock de corridas, incluso si está pausada.
7. **Auditoría.** `editorial_action` admite `feature` y `unfeature`: destacar, quitar, reordenar, reprogramar, pausar y
   reanudar quedan registrados con la persona actora. `paused_by` usa `ON DELETE SET NULL` (dato operativo, no auditoría).
8. **UI** en la consola existente, con pestañas (Listas · Destacadas en Explorar · Generadas automáticamente). Sin
   permiso de publicar los paneles son de solo lectura.

## Alternativas descartadas

- **Permitir destacar a `editorial_curator`:** ver decisión 1.
- **Nuevo permiso `editorial.feature`:** ningún rol necesita destacar sin publicar; dividir un bundle después es un cambio
  de código sin migración (ADR 0013).
- **Reordenar por posición (`PATCH` por fila):** dos personas a la vez dejarían pesos repetidos; el conjunto completo hace
  el conflicto detectable.
- **Arrastrar y soltar:** más código y peor accesibilidad que botones; se puede añadir sin cambiar el contrato.
- **Borrar la fila de una generada al quitarla:** la plantilla la recrearía en la siguiente corrida del mismo período.
- **Editar el contenido de una lista generada:** el reemplazo completo de la siguiente corrida lo pisaría; la curaduría
  humana usa listas oficiales.

## Consecuencias

- Una curada ya destacada que se retira desaparece del riel en silencio; el panel la marca "Fuera del riel" con el motivo.
- Pausar una plantilla deja el riel más corto; el panel muestra cuántas tarjetas hay en el riel.
- Quitar una generada sin pausar su plantilla: el período siguiente vuelve a crearla (el panel lo deja claro con la
  acción "Pausar").
- Las filas viejas `curated` creadas a mano por SQL sobre listas no oficiales dejan de mostrarse (hay que publicarlas).

## Context

`SongCredits` dibuja cada grupo (`CreditGroup`) como un título y una lista de filas. La pestaña Créditos del álbum
pliega sus niveles en `<details>` con un resumen (`levelSummaryMore`: cantidad, tres nombres y "y N más") y el chevron
común.

## Decisions

### D1. Umbral de 6 personas

Un grupo con más de 6 personas (contando a los asistentes de Sonido) se pliega; con 6 o menos se ve entero, porque
plegar ahorraría poco y escondería lo esencial (el productor, quien mezcla). Intérpretes nunca se pliega: es lo que se
viene a ver en una canción. Es la decisión D1 de la auditoría.

### D2. Mismo resumen que el álbum

`levelSummaryMore` con los tres primeros nombres en el orden ya calculado (en Sonido, por rol principal), sin asistentes
en los nombres. El `<details>` usa la misma forma que `CollapsibleLevel` del álbum: chevron que gira, título y resumen
que se oculta al abrir.

### D3. Chevron en asistentes

El `summary` de "+N asistentes" pone el chevron común delante, girado mientras está cerrado.

## Risks / Trade-offs

- **Grupo de 7 con el productor dentro**: queda a un clic. El resumen nombra a los tres primeros, y en Sonido el
  orden por rol pone la mezcla primero.

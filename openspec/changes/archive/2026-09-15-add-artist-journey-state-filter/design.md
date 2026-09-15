## Context

`ArtistJourneyList` ya resuelve búsqueda y orden en un único `useMemo` sobre `items` (el listado
completo que llegó del servidor). El filtro de estado es un tercer criterio del mismo tipo —
cliente, sin ida y vuelta al servidor — que se combina con los otros dos.

## Goals / Non-Goals

**Goals:**
- Acotar el listado a un solo estado (o a todos), combinable con búsqueda y orden.
- Mismo criterio de no-persistencia que el resto de los filtros de esta página.

**Non-Goals:**
- No cambia el orden canónico de estados (en curso, completo, archivado) que ya usa "Ordenar por
  estado" — el filtro no introduce un orden nuevo, solo acota.
- No toca el servicio ni el endpoint: `items` ya trae los tres estados: filtrar es puramente de
  presentación.

## Decisions

**D1 — El filtro de estado se aplica en el mismo `useMemo` que ya filtra por búsqueda y ordena,
antes de ordenar.** Evita un segundo `useMemo` encadenado y mantiene un solo lugar con la lógica
de "qué se ve" — igual que ya conviven el filtro de búsqueda y el ordenamiento en esa misma
función.

**D2 — Cuatro opciones en un `FilterSelect` (mismo componente que ya usa "Ordenar"), no un grupo
de radios.** Es un control de reemplazo mutuamente excluyente como "Ordenar" (mismo patrón visual
y de interacción, no una adición junto al buscador con otro lenguaje). Alternativa descartada: un
grupo de chips por estado — se deja fuera por ahora para no introducir dos idiomas visuales de
filtro en la misma barra.

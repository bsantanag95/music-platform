## Why

El hub de premios muestra qué ganó, pero no dice nada de la persona que lo mira. Para una biblioteca personal, la pregunta natural
frente a una lista de ganadores es "¿cuáles escuché y cuáles me faltan?", y hoy hay que abrir cada álbum para saberlo.

## What Changes

- Con sesión, "Ganadores recientes" muestra el progreso de la persona: "Has escuchado 4 de 12 álbumes ganadores", con una barra.
- Cada carátula lleva su marca: **Escuchado** (registró una escucha o lo valoró) o **Pendiente** (lo tiene en Pendiente y no lo
  escuchó).
- Filtro **Todos / Te faltan N** (`/awards?ganadores=faltan`): deja solo los álbumes que no escuchó, una vez cada uno.
- Sin sesión, la sección no cambia.

## Impact

- Nuevo `src/services/awards/personal.ts` (reutiliza `getDiscographyMarks`: una consulta por tabla, sin consultas nuevas).
- `RecentWinnersRail` (progreso, marcas y filtro), `src/app/[locale]/(catalog)/awards/page.tsx` (sesión y `searchParams`),
  `messages/{es,en}/awards.json`, `docs/05-features/awards.md`.
- Sin cambios de esquema. Las marcas son de la persona y solo se le muestran a ella.

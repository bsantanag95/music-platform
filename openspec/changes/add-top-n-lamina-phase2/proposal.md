## Why

La Fase 1 dejó el Top N armado a mano: buscar diez discos uno por uno toma minutos. La promesa de `docs/05-features/sharing.md` §4.2 es armarlo en
segundos desde lo que la persona ya registró, con un título que empuje el ritual ("Mis 10 discos de 2026"). Esta es la segunda de tres fases.

## Goals

- Pasar de cero a una Lámina llena en menos de 30 segundos para quien ya tiene valoraciones o favoritos.
- Que una Lámina armada desde datos personales nunca quede a la vista sin una decisión explícita.

## Non-Goals

- "Arma la tuya" con registro dirigido (Fase 3).
- Una Lámina que se actualice sola: una fuente copia ítems una vez; el Top N sigue siendo de autor.
- Filtrar por tipo de disco, usar listas guardadas o de otra persona, o tomar ítems de una colección física o un Camino.
- Artistas como ítems.

## What Changes

- **Tres fuentes:** tus valoraciones, tus favoritos o una lista propia, además de a mano.
- **Filtros de valoraciones y favoritos:** año de lanzamiento o década, año de escucha, género (con subgéneros) y artista. Solo se ofrecen valores que la fuente tiene.
- **Año de escucha:** ítems con al menos una escucha registrada ese año en el diario, en la zona horaria de la persona.
- **Vista previa:** hasta 30 candidatos con los primeros ya elegidos; la persona quita y cambia antes de confirmar.
- **En el alta y en el editor:** al crear, el panel llena la Lámina y sugiere el título. En una Lámina existente completa solo los lugares libres, sin tocar lo que ya hay.
- **Títulos sugeridos:** según formato, tipo y filtros, en el idioma de la interfaz. Editables, y sin pisar lo que la persona escribió.
- **Audiencia:** una Lámina creada desde una fuente nace **Solo yo**, sea cual sea la audiencia por defecto. Se publica con el gesto que ya existe.
- **Notas:** usar valoraciones como fuente no enciende las notas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `top-laminas`: fuentes, filtros, vista previa, completar, títulos sugeridos y audiencia de lo armado desde una fuente.

## Impact

- **Base de datos:** sin migración. Una fuente copia ítems; los filtros no se guardan.
- **Servicios:** `src/services/laminas/sources.ts` (nuevo) y altas por lote en `laminas.ts`.
- **API:** `GET /api/me/laminas/sources`, `GET /api/me/laminas/candidates`; `POST /api/me/laminas` con `targetIds`; `POST .../items` con `targetIds`.
- **Interfaz:** `LaminaCreateForm`, `LaminaEditor` y un panel compartido `LaminaSourcePanel`.
- **Documentación:** `docs/05-features/sharing.md`, `docs/01-domain/business-rules.md`, `docs/04-api/contracts.md`, `AGENTS.md`.

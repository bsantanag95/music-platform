## 1. Tipos y chips

- [x] 1.1 `types.ts`: agregar `collection`, `journey` y `newCamino` a `QUICK_ACTIONS` en el orden de D4; Colección solo `album`, Recorrido solo `artist` en `ACTION_PICKER_TYPES`; `newCamino` sin buscador
- [x] 1.2 Claves en `quickActions` (es/en): chips, prompts y textos de los tres paneles

## 2. Paneles

- [x] 2.1 `CollectionPanel`: cuatro formatos, `addCollectionEntry`, confirmación y "Deshacer"; pruebas
- [x] 2.2 `JourneyPanel`: lectura previa con `getArtistJourneyStatuses`, activar si no existe, enlace si existe; pruebas
- [x] 2.3 `NewCaminoPanel`: título obligatorio, `createCamino` sin audiencia, "Ver Camino" y "Agregar a este Camino"; pruebas
- [x] 2.4 `QuickActionsDialog`: cablear los tres paneles; "Agregar a este Camino" pasa a "A lista" con búsqueda de álbumes fijada; pruebas del diálogo

## 3. Documentación y verificación

- [x] 3.1 `phase-5-design.md`: lista de acciones del diálogo
- [ ] 3.2 `typecheck`, `lint`, pruebas, `build`; verificación en el navegador sin escribir en datos reales

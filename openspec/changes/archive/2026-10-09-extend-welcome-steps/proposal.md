## Why

La auditoría de `/welcome` propuso aprovechar más funciones que ya existen para quien llega sin historial. Quien aún no tiene nada que valorar ni registrar puede, sin esfuerzo, **guardar discos y artistas para escuchar después** (Pendientes: una lista propia, sin audiencia, que alimenta lo que verá en su biblioteca). Hoy `/welcome` no lo ofrece, y el resumen final no sugiere ningún camino hacia las funciones que sí aportan valor a quien terminó sin hacer nada (géneros de su identidad musical, valorar, explorar).

## What Changes

- **Cuarto paso: «Para escuchar después»** (Pendientes). Busca álbumes o artistas (un tipo por búsqueda) y los guarda al elegirlos con la API existente de Want to Listen; lo guardado sale de los resultados y se lista aparte con «Quitar». Es una lista propia y privada, y el paso lo dice. Orden: álbumes → artistas → escucha ahora → para después; el indicador pasa a «Paso N de 4».
- **Resumen con sugerencias según lo no hecho**: además de lo guardado (ahora también «N en tus Pendientes»), el resumen sugiere solo lo que la persona aún no hizo —elegir sus géneros (perfil), valorar un disco (buscador), explorar (si está activo)— como enlaces, sin pasos nuevos.
- Textos y pruebas (el flujo cambia de 3 a 4 pasos).

## Capabilities

### Modified Capabilities

- `onboarding`: el onboarding pasa a cuatro pasos (se agrega el de Pendientes) y el resumen sugiere lo que falta.

## Impact

- `src/components/onboarding/`: `WantToListenPicker` nuevo; `WelcomeFlow` (pasos, conteo, resumen).
- `messages/{es,en}/onboarding.json`, `docs/05-features/onboarding.md`, spec `onboarding`. Sin cambios de API ni de esquema.

## Non-Goals

- Pasos para elegir géneros o valorar discos *dentro* del flujo: el cuestionario crecería a seis pasos. Se ofrecen como enlaces en el resumen, donde ya hay una pantalla propia para cada cosa (Ajustes → Perfil, buscador).
- Cambiar «Quiero escuchar» (toggle en el servidor) o su lista.

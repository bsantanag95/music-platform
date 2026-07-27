# ADR 0001 — Empezar con PWA en vez de app nativa

**Estado:** Aceptado

## Contexto

El conocimiento previo del equipo está en desarrollo web y software, no en desarrollo móvil nativo. El producto necesita instalabilidad, notificaciones, y compartir contenido (perfil de usuario), y a futuro una función de "qué está escuchando" en tiempo real.

## Decisión

Construir primero una Progressive Web App, no una aplicación nativa.

## Justificación

Ninguna funcionalidad planeada depende de hardware nativo exclusivo:
- Compartir perfil se resuelve con la Web Share API.
- Notificaciones se resuelven con la Web Push API.
- Instalación en pantalla de inicio se resuelve con manifest + service worker.
- "Qué está escuchando" se resuelve consultando las Web APIs de Spotify/Apple Music (polling de estado actual), no accediendo al sistema operativo.

## Alternativas consideradas

- **App nativa (Swift/Kotlin)**: descartada para el MVP — requeriría aprender un stack nuevo sin una necesidad técnica real que lo justifique en esta etapa.
- **React Native / Flutter**: no descartada a futuro, pero no aporta nada que la PWA no resuelva ya para el alcance actual del producto.

## Consecuencias

Se revisará esta decisión solo si en el futuro se necesita una integración con el sistema operativo que la web no pueda cubrir (por ejemplo, acceso a librerías de audio locales del dispositivo).

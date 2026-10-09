## Decisiones

**D1 — Un paso más, no tres.** Se evaluaron tres candidatos (Pendientes, géneros, valoración rápida). Pendientes es la única acción de un clic, sin nada que decidir y sin audiencia, que además encaja en el patrón buscar → elegir → listar → deshacer de los pasos 2 y 3. Géneros y valoración piden controles propios (selector de taxonomía, estrellas) y duplicarían pantallas que ya existen; con ellos el flujo pasaría de 3 a 6 pasos, contrario al motivo del rediseño. Pasan a ser enlaces en el resumen.

**D2 — `POST /api/me/want-to-listen` es un toggle.** Repetir el mismo objetivo lo quita. Por eso el picker saca de los resultados lo guardado, protege el doble clic con un `useRef`, y si la respuesta es `null` (el objetivo ya estaba en Pendientes y se acaba de quitar) vuelve a llamar para dejarlo guardado. «Quitar» usa `DELETE`.

**D3 — Un tipo por búsqueda (álbum / artista).** Mismo conmutador y motor (`useTargetSearch`) que la Puerta 2; Want to Listen no admite canciones.

**D4 — Persistencia por la misma vía.** Lo guardado se conserva con `useSessionState` bajo `welcome:<userId>:wanted` y se borra al cerrar, igual que los demás pasos.

**D5 — Sugerencias del resumen derivadas, sin estado.** Se muestran solo las que no se hicieron: géneros (siempre, no se conoce el estado desde el cliente; es un enlace a Ajustes → Perfil), valorar (si el paso de escucha quedó en cero: enlace a `/search`), Explorar (si está activo). Máximo tres, nunca bloquean «Ir a Inicio».

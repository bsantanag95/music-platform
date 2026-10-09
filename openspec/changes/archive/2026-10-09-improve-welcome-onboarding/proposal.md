## Why

Una auditoría de `/welcome` con un usuario nuevo (2026-10-09, sobre scratch) encontró fallas que le quitan la primera impresión a quien acaba de registrarse:

- **Puerta 2 con «Canción»**: el selector mostraba solo `results[0]` y solo si tenía grabación identidad. «Bohemian Rhapsody» ofrecía la versión de Rolf Harris; «Blinding Lights», la de Ravenlight (la de The Weeknd, tercera, no era registrable). Una búsqueda tardaba 4,5–7 s.
- **Un clic repetido duplicaba el diario**: el botón no se deshabilitaba ni se marcaba; tres clics dejaban tres entradas y Inicio decía «3 registros esta semana». No había forma de deshacer.
- **Puerta 1 con ranking pobre**: «dark side of the moon» devolvía 33 sencillos y versiones de desconocidos, sin el disco de Pink Floyd. Dos filas «In Rainbows» eran indistinguibles: el año solo aparecía una vez elegido el álbum.
- Un fallo de búsqueda se mostraba como «Sin resultados»; las búsquedas no se cancelaban (una por tecla en la cola de MusicBrainz).
- Móvil: el aviso de email (258 px, con un botón ámbar lleno) empujaba el primer campo bajo el pliegue; inputs de 14 px (iOS hace zoom); áreas táctiles de 20–38 px; 26 regiones `status` vacías (los esqueletos de carátula); el foco caía al `<body>` al elegir.
- Texto: «Cuenta quién eres musicalmente» se lee como el sustantivo «cuenta» justo encima de «Tu cuenta ya está lista»; voseo mezclado con tuteo; el ejemplo «Sabrina Carpenter» en un campo de álbum o canción.

## What Changes

- Los dos buscadores del onboarding usan el motor del diálogo «Añadir» (`useTargetSearch`, extraído de `TargetPicker`): coincidencias locales primero, búsqueda completa después, con cancelación.
- **Puerta 1**: la búsqueda completa se acota a álbumes de estudio (`category=studio`); cada fila muestra artista, año y, si no es de estudio, el tipo. Al elegir, el campo se limpia y recupera el foco; «Quitar» nombra el álbum.
- **Puerta 2**: lista **todas** las canciones registrables (`purpose: "pick"`), no solo la primera. Lo registrado sale de los resultados y se lista aparte con **«Deshacer»** (borra la entrada); los clics repetidos no duplican.
- Un fallo de búsqueda se dice como error. El estado de búsqueda es una región `status` polite; los esqueletos de carátula quedan ocultos para lectores de pantalla.
- El aviso de verificación de la bienvenida se compacta (sigue antes de las dos puertas, botón secundario).
- Móvil: inputs de 16 px y áreas táctiles de 44 px en los controles del flujo.
- Copy: «Cuéntanos quién eres musicalmente»; ejemplos de búsqueda según el tipo; voseo verbal corregido a tuteo en `messages/es`.

## Non-Goals

- Cambiar el ranking de `/api/catalog/search` (un álbum conocido sigue sin salir primero cuando hay cientos de homónimos): queda anotado como trabajo aparte.
- Rediseñar el flujo (pasos, seguir artistas, resumen final) o el aviso de audiencia del favorito sembrado: esos puntos de la auditoría son un cambio de producto aparte.
- Persistir las selecciones de la Puerta 1 entre recargas.
- El doble render de `router.push` + `router.refresh` tras el registro.

## Decisions

### D1. Pestañas en lugar de "Buscar «x» en:"

El selector del campo ya dice el tipo; "Buscar «x» en:" repetía los otros tipos como pastillas y el resumen agregaba "en
álbumes". Una barra de pestañas (el patrón de las páginas de artista y álbum) muestra los cuatro con el actual marcado y
lleva la misma consulta a cada uno. El estado vacío conserva los accesos a los otros tipos. La avanzada no lleva
pestañas de tipo (tiene las suyas).

### D2. Filtros plegables solo en móvil

`FiltersDisclosure` es un componente cliente mínimo: en móvil, un botón "Filtros · N" con `aria-expanded`; en
escritorio, el contenido con `sm:flex` siempre visible. Las pastillas siguen siendo enlaces del servidor (la página se
re-resuelve con el filtro en la URL). Se descartó una hoja modal: con 13 pastillas basta desplegar en el sitio. Artistas
no lo usa: sus 3 pastillas caben en una línea.

### D3. "Prueba con" desde la actividad

`listTrySuggestions` cuenta personas distintas (no eventos) que siguieron o valoraron un artista (o un disco suyo) y
que valoraron o escucharon en público un disco, en 7 días y, si no alcanza para dos sugerencias, en 30. Dos consultas
pequeñas en paralelo; solo en la portada. Las cifras nunca se muestran. Las miniaturas de artista siguen el criterio de
"Tus artistas" y "Popular ahora" (sin crédito en la miniatura; el crédito vive en la página del artista).

### D4. Aviso de streaming donde llega lo nuevo

`LocalFirst` pone el aviso tras las filas locales, con dos filas de esqueleto, para que la atención vaya al lugar donde
aparecerán los resultados de MusicBrainz.

## MODIFIED Requirements

### Requirement: Resultados locales sin esperar a MusicBrainz

En los tipos Artistas, Álbumes y Canciones, tanto en `/search` como en `/search/advanced`, la página
SHALL renderizar primero las coincidencias locales y SHALL transmitir por streaming las de
MusicBrainz cuando lleguen, con un indicador de carga en la zona pendiente: debajo de las filas locales, donde
aparecerán las nuevas, con dos filas de esqueleto. En el tipo Artistas de
`/search`, la redirección por coincidencia exacta única SHALL decidirse en la parte transmitida, con
la respuesta de MusicBrainz (la misma regla que sin streaming): si corresponde, la página redirige
al perfil aunque la lista local ya se haya mostrado. El resultado final SHALL ser el mismo orden
determinista que sin streaming.

#### Scenario: Álbum ya conocido
- **WHEN** una persona busca `kiss destroyer` en Álbumes y *Destroyer* existe localmente
- **THEN** *Destroyer* se ve de inmediato y los resultados de MusicBrainz aparecen después sin
  desplazar el orden final

#### Scenario: Artista ya conocido con homónimos
- **WHEN** una persona busca `kiss` en Artistas, Kiss existe localmente y MusicBrainz conoce otros
  artistas llamados Kiss
- **THEN** Kiss se ve sin esperar a MusicBrainz y, al llegar su respuesta, la lista final incluye
  los homónimos sin redirigir

#### Scenario: Artista exacto único
- **WHEN** una persona busca `the cure` en Artistas desde el Header y MusicBrainz confirma que es
  la única coincidencia exacta
- **THEN** la página muestra primero lo local y, al llegar la respuesta de MusicBrainz, redirige al
  perfil de The Cure, tanto en la navegación desde el Header como abriendo la URL directamente

#### Scenario: Artistas sin nombre en la búsqueda avanzada
- **WHEN** una persona busca grupos de Chile de 1980 a 1989 en `/search/advanced`
- **THEN** las coincidencias locales se ven sin esperar a MusicBrainz y la lista final con
  "Cargar más" llega después

## ADDED Requirements

### Requirement: Encabezado compacto con resultados

Con una consulta, `/search` SHALL dejar el título "Buscar" y la etiqueta del campo solo para lectores de pantalla,
mostrar el campo y el botón en una sola fila también en móvil y el resumen como "Resultados para «texto»" con la cifra.
La cifra SHALL ser exacta hasta 1.000 y "más de 1.000" por encima (el total de MusicBrainz no es lo que se recorre). La sugerencia para acotar una consulta genérica SHALL usar la
misma cifra ("Más de 1.000 álbumes coinciden…").
En móvil, las pastillas de categoría y década de Álbumes SHALL plegarse tras un botón **Filtros** que indica cuántos hay
activos; en escritorio se ven siempre. El primer resultado SHALL quedar en la primera pantalla de un móvil de 375 × 812.

#### Scenario: Álbumes en móvil
- **WHEN** una persona abre `/search?type=album&q=the wall` en 375 px
- **THEN** ve el campo en una fila, las pestañas, "Filtros", el resumen con "más de 1.000" y los primeros resultados
  sin desplazarse

#### Scenario: Filtro activo en móvil
- **WHEN** la búsqueda tiene la década 1970s
- **THEN** el botón dice "Filtros · 1" y al pulsarlo muestra las pastillas con 1970s marcada

### Requirement: Portada sin consulta

Sin consulta, `/search` SHALL mostrar bajo el campo: las búsquedas recientes del navegador como pastillas (cada una con
su tipo y un botón para quitarla); "Prueba con", hasta cuatro artistas y cuatro discos con más personas distintas que
los siguieron, valoraron o escucharon en público en los últimos 7 días (o 30 si la semana no alcanza), sin cifras y
sin contar escuchas privadas ni cuentas desactivadas, y solo si hay al menos dos; y un consejo sobre «Artista - Título». Cada disco
sugerido SHALL mostrar su artista y su año.

#### Scenario: Plataforma con actividad
- **WHEN** una persona abre `/search` y esta semana varias personas valoraron *BRAT*
- **THEN** "Prueba con" muestra *BRAT* de Charli xcx entre sus sugerencias, sin cifras

#### Scenario: Sin actividad
- **WHEN** nadie siguió, valoró ni escuchó nada en 30 días
- **THEN** la portada muestra recientes (si hay) y el consejo, sin "Prueba con"

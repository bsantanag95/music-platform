## Decisions

### D1. Criterios como datos puros, etiquetas en el servidor

`criterionChips(type, query, criteria)` lista los criterios activos en el orden del formulario (nombre, tipo, cada país,
ciudad, inicio, estado; artista, años, cada tipo de lanzamiento, álbum, duración) y `removeCriterion` devuelve la
búsqueda sin uno. Un rango es una sola pastilla; los campos múltiples, una por valor; quitar un texto quita también su
coincidencia exacta. Viven en `filters.ts` (sin dependencias de servidor) y se prueban sin React. La página arma las
etiquetas traducidas y los enlaces; el componente cliente solo abre y cierra el formulario.

### D2. Formulario recogido sin desmontarlo

`AdvancedSearchDisclosure` (cliente) recibe la barra y el formulario. Con búsqueda en curso empieza recogido y el
formulario queda en el DOM con `hidden` (conserva lo escrito si se vuelve a abrir); sin búsqueda, abierto y sin barra.
Comparte la `key` del formulario: una búsqueda nueva lo vuelve a recoger. "Editar búsqueda" y las sugerencias de la
búsqueda amplia abren el formulario con un evento de ventana (`advanced-search:edit`, con el campo a enfocar), como el
filtro de la discografía: el aviso vive dentro de los resultados, que son del servidor.

### D3. Cifras de las alternativas por streaming

Sin coincidencias y con 2 a 4 criterios, cada alternativa se busca con el mismo servicio (en paralelo; la cola de
MusicBrainz las serializa). Los enlaces se ven de inmediato y la cifra llega en un `Suspense`; si una consulta falla,
su enlace queda sin cifra. Con 1 criterio no hay alternativa que contar: se ofrece Limpiar. Con más de 4, enlaces sin
cifra.

### D4. Encabezado: una cifra

En la avanzada el encabezado muestra el total con separador de miles y el sustantivo del tipo (grupos o personas según
el filtro; álbumes; canciones), sin el tope de `/search`: con criterios la cifra sí describe lo pedido. El `h2`
"Resultados" queda solo para lectores de pantalla.

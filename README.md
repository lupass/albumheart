# Heartopia — Memory Garden

Una galería responsive con estética de álbum editorial / scrapbook: composición asimétrica, tarjetas inclinadas, filtros, búsqueda, vista ampliada, modo twilight y carga por botón o arrastrando imágenes.

## Archivos
- `index.html`: estructura de la página.
- `styles.css`: diseño, animaciones y adaptación a móvil/tablet/PC.
- `app.js`: galería, filtros, lightbox, carga local y punto de conexión a Google Drive.

## Imágenes y recursos
La demo no necesita imágenes externas: usa ilustraciones SVG generadas desde `app.js` como contenido provisional. Así puedes abrirla inmediatamente.

Cuando tengas capturas reales de Heartopia:
1. Pulsa **Añadir fotografías** y selecciónalas, o arrástralas al recuadro bajo la galería.
2. La previsualización local dura mientras la página siga abierta. No guarda los archivos en Drive.
3. Para usarlas permanentemente, colócalas en una carpeta de Drive y conecta un feed JSON (ver abajo).

Si quieres añadir un fondo panorámico propio más adelante, guárdalo en la raíz como `background.png` (ideal: 2400 × 1200 px, horizontal). Esta versión no depende de ese archivo; el diseño ya tiene un fondo atmosférico CSS.

## Abrir la página
Abre `index.html` en un navegador. Para probar la carga de datos externos o evitar restricciones del navegador, es mejor servir la carpeta con un servidor local sencillo (por ejemplo, Live Server en VS Code).

## Conectar Google Drive
El frontend está preparado para consultar una URL que devuelva JSON. En `app.js`, sustituye:

```js
const DRIVE_FEED_URL = "";
```

por la URL de despliegue de un Google Apps Script.

El JSON esperado es:

```json
[
  {
    "name": "Atardecer en el lago",
    "url": "https://URL_PUBLICA_DE_LA_IMAGEN",
    "category": "places",
    "date": "2026.11",
    "alt": "Atardecer en el lago"
  }
]
```

Categorías admitidas: `places`, `moments`, `friends`.

**Importante sobre privacidad y permisos:** una web pública no puede mostrar imágenes privadas de tu Drive solo por conocer el ID de la carpeta. Para una galería pública, las imágenes (o URLs servidas por un backend autorizado) deben ser accesibles por los visitantes. No publiques una carpeta privada ni credenciales/API keys en el JavaScript del navegador. Si la galería debe ser privada, hay que añadir autenticación y servir las imágenes desde un backend con permisos.

Este paquete deja listo el diseño y el punto de conexión del frontend; todavía no incluye el Apps Script ni una subida automática a Drive.


## Actualización visual: cielo dinámico y tarjetas redondeadas
- Las tarjetas de fotografías ahora tienen esquinas más suaves y redondeadas.
- El fondo cambia según la hora local del dispositivo: de 07:00 a 18:59 muestra un cielo pastel de día; de 19:00 a 06:59 muestra un cielo de atardecer/nocturno con nubes difuminadas y pequeñas partículas luminosas animadas.
- El botón superior permite cambiar manualmente entre día y noche. Al recargar, vuelve a detectar la hora del dispositivo.
- No necesitas `background.png` para este efecto: está construido con CSS y partículas ligeras generadas por JavaScript.

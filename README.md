# Unirack Studio

Aplicación web en español para estimar materiales de camas fotovoltaicas, editar su distribución y verlas en 3D. Primera versión funcional, con tabla del usuario como referencia; **los manuales oficiales Unirac Ascender aún no se han validado**.

## Descarga suspendida por alerta de antivirus

El usuario reportó una alerta de troyano sobre la primera versión empaquetada. Se retiró el ZIP de la versión actual del repositorio mientras se investiga. **No abras el archivo descargado, no permitas su ejecución y no desactives el antivirus.** Usa la cuarentena o eliminación ofrecida por tu antivirus.

La captura del usuario identifica la detección de Microsoft Defender como `Trojan:Script/Ulthar.A!ml`, de gravedad alta y estado activo. Todavía no se ha establecido si corresponde a código malicioso o a un falso positivo. No se declara ausencia absoluta de malware en el código fuente ni sus dependencias; consulta más abajo el resultado acotado de Defender para la versión web.

Consulta el [registro de investigación](docs/seguridad.md).

El ZIP retirado tiene SHA-256 `aee820f7fa85dbe99a1f331bc972e890a93a174e0cb52f0edc8b8b514dfb948b`. El archivo puede seguir presente en versiones anteriores del historial; no lo descargues desde ellas.

## Versión web

La compilación de la rama [`gh-pages`](https://github.com/gdzib1997/Calculo-de-material/tree/gh-pages) fue analizada con Microsoft Defender en Windows. La ejecución terminó sin detecciones para esa muestra y esas firmas. [Informe del análisis](https://raw.githubusercontent.com/gdzib1997/Calculo-de-material/gh-pages/defender-review.json) · [Historial de análisis en Windows](https://github.com/gdzib1997/Calculo-de-material/actions/workflows/review-web.yml).

El sitio ya está activo en **[Unirack Studio](https://gdzib1997.github.io/Calculo-de-material/)**. Si se necesita reinstalar Pages, en [Settings → Pages](https://github.com/gdzib1997/Calculo-de-material/settings/pages) la fuente es **Deploy from a branch**, rama **gh-pages**, carpeta **/(root)**. Las actualizaciones pasan por compilación, pruebas y Defender antes de preparar la rama del sitio, sin forzar su historial ni borrar archivos ajenos al build.

El informe no garantiza que todos los antivirus den el mismo resultado y no resuelve por sí solo la detección original. La descarga ZIP original sigue retirada. Esta versión web conserva los límites de cálculo e ingeniería documentados.

## Ejecutar el código fuente

Requiere Node.js 22.12 o superior (probado con 24.19) y npm.

```sh
cd /workspace/Calculo-de-material
npm ci --cache /workspace/.npm-cache
npm run dev
```

```sh
npm test
npm run build
npx playwright test
```

Si reinstalas dependencias con Vite abierto, reinicia tu servidor antes de validar: su caché en memoria puede conservar referencias a módulos eliminados y devolver HTTP 504 hasta el reinicio.

Las pruebas de navegador utilizan Chromium de `/usr/bin/chromium`; se puede cambiar con `CHROMIUM_PATH`. Vite se inicia automáticamente si no está corriendo. Los componentes 3D requieren WebGL. Los tipos de letra se sirven localmente. No hay servicios externos, API keys ni base de datos necesarios para operar la aplicación.

## Uso de la versión 0.5

- En **Biblioteca**, guarda modelos de paneles y selecciona sus medidas. Valores iniciales del usuario: panel **2.38 × 1.14 m**, riel **4.70 m**, separación **20 mm** y sobrante lateral editable **50 mm**.
- **Girar paneles** permite seleccionar una pieza y girarla de 0 a 359°. Cada fila mantiene su propia separación: una fila superior horizontal no abre huecos ni cambia las patas o rieles de la inferior vertical. Se conserva el borde oeste y el frente de referencia de la cama.
- **Acomodar camas** muestra todas las camas del proyecto sobre el mismo techo. Puedes mover cada una con coordenadas, girarla en planta o arrastrarla con **Mover camas**. Agregar o duplicar coloca la nueva cama junto a las existentes.
- **Navegar** gira la cámara; la rueda acerca o aleja. **Desplazar vista** usa el arrastre para recorrer el techo. El botón derecho también desplaza y **Encuadrar proyecto** reúne las camas en pantalla.
- En **Patas y bases**, selecciona la pata y su **Riel de desplazamiento**. Sólo puede moverse sobre ese eje: X para E–O, Y para N–S. El otro campo queda fijo. Puedes arrastrarla o introducir su posición/separación a lo largo del riel. La longitud y el bloque siguen la posición de la pata.
- **Contravientos** se coloca eligiendo dos patas alineadas desde los selectores o con dos clics en 3D. No se crean diagonales automáticas. Puedes invertir o eliminar cada unión. Las uniones a patas ausentes/desalineadas se conservan en el proyecto, pero no se dibujan ni se cuentan hasta corregirlas.
- **Mostrar sólo estructura** oculta los paneles para ver los rieles E–O y N–S, patas, bases y herrajes; también se puede guardar esa vista en el PDF. No cambia las cantidades.
- **Mostrar herrajes** presenta L-Foot, Tilt Plate, tornillos, abrazaderas y Beam Clip de la cama seleccionada. Cada pata tiene L-Foot abajo y Tilt Plate arriba, según la configuración confirmada por el usuario. **Mostrar medidas** presenta las longitudes de las patas. Las cotas se dibujan dentro del canvas y se incluyen al guardar vistas para PDF.
- **Techo** admite foto JPEG, PNG o WebP hasta 10 MB; se redimensiona y se vuelve a codificar. Se guarda sólo en el navegador/proyecto. Puedes ajustar ancho, largo, posición, giro y opacidad.
- **Escalar con medidas de referencia** abre la foto. Marca dos puntos, introduce su distancia real y aplica. Una referencia conserva la proporción de la foto; dos referencias distintas (preferentemente una horizontal y otra vertical) calculan el ancho y largo por separado. Hay botones para usar el ancho o largo de un panel como distancia conocida. Las referencias quedan en el JSON y en el informe del techo. No se corrige perspectiva de fotos oblicuas.
- **Materiales** reúne los rieles en una sola partida y conserva cantidades finales editables. Los orígenes automáticos/manuales y el botón de restablecer permiten distinguirlos. No hay precios ni apartados de reglas en la interfaz o en los reportes.
- **PDF** usa un formato limpio: proyecto, cliente, ubicación, logo de Soleon y lista de materiales (sin el perfil vertical). Usa **Guardar vista para PDF** después de acomodar la cámara para capturar hasta ocho vistas durante la sesión. Al exportar, elige las vistas y carga el logo original JPEG/PNG/WebP; se guarda con la ubicación en el proyecto. Sin imagen de logo, se utiliza el texto SOLEON en naranja. No se incluyen tablas técnicas ni anexos.
- **Word y Excel** conservan el detalle de camas, materiales, patas, rieles, contravientos, giros y ubicación; Excel también presenta perfiles y biblioteca, y el techo con su imagen si existe.
- **Guardar proyecto** descarga JSON; **Abrir** lo recupera. Los proyectos anteriores se admiten, conservando cantidades manuales y normalizando las ubicaciones/uniones que antes no existían. Guarda copias descargadas: localStorage no sincroniza equipos ni sustituye un respaldo.

## Algoritmo y alcance

Consulta [docs/calculo.md](docs/calculo.md). La tabla original se conserva como referencia histórica en `src/lib/model.ts`. La versión actual calcula perfiles, uniones y herrajes a partir de la geometría y las reglas confirmadas por el usuario. No se afirma certificación, compatibilidad de componentes ni cumplimiento de manuales Ascender. Antes de usar cantidades para compra o construcción hay que confirmar el sistema exacto, la longitud a la que corresponde la tabla, sus componentes, las condiciones del sitio y la ingeniería estructural.

El repositorio conserva el código fuente, la investigación y una rama web analizada con Defender. La descarga empaquetada sigue suspendida. GitHub Pages está activo; no se ha publicado un entorno cloud nuevo.

## Cambios BETA 04

- Tipo de cama elegido: sencilla = una fila, doble = dos; múltiples = tres o más. La selección explícita de rieles E–O y N–S es independiente de las filas; no hay modo automático visible.
- Ambos sentidos de riel se dibujan y se suman en Riel (total). Beam Clip sólo cuenta los cruces reales entre sentidos habilitados.
- Las abrazaderas de paneles verticales se montan en E–O; las de horizontales (incluido el giro individual) en N–S. La vista 3D y el cálculo comparten los puntos de sujeción.
- En Patas y bases puedes elegir una cuadrícula E–O × N–S para toda la cama, quitar patas, reponerlas y añadir patas sobre cualquier riel habilitado. Las nuevas patas también se pueden mover a lo largo del riel. Se incluyen en las bases, longitudes y herrajes. Los rieles adicionales de apoyo de la cuadrícula se cuentan y se dibujan.
- El perfil vertical se conserva en el despiece de patas, pero se elimina de las listas de materiales y de sus exportaciones.

## Cambios BETA 05

En **Rieles** puedes seleccionar cualquier E–O o N–S desde el 3D o desde la lista, eliminarlo, reponerlo y editar sus extremos y posición transversal. **Añadir riel** crea un perfil manual en el sentido elegido, con nombre y medidas propias. El sentido debe estar habilitado en Estructura. La opción de sujetar paneles cuenta los clamps que realmente coincidan con paneles de orientación compatible. Los rieles manuales no generan patas por sí solos: añádelas desde Patas y bases.

Eliminar un riel suspende sus cortes, cruces, clamps y las patas que dependan de él, junto con los contravientos de esas patas. Reponerlo recupera esos datos. Una pata movida explícitamente a otro riel conserva su relación con ese destino; no regresa automáticamente al riel anterior si desaparece el nuevo. Los cambios quedan en el guardado local y en el JSON. Los materiales y exportaciones usan sólo elementos activos, respetando las cantidades finales que hayas fijado manualmente.

**Patas y bases** permite añadir o quitar patas individuales. **Contravientos** permite añadir diagonales entre patas alineadas y eliminarlas con la papelera. **Encuadrar proyecto** también incluye los rieles manuales que queden fuera de la huella original.

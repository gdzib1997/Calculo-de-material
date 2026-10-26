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

## Uso

- Configura filas (1–6), columnas (1–10), orientación, dimensiones, separación e inclinación de cada cama.
- En **Biblioteca**, guarda, edita o elimina modelos de panel. Al seleccionarlos se aplican las medidas. Editar un modelo actualiza las camas vinculadas. Cambiar dimensiones directamente desvincula la cama del modelo.
- Valores iniciales indicados por el usuario: panel **2.38 × 1.14 m**, riel **4.70 m**, separación entre paneles **20 mm**, sobrante lateral para end clamp **50 mm**, editable.
- Arrastra el modelo para girarlo, usa la rueda para acercarte y haz clic en un panel para quitarlo o reponerlo. También puedes editar desde la pestaña **Paneles**. La órbita admite vistas inferiores, laterales, superiores y frontales.
- **Estructura** permite modificar las separaciones E–O y N–S, alturas, sobrantes y bloques. La separación N–S es horizontal entre las dos líneas de patas de cada fila; se limita si no cabe en su fondo.
- En **Patas y bases**, selecciona una pata para editar X/Z o su separación con la anterior y con la opuesta. Con **Mover patas** también puedes arrastrarla en 3D. Sólo cambia esa pata y su bloque; la altura se recalcula. Puedes restablecerla o restablecer todas.
- Con **Girar paneles**, selecciona un panel del modelo o la cuadrícula y gíralo 90° o introduce un ángulo de 0–359°. Las celdas se amplían para evitar solapamientos. El giro es dentro del plano, conservando la inclinación de la cama.
- En **Techo**, carga JPEG, PNG o WebP (hasta 10 MB). La foto se redimensiona y se vuelve a codificar, se guarda localmente con el proyecto y aparece como suelo. Ajusta escala real, posición, giro y opacidad. No detecta obstáculos, pendientes ni dimensiones de la foto automáticamente.
- **Mostrar medidas** también presenta las longitudes individuales de las patas.
- Los materiales presentan **un solo renglón de rieles**, sumando estructura E–O, N–S habilitados y contravientos. En **Estructura**, N–S puede quedar automático, incluirse incluso en una cama sencilla o excluirse. Los Beam Clip automáticos sólo se cuentan para los cruces N–S/E–O; el factor por cruce es editable.
- Puedes contemplar contravientos en E–O o N–S con cantidad de diagonales y longitud geométrica o manual. Se suman piezas comerciales por diagonal redondeadas hacia arriba, sin descontar sobrantes entre diagonales. Su representación no dimensiona las conexiones.
- **Patas y bases** muestra longitudes verticales y posiciones. Las alturas frontal y trasera se refieren a los bordes del plano; las patas interiores tienen sus propias alturas.
- Edita cantidades en **Materiales**. Una cantidad manual queda fija hasta restablecerla. Las opciones de N–S se aplican al cálculo automático; una cantidad total de riel fijada manualmente permanece fija hasta restablecerla. Los ajustes antiguos de riel E–O/N–S se conservan sumados en el total; el precio agrupado reutiliza primero el antiguo precio E–O, o N–S si no existe.
- Agrega o duplica camas y consulta los materiales de cada una o del proyecto completo. Los precios son comunes a todo el proyecto y se muestran en MXN, sin impuestos, flete ni mano de obra. Un precio vacío se considera cero.
- **Exportar** genera PDF, Word (.docx) y Excel (.xlsx) de todo el proyecto. PDF y Word incluyen la vista 3D actual si está disponible. Excel incluye materiales agrupados, configuración de cálculo por cama, patas y bloques con posiciones manuales, paneles con giros, biblioteca y supuestos; si hay foto, también incluye una hoja Techo con la imagen.
- **Guardar proyecto** descarga JSON con camas, biblioteca, precios, imagen de techo, giros y posiciones individuales. **Abrir** recupera esa copia. El autoguardado conserva el proyecto en este navegador mediante localStorage; no sincroniza entre equipos ni sustituye una copia descargada.

## Algoritmo y alcance

Consulta [docs/calculo.md](docs/calculo.md). La tabla transcrita vive en `src/lib/model.ts` y se verifica mediante pruebas. No se afirma certificación, compatibilidad de componentes ni cumplimiento de manuales Ascender. Antes de usar cantidades para compra o construcción hay que confirmar el sistema exacto, la longitud a la que corresponde la tabla, sus componentes, las condiciones del sitio y la ingeniería estructural.

El repositorio conserva el código fuente, la investigación y una rama web analizada con Defender. La descarga empaquetada sigue suspendida. GitHub Pages está activo; no se ha publicado un entorno cloud nuevo.

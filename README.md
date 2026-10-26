# Unirack Studio

Aplicación web en español para estimar materiales de camas fotovoltaicas, editar su distribución y verlas en 3D. Primera versión funcional, con tabla del usuario como referencia; **los manuales oficiales Unirac Ascender aún no se han validado**.

## Descarga suspendida por alerta de antivirus

El usuario reportó una alerta de troyano sobre la primera versión empaquetada. Se retiró el ZIP de la versión actual del repositorio mientras se investiga. **No abras el archivo descargado, no permitas su ejecución y no desactives el antivirus.** Usa la cuarentena o eliminación ofrecida por tu antivirus.

La detección todavía no ha sido identificada ni se ha establecido si corresponde a código malicioso o a un falso positivo. No se ha certificado el código fuente ni sus dependencias como alternativa segura al archivo señalado.

El ZIP retirado tiene SHA-256 `aee820f7fa85dbe99a1f331bc972e890a93a174e0cb52f0edc8b8b514dfb948b`. El archivo puede seguir presente en versiones anteriores del historial; no lo descargues desde ellas.

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
- **Estructura** permite modificar rieles, apoyos, alturas, sobrantes y bloques sólidos de concreto.
- **Patas y bases** muestra longitudes verticales y posiciones. Las alturas frontal y trasera se refieren a los bordes del plano; las patas interiores tienen sus propias alturas.
- Edita cantidades en **Materiales**. Una cantidad manual queda fija hasta restablecerla. El riel norte–sur siempre queda en cero en tramos sencillos, incluso si había un ajuste previo.
- Agrega o duplica camas y consulta los materiales de cada una o del proyecto completo. Los precios son comunes a todo el proyecto y se muestran en MXN, sin impuestos, flete ni mano de obra. Un precio vacío se considera cero.
- **Exportar** genera PDF, Word (.docx) y Excel (.xlsx) de todo el proyecto. PDF y Word incluyen la vista 3D actual si está disponible. Excel incluye materiales, camas, detalle por cama, patas y bloques, biblioteca y supuestos.
- **Guardar proyecto** descarga JSON con camas, biblioteca, precios y ajustes. **Abrir** recupera esa copia. El autoguardado conserva el proyecto en este navegador mediante localStorage; no sincroniza entre equipos ni sustituye una copia descargada.

## Algoritmo y alcance

Consulta [docs/calculo.md](docs/calculo.md). La tabla transcrita vive en `src/lib/model.ts` y se verifica mediante pruebas. No se afirma certificación, compatibilidad de componentes ni cumplimiento de manuales Ascender. Antes de usar cantidades para compra o construcción hay que confirmar el sistema exacto, la longitud a la que corresponde la tabla, sus componentes, las condiciones del sitio y la ingeniería estructural.

El repositorio conserva el código fuente para revisión. La descarga empaquetada está suspendida por una alerta de antivirus; no se ha desplegado un sitio web público ni publicado un entorno nuevo.

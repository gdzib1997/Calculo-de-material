# Descarga suspendida: investigación de antivirus

## Aviso comunicado por el usuario

El 26 de octubre de 2026 el usuario mostró una captura de Microsoft Defender con `Trojan:Script/Ulthar.A!ml`, gravedad **grave**, estado **activo**. La captura muestra las 11:31 a. m.; el usuario indica que el aviso apareció durante la descarga. El usuario confirmó después que Defender lo bloqueó durante la descarga, que no llegó a abrir el HTML y que Defender lo eliminó. Sigue pendiente el detalle exacto de los elementos afectados.

No se considera demostrada la presencia de malware ni se declara un falso positivo. Una prueba funcional de navegador, una auditoría de dependencias o una firma de paquete no sustituyen un análisis antivirus.

## Contención

- Se retiró `descargas/Unirack-Studio.zip` de la versión actual de `main` y se eliminó el enlace de descarga del README.
- Se verificó que la URL original del ZIP en `main` devuelve HTTP 404.
- El archivo aún puede existir en el historial de Git o en copias locales. No se ha reescrito el historial. No debe descargarse ni restaurarse desde versiones anteriores.
- No se ofrecerá otro paquete como sustituto hasta resolver la investigación. El código fuente tampoco se declara certificado como seguro.
- Se recomendó al usuario seguir las acciones de cuarentena o eliminación de Defender, sin permitir ni restaurar el archivo, actualizar la protección y ejecutar un examen completo.

## Identificación de la muestra

ZIP: `Unirack-Studio.zip`.

SHA-256: `aee820f7fa85dbe99a1f331bc972e890a93a174e0cb52f0edc8b8b514dfb948b`.

El ZIP contenía únicamente `Unirack-Studio.html` (3 935 884 bytes) y `LEEME.txt` (857 bytes). La comprobación CRC no encontró daños de archivo; **esto no determina si el contenido es seguro**. El HTML es una compilación que incrusta la aplicación y sus librerías JavaScript. No se ha vuelto a ejecutar la muestra señalada durante esta revisión.

## Comprobaciones y límites

- Los paquetes registrados en el lockfile proceden de `registry.npmjs.org`. Esto no demuestra que no tengan vulnerabilidades o código malicioso.
- La primera auditoría npm encontró cinco avisos: dos clasificados como críticos en las herramientas de pruebas y tres moderados, incluidos avisos transitivos. Son avisos de vulnerabilidad; no se han identificado como causa de la detección de Defender.
- `npm audit signatures` no pudo completarse: la descarga de metadatos de confianza TUF respondió HTTP 403. No se desactivó la verificación ni se presenta como superada.
- Este entorno no tiene Microsoft Defender ni un escáner antivirus instalado. No se ha realizado aquí un análisis con el motor que produjo la alerta.
- No se subió la muestra a servicios externos de análisis.

## Corrección independiente de dependencias

Se actualizó Vitest de la rama 3.x a 4.1.12 para resolver los avisos de la herramienta de pruebas y sus componentes. Esta herramienta no formaba parte del HTML distribuido, por lo que la actualización **no explica ni resuelve por sí sola la detección del archivo descargado**.

La auditoría posterior devuelve dos avisos moderados (`uuid` y su dependiente `exceljs`), sin avisos altos ni críticos según la base consultada. Se conservan como pendientes de revisión. Un resultado de auditoría npm no es un resultado de antivirus; la descarga continúa suspendida.

## Información pendiente

Confirmar en el historial de protección el nombre del elemento afectado, si el usuario llegó a abrir el HTML y el resultado de las acciones de Defender. La atribución de la detección requiere análisis del motor de Defender o del fabricante; no se intentará evitarla cambiando el nombre, el empaquetado o las exclusiones del antivirus.

## Comprobación con Microsoft Defender en Windows

Se preparó `.github/workflows/defender-review.yml`, ejecutable en GitHub Actions con Windows 2022. El script recupera la muestra exacta del historial, comprueba su SHA-256, extrae únicamente los nombres esperados y analiza tanto ZIP como HTML con Defender, sin ejecutarlos. Actualiza las firmas y exige que el servicio esté activo. Cualquier hallazgo o error bloquea el análisis; no hay publicación ni despliegue automático, incluso si el análisis finaliza sin detecciones.

Este flujo necesita que GitHub acepte y ejecute el workflow y que el runner tenga Defender operativo. **Preparar o subir el flujo no significa que el análisis haya pasado.** El resultado debe verificarse en Actions y conservar su motor, versión de firmas, huella y fecha.

## Resultado inicial y preparación de versión web

La ejecución [40371486311](https://github.com/gdzib1997/Calculo-de-material/actions/runs/40371486311) terminó con estado **Success**. El flujo exige Defender activo, actualización de firmas, código cero y conservación de todos los archivos analizados. Se limita a esa ejecución; **no confirma que la alerta del equipo del usuario fuera un falso positivo**.

Se añadió un flujo separado `review-web.yml` para instalar con lockfile y sin scripts de instalación, ejecutar pruebas, compilar el sitio convencional con recursos separados y analizar también esos archivos en Windows. Sólo después de completar el escaneo permite preparar una rama nueva `gh-pages`, sin sobrescribir referencias existentes, incluyendo un informe JSON de Defender y verificando que los archivos publicados coincidan con sus huellas analizadas. La descarga original permanece retirada.

Subir el flujo no significa que haya pasado ni que GitHub Pages esté activo. La rama, el informe y el estado de ejecución deben verificarse antes de ofrecer la versión web. Los avisos moderados de dependencias siguen documentados; un escaneo no es una garantía absoluta de seguridad.

# Reglas y fuentes del cálculo

## Origen

Fuente disponible: imagen de la hoja de cálculo entregada por el usuario en esta conversación. Se transcriben nueve columnas de cama sencilla (1×2–1×10) y nueve de cama doble (2×2–2×10): Rail, Splice, Mid Clamp, End Clamp, Beam Clip, Tilt Plate, L-Foot, T-Bolt y Tierras.

No hay un manual oficial incluido en el repositorio. El intento de acceder a `https://unirac.com/ascender/` recibió `Tunnel connection failed: 403 Forbidden` de la red. Se guardaron `unirac.com` y `www.unirac.com` como dominios adicionales en el borrador del entorno, sin afirmar que ese guardado los haya habilitado en la máquina. La referencia Ascender debe completarse con documentos oficiales accesibles y su revisión/versión.

## Cantidades de referencia

Para una cama rectangular completa de una o dos filas y entre dos y diez columnas, las piezas coinciden con la tabla cuando la longitud comercial y la longitud de referencia son iguales. `Rail` se interpreta provisionalmente como riel principal este–oeste: **la imagen no confirma si esa cuenta incluye otros perfiles**, por lo que esa interpretación debe revisarse con el autor y el manual.

Al cambiar la longitud comercial: `rieles E–O = ceil(cantidad de tabla × longitud de referencia / longitud comercial)`. La longitud de referencia de 4.70 m se adopta a partir del riel usado por el usuario, pero sigue siendo una suposición sobre la tabla. No se optimizan cortes ni se garantiza que todos los sobrantes sean aprovechables.

Para geometrías irregulares se recorren celdas activas y se agrupan tramos contiguos de una o dos filas, sin solapar ni omitir paneles. Se suman sus cantidades. Un panel aislado, ausente en la tabla original, tiene una estimación explícita en `referenceQuantity`. La separación en tramos puede aumentar herrajes; no se considera una unión estructural validada.

## Norte–sur

Regla del usuario: todo tramo de una fila tiene cero riel norte–sur. Para tramos dobles, se estima el número de líneas como `ceil(ancho / separación máxima de apoyos) + 1`; cada línea utiliza `ceil(longitud inclinada / longitud comercial)` piezas. Es una regla geométrica provisional, no una regla atribuida a Unirac. Las cantidades E–O y N–S se muestran separadas para su revisión.

## Geometría, patas y concreto

- Ancho de cama: columnas × ancho orientado del panel + separaciones entre columnas.
- Largo inclinado: filas × largo orientado del panel + separaciones entre filas.
- Fondo horizontal: largo inclinado × cos(ángulo).
- Altura de cada pata: altura frontal + distancia sobre el plano × sin(ángulo).
- Cada tramo continuo de paneles en una fila tiene dos líneas de apoyo, al 20% y 80% del largo de panel. Los apoyos laterales se distribuyen con un retranqueo máximo de 0.20 m y una separación no mayor a la seleccionada. Estos porcentajes y el retranqueo son supuestos de representación, **no posiciones aprobadas de fijación de un módulo**.
- Un perfil vertical por pata dibujada, sin descuentos por herrajes. No se define sección, resistencia ni tipo de conexión del perfil.
- Si las bases están activadas: un bloque sólido por pata y volumen geométrico ancho × fondo × alto × número de bloques. No se calcula masa necesaria, lastre, deslizamiento o vuelco.
- El sobrante para end clamp se agrega a ambos extremos de los rieles E–O dibujados. No incrementa automáticamente la cuenta de la tabla.
- Cambiar orientación, dimensiones o inclinación actualiza el modelo, las patas y los apoyos. Las cantidades de herrajes de la tabla se conservan para cada configuración de filas/columnas; no hay un dimensionamiento resistente asociado a esos cambios.

## Ajustes manuales

Las cantidades manuales sustituyen a las automáticas y permanecen fijas al quitar paneles hasta restablecerlas. Excepción: los rieles norte–sur de tramos exclusivamente sencillos se fuerzan a cero. Los informes identifican cantidades manuales y exportan los supuestos.

## Validación pendiente

Revisar contra los manuales oficiales Ascender: sistema/modelo exacto y disponibilidad regional; significado de Rail en la tabla; longitudes de referencia; piezas y códigos; posiciones de sujeción aprobadas por el fabricante de módulos; separaciones admisibles; inclinaciones; alturas de patas y descuentos; reglas para huecos y camas múltiples; puesta a tierra; empalmes y aprovechamiento de cortes; cargas, secciones, conexiones, lastre y anclajes.

La validación funcional de software no sustituye esta revisión técnica.
